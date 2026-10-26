"""
REST API Views for Restaurant Operations.
Single-request handlers for Guest, Waiter, KDS, and Finance.
"""
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import AllowAny, SAFE_METHODS
from rest_framework.throttling import ScopedRateThrottle
from django.conf import settings
from django.utils import timezone
from orders.models import Order, OrderItem
from tables_restaurant.models import Table, ServiceCall, Hall, TableReservation
from tables_restaurant.privacy import find_reservation_by_code_or_phone
from tables_restaurant.reservations import ReservationError, serialize as reservation_view, upcoming_reserved_table_ids
from finance.models import FinanceTransaction, DebtRecord
from orders.application.services import RestaurantOrderService
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION, IsRestaurantManager, IsRestaurantStaff, capability,
)
from web.restaurant_auth import (
    guest_session_table, has_capability, is_restaurant_staff, remember_guest_order, staff_shop,
)

logger = logging.getLogger(__name__)


class RestaurantAPIView(APIView):
    """
    Restoran API bazasi: xodim — Django sessiyasi (CSRF bilan) yoki JWT.
    Standart: faqat xodim. Mehmon endpoint'lari AllowAny ni aniq ko'rsatadi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [IsRestaurantStaff]
    throttle_scope = 'guest_write'

    def get_throttles(self):
        # Mehmon yozuvlari (buyurtma, chaqiruv, bron) suiiste'moldan cheklanadi; xodim ekranlari (5 soniyalik
        # yangilanish) va o'qish so'rovlari cheklanmaydi (TZ R1-5)
        if self.request.method in SAFE_METHODS or is_restaurant_staff(self.request.user):
            return []
        return [ScopedRateThrottle()]

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
            shop = self.staff_shop() if has_capability(request.user, 'pos') else None
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
    Barcha faol va oxirgi 24 soatdagi restoran buyurtmalari (KDS, Waiter va Admin uchun; TZ 0.4).
    Oshpaz mijoz telefonini ko'rmaydi (ruxsat matritsasi: web/restaurant_auth.py CAPABILITIES).
    """
    permission_classes = [capability('kds')]

    def get(self, request):
        from datetime import timedelta
        from django.core.paginator import Paginator
        from django.utils import timezone

        show_phone = has_capability(request.user, 'pos')
        shop = self.staff_shop()
        since = timezone.now() - timedelta(hours=24)

        status_param = request.GET.get('status')
        if status_param == 'all':
            qs = Order.objects.filter(shop=shop).exclude(status__in=['cancelled', 'failed'])
        elif status_param:
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            qs = Order.objects.filter(shop=shop, status__in=statuses)
        else:
            qs = Order.objects.filter(
                shop=shop,
                status__in=['pending', 'confirmed', 'preparing', 'ready'],
            )

        qs = qs.filter(created_at__gte=since).select_related('table').prefetch_related('items', 'history').order_by('-created_at')

        page_number = request.GET.get('page')
        page_size = 200
        try:
            raw_size = int(request.GET.get('page_size', 200))
            if 1 <= raw_size <= 200:
                page_size = raw_size
        except (ValueError, TypeError):
            page_size = 200

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page_number or 1)

        data = []
        for o in page_obj.object_list:
            ready_rows = [h.created_at for h in o.history.all() if h.status == 'ready']
            ready_at = max(ready_rows) if ready_rows else None
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
                'customer_phone': o.customer_phone_1 if show_phone else '',
                'status': o.status,
                'payment_status': o.payment_status,
                'created_at': o.created_at.isoformat(),
                'ready_at': ready_at.isoformat() if ready_at else None,   # KDS taymeri shu yerda to'xtaydi
                'notes': o.notes,
                'total_amount': float(o.total_amount),
                'final_amount': float(o.final_amount),
                'items': items_list,
            })
        response = Response(data)
        response['X-Total-Count'] = str(paginator.count)
        response['X-Total-Pages'] = str(paginator.num_pages)
        response['X-Page'] = str(page_obj.number)
        return response


