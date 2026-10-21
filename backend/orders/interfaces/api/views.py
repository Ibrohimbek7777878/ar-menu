"""
REST API Views for Restaurant Operations.
Single-request handlers for Guest, Waiter, KDS, and Finance.
"""
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from orders.models import Order, OrderItem
from tables_restaurant.models import Table, ServiceCall, Hall, TableReservation
from tables_restaurant.privacy import find_reservation_by_code_or_phone, mask_name, mask_phone
from finance.models import FinanceTransaction, DebtRecord
from orders.application.services import RestaurantOrderService
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION, IsRestaurantManager, IsRestaurantStaff,
)
from web.restaurant_auth import is_restaurant_staff, remember_guest_order, staff_shop

logger = logging.getLogger(__name__)


class RestaurantAPIView(APIView):
    """
    Restoran API bazasi: xodim — Django sessiyasi (CSRF bilan) yoki JWT.
    Standart: faqat xodim. Mehmon endpoint'lari AllowAny ni aniq ko'rsatadi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [IsRestaurantStaff]

    def staff_shop(self):
        return staff_shop(self.request)


class RestaurantOrderCreateView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/orders/
    Bitta so'rov: Buyurtma qabul qilinadi, oshxonaga uzatiladi va stol band qilinadi.
    Mehmon uchun ochiq; narx va taomlar faqat serverdagi menyudan olinadi.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            shop = self.staff_shop() if is_restaurant_staff(request.user) else None
            order = RestaurantOrderService.create_order(request.data, shop=shop)
            remember_guest_order(request._request, order)
            return Response({
                'id': order.id,
                'order_number': order.order_number,
                'table_number': order.table.number if order.table else '',
                'customer_name': order.customer_name,
                'total_amount': float(order.total_amount),
                'final_amount': float(order.final_amount),
                'status': order.status,
                'created_at': order.created_at.isoformat(),
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Restoran buyurtmasini yaratishda xato")
            return Response({'error': "Buyurtmani qabul qilib bo'lmadi"}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantOrderListView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/orders/
    Barcha faol va bugungi restoran buyurtmalari (KDS, Waiter va Admin uchun).
    """
    def get(self, request):
        # Avval faqat is_pickup=True buyurtmalar chiqardi — mehmonning checkout buyurtmasi (is_pickup=False)
        # oshxonaga umuman ko'rinmasdi. Endi shu restoranning barcha bekor qilinmagan buyurtmalari.
        qs = (Order.objects.filter(shop=self.staff_shop())
              .exclude(status__in=['cancelled', 'failed'])
              .select_related('table').prefetch_related('items').order_by('-created_at')[:100])
        data = []
        for o in qs:
            items_list = [{
                'id': it.id,
                'name': it.product_name,
                'quantity': it.quantity,
                'price': float(it.price),
                'unit': it.unit,
                'course': it.course,
                'notes': it.notes,
                'done': it.is_done,
            } for it in o.items.all()]

            data.append({
                'id': o.id,
                'order_number': o.order_number,
                'table_number': o.table.number if o.table else '',
                'table_name': f"Stol {o.table.number}" if o.table else '',
                'customer_name': o.customer_name,
                'customer_phone': o.customer_phone_1,
                'status': o.status,
                'payment_status': o.payment_status,
                'created_at': o.created_at.isoformat(),
                'notes': o.notes,
                'total_amount': float(o.total_amount),
                'final_amount': float(o.final_amount),
                'items': items_list,
            })
        return Response(data)


