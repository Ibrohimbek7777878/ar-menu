"""
REST API Views for Restaurant Operations.
Single-request handlers for Guest, Waiter, KDS, and Finance.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from orders.models import Order, OrderItem
from tables_restaurant.models import Table, ServiceCall, Hall
from finance.models import FinanceTransaction, DebtRecord
from orders.application.services import RestaurantOrderService


class RestaurantOrderCreateView(APIView):
    """
    POST /api/v1/restaurant/orders/
    Bitta so'rov: Buyurtma qabul qilinadi, oshxonaga uzatiladi va stol band qilinadi.
    """
    def post(self, request):
        try:
            order = RestaurantOrderService.create_order(request.data)
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
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantOrderListView(APIView):
    """
    GET /api/v1/restaurant/orders/
    Barcha faol va bugungi restoran buyurtmalari (KDS, Waiter va Admin uchun).
    """
    def get(self, request):
        qs = Order.objects.filter(is_pickup=True).prefetch_related('items', 'table').order_by('-created_at')[:50]
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


class KitchenItemToggleView(APIView):
    """
    POST /api/v1/restaurant/kitchen/items/<int:item_id>/toggle/
    Oshpaz bir taomni tayyor bo'lganini belgilaydi.
    """
    def post(self, request, item_id):
        try:
            it = OrderItem.objects.get(pk=item_id)
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


class TableSettleBillView(APIView):
    """
    POST /api/v1/restaurant/tables/<str:table_number>/settle/
    Bitta so'rov: Stol hisobi yopiladi va Moliya kassasiga avtomatik pul kirim qilinadi!
    """
    def post(self, request, table_number):
        payment_method = request.data.get('payment_method', 'cash')
        res = RestaurantOrderService.settle_table_bill(table_number, payment_method)
        return Response(res)


class RestaurantTablesStateView(APIView):
    """
    GET /api/v1/restaurant/tables/
    Hamma stollarning joriy holati va jonli hisob summasi.
    """
    def get(self, request):
        tables = Table.objects.select_related('hall').filter(is_active=True).order_by('hall__order', 'id')
        data = []
        for t in tables:
            # Stolning ochiq hisobini hisoblash
            unpaid_orders = Order.objects.filter(table=t, payment_status='unpaid')
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


class ServiceCallActionView(APIView):
    """
    GET /api/v1/restaurant/calls/ - Ro'yxat
    POST /api/v1/restaurant/calls/ - Yangi chaqiruv yaratish
    PATCH /api/v1/restaurant/calls/<int:call_id>/ - Holatini o'zgartirish (accepted/done)
    """
    def get(self, request):
        calls = ServiceCall.objects.select_related('table', 'table__hall').exclude(status='done').order_by('-created_at')[:30]
        data = [{
            'id': c.id,
            'table_number': c.table.number,
            'hall_name': c.table.hall.name if c.table.hall else 'Asosiy Zal',
            'type': c.call_type,
            'title': c.title,
            'time': c.created_at.strftime('%H:%M'),
            'status': c.status,
        } for c in calls]
        return Response(data)

    def post(self, request):
        table_num = str(request.data.get('table_number', '01'))
        call_type = request.data.get('type', 'waiter')
        title = request.data.get('title', 'Ofitsiant chaqiruvi')

        shop = RestaurantOrderService.get_or_default_shop()
        table_obj = Table.objects.filter(number=table_num).first()
        if not table_obj:
            return Response({'error': 'Stol topilmadi'}, status=404)

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
        call = ServiceCall.objects.filter(pk=call_id).first()
        if not call:
            return Response({'error': 'Chaqiruv topilmadi'}, status=404)
        call.status = new_status
        call.save(update_fields=['status'])
        return Response({'status': 'updated'})


class RestaurantFinanceSyncView(APIView):
    """
    GET /api/v1/restaurant/finance/ - Kassa va Qarzlar
    POST /api/v1/restaurant/finance/tx/ - Yangi Kirim/Chiqim
    """
    def get(self, request):
        txs = FinanceTransaction.objects.select_related('category').order_by('-created_at')[:40]
        debts = DebtRecord.objects.order_by('-created_at')[:30]

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


class TableAddItemView(APIView):
    """
    POST /api/v1/restaurant/tables/<str:table_number>/add-item/
    Ofitsiant ochiq stolga yangi taom qo'shishi (Atomic).
    """
    def post(self, request, table_number):
        try:
            res = RestaurantOrderService.add_item_to_table(table_number, request.data)
            return Response(res, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantReservationListView(APIView):
    """
    GET /api/v1/restaurant/reservations/ - Ro'yxat
    POST /api/v1/restaurant/reservations/ - Yangi bron yaratish
    """
    def get(self, request):
        filters = {
            'date': request.GET.get('date'),
            'status': request.GET.get('status'),
            'q': request.GET.get('q'),
        }
        res_list = RestaurantOrderService.get_reservations(filters)
        return Response({'status': 'success', 'reservations': res_list})

    def post(self, request):
        try:
            created = RestaurantOrderService.create_reservation(request.data)
            return Response({'status': 'success', 'reservation': created}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantReservationStatusView(APIView):
    """
    PATCH /api/v1/restaurant/reservations/<int:reservation_id>/status/
    Holatni o'zgartirish (arrived, seated, confirmed, cancelled).
    """
    def patch(self, request, reservation_id):
        new_status = request.data.get('status', 'arrived')
        res = RestaurantOrderService.update_reservation_status(reservation_id, new_status)
        if res.get('error'):
            return Response(res, status=status.HTTP_404_NOT_FOUND)
        return Response(res)


class RestaurantReservationFindView(APIView):
    """
    GET /api/v1/restaurant/reservations/find/?q=...
    Bronni kod yoki telefon raqam bo'yicha qidirish.
    """
    def get(self, request):
        q = request.GET.get('q', '').strip()
        if not q:
            return Response({'error': "Qidiruv so'zi kiritilmadi"}, status=status.HTTP_400_BAD_REQUEST)
        res_list = RestaurantOrderService.get_reservations({'q': q})
        if res_list:
            return Response({'status': 'success', 'reservation': res_list[0], 'all_matches': res_list})
        return Response({'status': 'not_found', 'reservation': None}, status=status.HTTP_404_NOT_FOUND)


class RestaurantProduct3DScanView(APIView):
    """
    POST /api/v1/restaurant/products/3d-scan/ (yangi taom yaratish)
    POST /api/v1/restaurant/products/<int:product_id>/3d-scan/ (mavjud taomga biriktirish)
    """
    def post(self, request, product_id=None):
        try:
            res = RestaurantOrderService.save_product_3d_scan(request.data, product_id=product_id)
            if res.get('error'):
                return Response(res, status=status.HTTP_404_NOT_FOUND)
            return Response(res, status=status.HTTP_201_CREATED if not product_id else status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RestaurantMenuView(APIView):
    """
    GET /api/v1/restaurant/menu/
    Dinamik Menyu va Katalog REST API (Pure SPA fallback).
    """
    def get(self, request):
        data = RestaurantOrderService.get_restaurant_menu()
        return Response(data)
