"""
Restoran Buyurtmalar Boshqaruvi REST API (Orders Admin API).
Faqat vakolatli restoran xodimlari uchun (kds / pos / menu_admin).
Tenant isolation (IDOR himoyasi), N+1 optimizatsiyasi va AuditLog to'liq ta'minlanadi.
"""
from datetime import timedelta
from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from orders.models import Order, OrderItem
from web.restaurant_auth import has_capability, staff_shop


STATUS_LABELS = {
    'pending': 'Kutilmoqda',
    'confirmed': 'Tasdiqlangan',
    'preparing': 'Tayyorlanmoqda',
    'ready': 'Tayyor',
    'out_for_delivery': "Yo'lda",
    'delivered': 'Berildi',
    'cancelled': 'Bekor qilindi',
}

PAYMENT_STATUS_LABELS = {
    'unpaid': "To'lanmagan",
    'pending': 'Kutilmoqda',
    'paid': "To'langan",
    'refunded': 'Qaytarilgan',
}


def _serialize_order_item(item):
    return {
        'id': item.id,
        'product_id': item.product_id,
        'product_name': item.product_name,
        'product_image': item.product_image or '',
        'quantity': item.quantity,
        'price': float(item.price),
        'unit': item.unit or 'dona',
        'total': float(item.total),
        'course': getattr(item, 'course', 'any') or 'any',
        'notes': getattr(item, 'notes', '') or '',
        'cooking_status': getattr(item, 'cooking_status', 'pending') or 'pending',
        'is_done': getattr(item, 'is_done', False),
    }


def _serialize_order(order, show_phone=True):
    items = [_serialize_order_item(it) for it in order.items.all()]

    return {
        'id': order.id,
        'order_number': order.order_number,
        'customer_name': order.customer_name or 'Mehmon',
        'customer_phone': order.customer_phone_1 if show_phone else '',
        'table': {
            'id': order.table.id,
            'number': order.table.number,
            'hall_name': order.table.hall.name if order.table.hall else 'Asosiy Zal',
        } if order.table else None,
        'table_number': order.table.number if order.table else '',
        'status': order.status,
        'status_display': STATUS_LABELS.get(order.status, order.status),
        'payment_status': order.payment_status,
        'payment_status_display': PAYMENT_STATUS_LABELS.get(order.payment_status, order.payment_status),
        'is_pickup': order.is_pickup,
        'notes': order.notes or '',
        'total_amount': float(order.total_amount),
        'discount_amount': float(order.discount_amount),
        'delivery_fee': float(order.delivery_fee),
        'final_amount': float(order.final_amount),
        'items_count': len(items),
        'items': items,
        'cancel_reason': order.cancel_reason or '',
        'created_at': order.created_at.isoformat(),
        'confirmed_at': order.confirmed_at.isoformat() if order.confirmed_at else None,
        'delivered_at': order.delivered_at.isoformat() if order.delivered_at else None,
        'cancelled_at': order.cancelled_at.isoformat() if order.cancelled_at else None,
    }


class OrdersListCreateView(APIView):
    """
    GET /api/restaurant/admin/v1/orders/ — Restoran buyurtmalari ro'yxati, filtrlash va paginatsiya.
    POST /api/restaurant/admin/v1/orders/ — Xodim/ofitsiant tomonidan yangi buyurtma ochish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('kds')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        show_phone = has_capability(request.user, 'pos') or has_capability(request.user, 'menu_admin')

        qs = (
            Order.objects.filter(shop=shop)
            .select_related('table', 'table__hall')
            .prefetch_related('items')
            .order_by('-created_at')
        )

        # 1. Holat bo'yicha filtr
        status_param = request.GET.get('status', '').strip()
        if status_param and status_param != 'all':
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            qs = qs.filter(status__in=statuses)

        # 2. To'lov holati bo'yicha filtr
        payment_param = request.GET.get('payment_status', '').strip()
        if payment_param and payment_param != 'all':
            qs = qs.filter(payment_status=payment_param)

        # 3. Stol bo'yicha filtr
        table_id = request.GET.get('table_id')
        if table_id and table_id.isdigit():
            qs = qs.filter(table_id=int(table_id))

        # 4. Sana bo'yicha filtr (date=today, yesterday yoki from, to)
        date_param = request.GET.get('date', '').strip()
        now = timezone.now()
        if date_param == 'today':
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            qs = qs.filter(created_at__gte=start_of_day)
        elif date_param == 'yesterday':
            start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start_of_yesterday = start_of_today - timedelta(days=1)
            qs = qs.filter(created_at__gte=start_of_yesterday, created_at__lt=start_of_today)
        elif date_param == 'last24h':
            qs = qs.filter(created_at__gte=now - timedelta(hours=24))

        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        # 5. Qidiruv (buyurtma raqami, stol raqami yoki mijoz ismi)
        query = request.GET.get('q', '').strip()
        if query:
            qs = qs.filter(
                Q(order_number__icontains=query) |
                Q(customer_name__icontains=query) |
                Q(table__number__icontains=query)
            )

        # 6. Xulosa (Summary) hisoblash — 1 ta tezkor agregatsiya so'rovi (today bo'yicha)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        summary_agg = (
            Order.objects.filter(shop=shop, created_at__gte=today_start)
            .values('status')
            .annotate(count=Count('id'))
        )
        counts = {
            'today_total': 0,
            'pending': 0,
            'confirmed': 0,
            'preparing': 0,
            'ready': 0,
            'delivered': 0,
            'cancelled': 0,
        }
        for row in summary_agg:
            st_name = row['status']
            cnt = row['count']
            counts['today_total'] += cnt
            if st_name in counts:
                counts[st_name] = cnt

        # 7. Paginatsiya
        page = 1
        page_size = 20
        try:
            page = max(1, int(request.GET.get('page', 1)))
            page_size = min(100, max(5, int(request.GET.get('page_size', 20))))
        except (ValueError, TypeError):
            pass

        paginator = Paginator(qs, page_size)
        try:
            page_obj = paginator.page(page)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages if paginator.num_pages > 0 else 1)

        items = [_serialize_order(o, show_phone=show_phone) for o in page_obj.object_list]

        return Response({
            'items': items,
            'summary': counts,
            'page': page_obj.number,
            'page_size': page_size,
            'total': paginator.count,
            'num_pages': paginator.num_pages,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        })


class OrderDetailView(APIView):
    """
    GET /api/restaurant/admin/v1/orders/<pk>/ — Buyurtma to'liq tafsilotlari.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('kds')]

    def get(self, request, pk):
        shop = staff_shop(request)
        order = get_object_or_404(
            Order.objects.select_related('table', 'table__hall').prefetch_related('items'),
            pk=pk,
            shop=shop
        )
        show_phone = has_capability(request.user, 'pos') or has_capability(request.user, 'menu_admin')
        return Response(_serialize_order(order, show_phone=show_phone))