class KitchenItemToggleView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/kitchen/items/<int:item_id>/toggle/
    Oshpaz bir taomni tayyor bo'lganini belgilaydi.
    """
    def post(self, request, item_id):
        try:
            it = OrderItem.objects.select_related('order').get(pk=item_id, order__shop=self.staff_shop())
            it.is_done = not it.is_done
            it.save(update_fields=['is_done'])

            # Agar taom tayyor bo'lsa, ofitsiantga signal yaratish (dish_ready)
            if it.is_done and it.order.table:
                ServiceCall.objects.create(
                    shop=it.order.shop,
                    table=it.order.table,
                    call_type='dish_ready',
                    title=f"Oshxonadan taom tayyor: {it.product_name} x{it.quantity}",
                    status='pending'
                )

            return Response({
                'id': it.id,
                'name': it.product_name,
                'is_done': it.is_done,
                'status': 'updated'
            })
        except OrderItem.DoesNotExist:
            return Response({'error': "Taom topilmadi"}, status=status.HTTP_404_NOT_FOUND)


class TableSettleBillView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/tables/<str:table_number>/settle/
    Bitta so'rov: Stol hisobi yopiladi va Moliya kassasiga avtomatik pul kirim qilinadi!
    """
    def post(self, request, table_number):
        payment_method = request.data.get('payment_method', 'cash')
        res = RestaurantOrderService.settle_table_bill(
            table_number, payment_method, shop=self.staff_shop(), actor=request.user,
        )
        if res.get('status') == 'not_found':
            return Response(res, status=status.HTTP_404_NOT_FOUND)
        return Response(res)