class KitchenItemToggleView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/kitchen/items/<int:item_id>/toggle/
    Oshpaz bir taomni tayyor bo'lganini belgilaydi.
    """
    permission_classes = [capability('kds')]

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
    permission_classes = [capability('pos')]

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
    permission_classes = [capability('tables_read')]

    def get(self, request):
        shop = self.staff_shop()
        tables = Table.objects.select_related('hall').filter(shop=shop, is_active=True).order_by('hall__order', 'id')
        reserved_ids = upcoming_reserved_table_ids(shop)     # yaqin orada bron kutayotgan bo'sh stollar
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
                'status': 'reserved' if (t.status == 'free' and t.id in reserved_ids) else t.status,
                'capacity': t.capacity,
                'guests_count': 0,
                'total_bill': float(bill_sum),
                'active_orders_count': active_count,
                # Bosma QR uchun doimiy havola (faqat xodim ko'radi): /t/<uuid>/, domen — RESTAURANT_PUBLIC_URL
                'qr_token': str(t.qr_token),
                'qr_path': t.qr_path,
                'public_url': getattr(settings, 'RESTAURANT_PUBLIC_URL', ''),
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
        return [capability('pos')()]

    def get(self, request, call_id=None):
        if call_id is not None:                       # /calls/<id>/ faqat PATCH uchun (avval TypeError → 500)
            raise MethodNotAllowed('GET')
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

    def post(self, request, call_id=None):
        if call_id is not None:
            raise MethodNotAllowed('POST')
        table_num = str(request.data.get('table_number', ''))
        call_type = request.data.get('type', 'waiter')
        if call_type not in dict(ServiceCall.TYPE_CHOICES) or call_type == 'dish_ready':
            call_type = 'waiter'
        title = str(request.data.get('title') or 'Ofitsiant chaqiruvi')[:255]

        shop = RestaurantOrderService.get_or_default_shop()
        table_obj = None
        if has_capability(request.user, 'pos') or getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False):
            table_obj = Table.objects.filter(shop=shop, number=table_num, is_active=True).first()
        if not table_obj:
            # QR token (UUID) bilan ham qabul qilinadi: QR dan kirgan mehmonning brauzerida stol raqami o'rniga token turishi mumkin
            import uuid as _uuid
            try:
                table_obj = Table.objects.filter(shop=shop, qr_token=_uuid.UUID(table_num), is_active=True).first()
            except (ValueError, AttributeError):
                table_obj = None
        if not table_obj and not has_capability(request.user, 'pos'):
            # Mehmon: stol raqamini o'zi yozishi mumkin emas — QR skanerlaganda sessiyaga yozilgan stol olinadi
            session_table = guest_session_table(request)
            if session_table and session_table.shop_id == getattr(shop, 'id', None):
                table_obj = session_table
        if not table_obj:
            return Response({'error': 'Stol topilmadi. Stol ustidagi QR kodni qayta skanerlang.'}, status=404)

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
    GET /api/v1/restaurant/finance/ - Kassa va Qarzlar (faqat restoran rahbariyati).
    Yozish: finance/api_views.py (finance/tx/, finance/tx/<id>/cancel/, finance/debts/, finance/debts/<id>/pay/).
    """
    permission_classes = [IsRestaurantManager]

    def get(self, request):
        from finance.api_views import serialize_debt, serialize_tx
        from finance.services.summary import today_summary
        shop = self.staff_shop()
        txs = FinanceTransaction.objects.filter(shop=shop).select_related('category').order_by('-created_at')[:300]
        debts = DebtRecord.objects.filter(shop=shop).order_by('-created_at')[:150]
        data = {
            'transactions': [serialize_tx(t) for t in txs],
            'debts': [serialize_debt(d) for d in debts],
        }
        if request.GET.get('summary') in ('1', 'true', 'True'):
            summary = today_summary(shop)
            data['summary'] = {
                'income': float(summary['income']),
                'income_cash': float(summary['income_cash']),
                'income_card': float(summary['income_card']),
                'expense': float(summary['expense']),
                'net_profit': float(summary['net_profit']),
                'orders_count': summary['orders_count'],
                'average_check': float(summary['average_check']),
            }
        return Response(data)