class OrderStatusUpdateView(APIView):
    """
    POST /api/restaurant/admin/v1/orders/<pk>/status/ — Buyurtma holatini yangilash.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('kds')]

    def post(self, request, pk):
        shop = staff_shop(request)
        order = get_object_or_404(Order.objects.select_related('table'), pk=pk, shop=shop)

        new_status = request.data.get('status')
        if new_status not in STATUS_LABELS:
            return Response({
                'error': f'Noto\'g\'ri holat. Mumkin bo\'lganlar: {list(STATUS_LABELS.keys())}'
            }, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        now = timezone.now()

        with transaction.atomic():
            order.status = new_status
            update_fields = ['status', 'updated_at']

            if new_status == 'confirmed' and not order.confirmed_at:
                order.confirmed_at = now
                update_fields.append('confirmed_at')
            elif new_status == 'delivered':
                order.delivered_at = now
                update_fields.append('delivered_at')
            elif new_status == 'cancelled':
                order.cancelled_at = now
                update_fields.append('cancelled_at')
                cancel_reason = request.data.get('cancel_reason', '').strip()
                if cancel_reason:
                    order.cancel_reason = cancel_reason
                    update_fields.append('cancel_reason')

            order.save(update_fields=update_fields)

            # Agar stol buyurtmasi bo'lsa va stol holatini sinxronlashtirish kerak bo'lsa:
            if order.table:
                if new_status in ('pending', 'confirmed', 'preparing') and order.table.status == 'free':
                    order.table.status = 'occupied'
                    order.table.save(update_fields=['status'])
                elif new_status == 'ready' and order.table.status in ('occupied', 'ordering', 'waiting'):
                    order.table.status = 'ready'
                    order.table.save(update_fields=['status'])

            log_audit(
                'order_status_changed',
                request=request,
                actor=request.user,
                target_type='order',
                target_id=order.id,
                old_value={'status': old_status},
                new_value={'status': new_status, 'cancel_reason': order.cancel_reason}
            )

        return Response({
            'id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'status_display': STATUS_LABELS.get(order.status, order.status),
        })


class OrderPaymentUpdateView(APIView):
    """
    POST /api/restaurant/admin/v1/orders/<pk>/payment/ — To'lov holatini o'zgartirish (masalan: naqd/karta to'landi).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('pos')]

    def post(self, request, pk):
        shop = staff_shop(request)
        order = get_object_or_404(Order.objects.select_related('table'), pk=pk, shop=shop)

        new_payment = request.data.get('payment_status')
        if new_payment not in PAYMENT_STATUS_LABELS:
            return Response({
                'error': f'Noto\'g\'ri to\'lov holati. Mumkin bo\'lganlar: {list(PAYMENT_STATUS_LABELS.keys())}'
            }, status=status.HTTP_400_BAD_REQUEST)

        old_payment = order.payment_status
        order.payment_status = new_payment
        order.save(update_fields=['payment_status', 'updated_at'])

        log_audit(
            'order_payment_status_changed',
            request=request,
            actor=request.user,
            target_type='order',
            target_id=order.id,
            old_value={'payment_status': old_payment},
            new_value={'payment_status': new_payment}
        )

        return Response({
            'id': order.id,
            'order_number': order.order_number,
            'payment_status': order.payment_status,
            'payment_status_display': PAYMENT_STATUS_LABELS.get(order.payment_status, order.payment_status),
        })