class RestaurantTablesStateView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/tables/
    Hamma stollarning joriy holati va jonli hisob summasi.
    """
    def get(self, request):
        tables = Table.objects.select_related('hall').filter(shop=self.staff_shop(), is_active=True).order_by('hall__order', 'id')
        data = []
        for t in tables:
            # Stolning ochiq hisobini hisoblash
            unpaid_orders = Order.objects.filter(table=t, payment_status='unpaid').exclude(status__in=['cancelled', 'failed'])
            bill_sum = sum((o.final_amount for o in unpaid_orders), 0)
            active_count = unpaid_orders.count()

            data.append({
                'id': t.id,
                'number': t.number,
                'hall': t.hall.name if t.hall else 'Asosiy Zal',
                'status': t.status,
                'capacity': t.capacity,
                'guests_count': 0,
                'total_bill': float(bill_sum),
                'active_orders_count': active_count,
            })
        return Response(data)


class ServiceCallActionView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/calls/ - Ro'yxat (xodim)
    POST /api/v1/restaurant/calls/ - Yangi chaqiruv yaratish (mehmon)
    PATCH /api/v1/restaurant/calls/<int:call_id>/ - Holatini o'zgartirish (xodim: accepted/done)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return super().get_permissions()

    def get(self, request):
        calls = ServiceCall.objects.select_related('table', 'table__hall').filter(
            shop=self.staff_shop()
        ).exclude(status='done').order_by('-created_at')[:30]
        data = [{
            'id': c.id,
            'table_number': c.table.number,
            'hall_name': c.table.hall.name if c.table.hall else 'Asosiy Zal',
            'type': c.call_type,
            'title': c.title,
            'time': timezone.localtime(c.created_at).strftime('%H:%M'),   # Toshkent vaqti (avval UTC: 5 soat farq)
            'status': c.status,
        } for c in calls]
        return Response(data)

    def post(self, request):
        table_num = str(request.data.get('table_number', ''))
        call_type = request.data.get('type', 'waiter')
        if call_type not in dict(ServiceCall.TYPE_CHOICES) or call_type == 'dish_ready':
            call_type = 'waiter'
        title = str(request.data.get('title') or 'Ofitsiant chaqiruvi')[:255]

        shop = RestaurantOrderService.get_or_default_shop()
        table_obj = Table.objects.filter(shop=shop, number=table_num, is_active=True).first()
        if not table_obj:
            # QR token (UUID) bilan ham qabul qilinadi: QR dan kirgan mehmonning brauzerida stol raqami o'rniga token turishi mumkin
            import uuid as _uuid
            try:
                table_obj = Table.objects.filter(shop=shop, qr_token=_uuid.UUID(table_num), is_active=True).first()
            except (ValueError, AttributeError):
                table_obj = None
        if not table_obj:
            return Response({'error': 'Stol topilmadi'}, status=404)

        # Spamdan himoya: shu stol va shu tur bo'yicha javobsiz chaqiruv bo'lsa — yangisi yaratilmaydi
        existing = ServiceCall.objects.filter(table=table_obj, call_type=call_type, status='pending').first()
        if existing:
            return Response({'id': existing.id, 'status': 'already_pending'}, status=200)

        call = ServiceCall.objects.create(
            shop=shop,
            table=table_obj,
            call_type=call_type,
            title=title,
            status='pending'
        )

        if call_type == 'bill':
            table_obj.status = 'bill'
            table_obj.save(update_fields=['status'])

        return Response({'id': call.id, 'status': 'created'}, status=201)

    def patch(self, request, call_id=None):
        call_id = call_id or request.data.get('call_id')
        new_status = request.data.get('status', 'done')
        if new_status not in dict(ServiceCall.STATUS_CHOICES):
            return Response({'error': "Noto'g'ri holat"}, status=400)
        call = ServiceCall.objects.filter(pk=call_id, shop=self.staff_shop()).first()
        if not call:
            return Response({'error': 'Chaqiruv topilmadi'}, status=404)
        call.status = new_status
        call.save(update_fields=['status'])
        return Response({'status': 'updated'})


class RestaurantFinanceSyncView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/finance/ - Kassa va Qarzlar (faqat restoran rahbariyati)
    """
    permission_classes = [IsRestaurantManager]

    def get(self, request):
        shop = self.staff_shop()
        txs = FinanceTransaction.objects.filter(shop=shop).select_related('category').order_by('-created_at')[:40]
        debts = DebtRecord.objects.filter(shop=shop).order_by('-created_at')[:30]

        tx_list = [{
            'id': t.id,
            'type': t.tx_type,
            'category': t.category.name if t.category else 'Umumiy',
            'amount': float(t.amount),
            'payment_method': t.payment_method,
            'source_type': 'receipt' if t.order_id else 'manual',
            'description': t.title,
            'created_at': t.created_at.isoformat(),
            'is_cancelled': t.is_cancelled,
            'cancellation_reason': t.cancel_reason,
            'cancelled_at': t.cancelled_at.isoformat() if t.cancelled_at else None,
        } for t in txs]

        debt_list = [{
            'id': d.id,
            'type': 'receivable' if d.debt_type == 'customer' else 'payable',
            'person_name': d.person_name,
            'phone': d.phone,
            'description': d.notes,
            'total_amount': float(d.amount),
            'paid_amount': float(d.paid_amount),
            'remaining_amount': float(d.remaining_amount),
            'status': 'settled' if d.status == 'settled' else ('partially_paid' if d.status == 'partial' else 'pending'),
            'created_at': d.created_at.isoformat(),
            'due_date': str(d.due_date) if d.due_date else None,
        } for d in debts]

        return Response({
            'transactions': tx_list,
            'debts': debt_list
        })