class TableAddItemView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/tables/<str:table_number>/add-item/
    Ofitsiant ochiq stolga yangi taom qo'shishi (Atomic).
    """
    permission_classes = [capability('pos')]

    def post(self, request, table_number):
        try:
            res = RestaurantOrderService.add_item_to_table(table_number, request.data, shop=self.staff_shop())
            return Response(res, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Stolga taom qo'shishda xato")
            return Response({'error': "Taomni qo'shib bo'lmadi"}, status=status.HTTP_400_BAD_REQUEST)


def _reservation_error(exc):
    return Response({'error': exc.message, 'code': exc.code}, status=exc.status)


class RestaurantReservationListView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/reservations/ - Ro'yxat (xodim). Standart: bugun, faol holatlar.
        ?date=today|YYYY-MM-DD|all  ?status=active|all|<holat>  ?q=
    POST /api/v1/restaurant/reservations/ - Yangi bron yaratish (mehmon ham).
        Xato: 400 (noto'g'ri ma'lumot), 409 (stol shu vaqtda band / bo'sh stol yo'q).
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [capability('reservations')()]

    def get(self, request):
        filters = {
            'date': request.GET.get('date'),
            'status': request.GET.get('status'),
            'q': request.GET.get('q'),
        }
        try:
            res_list = RestaurantOrderService.get_reservations(filters, shop=self.staff_shop())
        except ReservationError as exc:
            return _reservation_error(exc)
        return Response({'status': 'success', 'reservations': res_list})

    def post(self, request):
        by_staff = has_capability(request.user, 'reservations')
        try:
            created = RestaurantOrderService.create_reservation(
                request.data, shop=self.staff_shop() if by_staff else None, by_staff=by_staff,
            )
        except ReservationError as exc:
            return _reservation_error(exc)
        return Response({'status': 'success', 'reservation': created}, status=status.HTTP_201_CREATED)


class RestaurantReservationStatusView(RestaurantAPIView):
    """
    PATCH /api/v1/restaurant/reservations/<int:reservation_id>/status/   {status, table_number?}
    Holat: pending → confirmed → arrived → seated → completed; cancelled. Mumkin bo'lmagan o'tish — 409.
    Faqat bron bilan ishlaydigan xodim (hostess, rahbariyat); bron o'z restoraniga tegishli bo'lishi shart (begona
    restoran broni — 404).
    """
    permission_classes = [capability('reservations')]

    def patch(self, request, reservation_id):
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'Holat ko\'rsatilmagan'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            res = RestaurantOrderService.update_reservation_status(
                reservation_id, new_status, shop=self.staff_shop(), table_number=request.data.get('table_number'))
        except ReservationError as exc:
            return _reservation_error(exc)
        return Response(res)


class RestaurantReservationFindView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/reservations/find/?q=...
    Mehmon o'z bronini aniq kod (GS-K7QX2) yoki to'liq telefon bo'yicha topadi; ism/telefon maskalanadi.
    Qidiruv tezligi cheklanadi (kodni terib ko'rish mumkin emas).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from backend.ratelimit import rate_limited
        limited = rate_limited(request, 'reservation_find', 20, 60)
        if limited is not None:
            return limited
        q = request.GET.get('q', '').strip()
        if not q:
            return Response({'error': "Qidiruv so'zi kiritilmadi"}, status=status.HTTP_400_BAD_REQUEST)
        shop = RestaurantOrderService.get_or_default_shop()
        res = find_reservation_by_code_or_phone(
            TableReservation.objects.filter(shop=shop, is_deleted=False).select_related('table', 'hall'), q
        )
        if not res:
            return Response({'status': 'not_found', 'reservation': None}, status=status.HTTP_404_NOT_FOUND)
        data = reservation_view(res, mask=True)
        return Response({'status': 'success', 'reservation': data, 'all_matches': [data]})


class StopListView(RestaurantAPIView):
    """
    GET /api/v1/restaurant/products/stoplist/ — shu restoranning barcha (arxivlanmagan) taomlari va ularning mavjudligi.
    Oshpaz, ofitsiant va rahbariyat ko'radi (tugagan taomni qaytarish uchun tugaganlari ham ro'yxatda).
    """
    permission_classes = [capability('stoplist')]

    def get(self, request):
        from products.models import Product
        rows = (Product.objects.filter(shop=self.staff_shop(), is_deleted=False)
                .select_related('category').order_by('category__name', 'name'))
        return Response([{
            'id': p.id, 'name': p.name, 'category': p.category.name if p.category else '',
            'is_available': p.is_available, 'price': float(p.price),
        } for p in rows])


class ProductAvailabilityView(RestaurantAPIView):
    """
    POST /api/v1/restaurant/products/<id>/availability/   {available: true|false}
    Stop-list (R5-1): taom tugadi yoki qaytdi. Taom menyudan darhol yo'qoladi (keyingi yuklashda) va serverda unga
    buyurtma berib bo'lmaydi (savat va checkout `is_available`ni tekshiradi). Faqat o'z restoranining taomi (aks holda 404).
    """
    permission_classes = [capability('stoplist')]

    def post(self, request, product_id):
        from products.models import Product
        value = request.data.get('available')
        if isinstance(value, str):
            text = value.strip().lower()
            value = True if text in ('1', 'true', 'yes', 'ha') else False if text in ('0', 'false', 'no', "yo'q", 'yoq') else None
        if not isinstance(value, bool):
            return Response({'error': "'available' true yoki false bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)
        product = Product.objects.filter(pk=product_id, shop=self.staff_shop(), is_deleted=False).first()
        if not product:
            return Response({'error': 'Taom topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        if product.is_available != value:
            product.is_available = value
            product.save(update_fields=['is_available'])
            from orders.audit import log_audit
            log_audit('stock_change', request=request, actor=request.user, target_type='product', target_id=product.pk,
                      new_value={'event': 'stoplist', 'product': product.name, 'is_available': value})
        return Response({'id': product.pk, 'name': product.name, 'is_available': product.is_available})


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