class TableAddItemView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/tables/<str:table_number>/add-item/
    Ofitsiant ochiq stolga yangi taom qo'shishi (Atomic).
    """
    def post(self, request, table_number):
        try:
            res = RestaurantOrderService.add_item_to_table(table_number, request.data, shop=self.staff_shop())
            return Response(res, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Stolga taom qo'shishda xato")
            return Response({'error': "Taomni qo'shib bo'lmadi"}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantReservationListView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/reservations/ - Ro'yxat (xodim)
    POST /api/v1/restaurant/reservations/ - Yangi bron yaratish (mehmon ham)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return super().get_permissions()

    def get(self, request):
        filters = {
            'date': request.GET.get('date'),
            'status': request.GET.get('status'),
            'q': request.GET.get('q'),
        }
        res_list = RestaurantOrderService.get_reservations(filters, shop=self.staff_shop())
        return Response({'status': 'success', 'reservations': res_list})

    def post(self, request):
        try:
            by_staff = is_restaurant_staff(request.user)
            created = RestaurantOrderService.create_reservation(
                request.data, shop=self.staff_shop() if by_staff else None, by_staff=by_staff,
            )
            return Response({'status': 'success', 'reservation': created}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantReservationStatusView(RestaurantAPIView):
    """
    PATCH /api/v1/restaurant/reservations/<int:reservation_id>/status/
    Holatni o'zgartirish (arrived, seated, confirmed, cancelled).
    """
    def patch(self, request, reservation_id):
        new_status = request.data.get('status', 'arrived')
        if new_status == 'arrived':
            new_status = 'seated'  # frontend 'arrived' yuboradi, modelda 'seated'
        if new_status not in dict(TableReservation.STATUS_CHOICES):
            return Response({'error': "Noto'g'ri holat"}, status=status.HTTP_400_BAD_REQUEST)
        res = RestaurantOrderService.update_reservation_status(reservation_id, new_status, shop=self.staff_shop())
        if res.get('error'):
            return Response(res, status=status.HTTP_404_NOT_FOUND)
        return Response(res)


class RestaurantReservationFindView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/reservations/find/?q=...
    Mehmon o'z bronini aniq kod (GS-XXXX) yoki to'liq telefon bo'yicha topadi.
    Avval qisman moslik (icontains) bilan begona bronlarning ismi va telefoni chiqardi.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.GET.get('q', '').strip()
        if not q:
            return Response({'error': "Qidiruv so'zi kiritilmadi"}, status=status.HTTP_400_BAD_REQUEST)
        shop = RestaurantOrderService.get_or_default_shop()
        res = find_reservation_by_code_or_phone(
            TableReservation.objects.filter(shop=shop, is_deleted=False).select_related('table', 'hall'), q
        )
        if not res:
            return Response({'status': 'not_found', 'reservation': None}, status=status.HTTP_404_NOT_FOUND)
        data = {
            'id': res.id,
            'code': res.code,
            'name': mask_name(res.customer_name),
            'customer_name': mask_name(res.customer_name),
            'phone': mask_phone(res.customer_phone),
            'customer_phone': mask_phone(res.customer_phone),
            'table_number': res.table_number,
            'hall': res.hall.name if res.hall else (res.table.hall.name if res.table and res.table.hall else 'Asosiy Zal'),
            'date': str(res.reservation_date),
            'time': res.reservation_time.strftime('%H:%M') if res.reservation_time else '',
            'reservation_time': res.reservation_time.strftime('%H:%M') if res.reservation_time else '',
            'guests_count': res.guests_count,
            'status': res.status,
        }
        return Response({'status': 'success', 'reservation': data, 'all_matches': [data]})


class RestaurantProduct3DScanView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/products/3d-scan/ (yangi taom yaratish)
    POST /api/v1/restaurant/products/<int:product_id>/3d-scan/ (mavjud taomga biriktirish)
    Faqat restoran rahbariyati (avval mehmon ham real mahsulot yarata olardi).
    """
    permission_classes = [IsRestaurantManager]

    def post(self, request, product_id=None):
        try:
            res = RestaurantOrderService.save_product_3d_scan(request.data, product_id=product_id, shop=self.staff_shop())
            if res.get('error'):
                return Response(res, status=status.HTTP_404_NOT_FOUND)
            return Response(res, status=status.HTTP_201_CREATED if not product_id else status.HTTP_200_OK)
        except Exception:
            logger.exception("3D skanerni saqlashda xato")
            return Response({'error': "3D ma'lumotni saqlab bo'lmadi"}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantMenuView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/menu/
    Dinamik Menyu va Katalog REST API (Pure SPA fallback). Mehmon uchun ochiq.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        data = RestaurantOrderService.get_restaurant_menu()
        return Response(data)
