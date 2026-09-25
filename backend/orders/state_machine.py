"""
Order State Machine — buyurtma holatlarini boshqarish.
"""
from decimal import Decimal
from django.utils import timezone
from django.contrib import messages


# Order holatlari va o'tish qoidalari
ORDER_STATES = {
    'pending': {
        'label': 'Kutilmoqda',
        'allowed_transitions': ['confirmed', 'cancelled'],
    },
    'confirmed': {
        'label': 'Tasdiqlangan',
        'allowed_transitions': ['preparing', 'ready', 'cancelled'],
    },
    'preparing': {
        'label': 'Tayyorlanmoqda',
        'allowed_transitions': ['ready', 'cancelled'],
    },
    'ready': {
        'label': 'Tayyor',
        'allowed_transitions': ['out_for_delivery', 'delivered', 'cancelled'],
    },
    'out_for_delivery': {
        'label': "Yo'lda",
        'allowed_transitions': ['delivered', 'cancelled'],
    },
    'delivered': {
        'label': 'Yetkazildi',
        'allowed_transitions': [],  # Yakunlangan holat
    },
    'cancelled': {
        'label': 'Bekor qilindi',
        'allowed_transitions': [],  # Yakunlangan holat
    },
}


def can_transition(order, new_status):
    """Berilgan holatga o'tish mumkinligini tekshirish."""
    current = order.status
    allowed = ORDER_STATES.get(current, {}).get('allowed_transitions', [])
    return new_status in allowed


def transition_order(order, new_status, actor=None, reason='', request=None):
    """
    Order holatini o'zgartirish.
    Returns: (success: bool, message: str)
    """
    if not can_transition(order, new_status):
        current_label = ORDER_STATES.get(order.status, {}).get('label', order.status)
        new_label = ORDER_STATES.get(new_status, {}).get('label', new_status)
        return False, f"'{current_label}' dan '{new_label}' ga o'tish mumkin emas"

    old_status = order.status
    order.status = new_status

    # Statusga qarab qo'shimcha amallar
    if new_status == 'delivered':
        order.delivered_at = timezone.now()
        # Customer statistikasini yangilash va keshbek bonus berish
        if order.customer:
            order.customer.total_orders += 1
            order.customer.total_spent += order.final_amount
            order.customer.last_order_at = timezone.now()
            if hasattr(order, 'bonus_earned') and order.bonus_earned:
                order.customer.bonus = (order.customer.bonus or Decimal('0')) + order.bonus_earned
            # V15 loyalty: har 10 000 so'm → 1 ball
            try:
                order.customer.loyalty_points = (order.customer.loyalty_points or 0) + int(order.final_amount / 10000)
            except Exception:
                pass
            order.customer.save()
        # Mahsulot omborini kamaytirish
        _reduce_stock(order)

        # Avtomatik Moliya & Kassa kirimini yozish
        try:
            from finance.services.order_integration import record_order_payment_income
            record_order_payment_income(order)
        except Exception as e:
            logger.warning(f"Finance auto-record error for order {order.pk}: {e}")

    elif new_status == 'cancelled':
        order.cancelled_at = timezone.now()
        order.cancel_reason = reason
        # Bekor qilinganda ishlatilgan bonusni mijoz hisobiga qaytarish
        if order.customer and hasattr(order, 'bonus_used') and order.bonus_used:
            order.customer.bonus = (order.customer.bonus or Decimal('0')) + order.bonus_used
            order.customer.save()
        # Omborni qaytarish
        _restore_stock(order)

    elif new_status == 'confirmed':
        order.confirmed_at = timezone.now()

    elif new_status == 'out_for_delivery':
        order.out_for_delivery_at = timezone.now()

    order.save()

    # History yozish
    from orders.models import OrderStatusHistory
    # changed_by FK faqat AdminUser qabul qiladi (mijoz/kuryer — None)
    from accounts.models import AdminUser
    OrderStatusHistory.objects.create(
        order=order,
        status=new_status,
        note=reason or f'{old_status} → {new_status}',
        changed_by=actor if isinstance(actor, AdminUser) else None,
    )

    # Telegram xabar yuborish
    _send_notification(order, new_status)

    msg = f"Buyurtma #{order.order_number} holati: {ORDER_STATES[new_status]['label']}"
    if request:
        messages.success(request, msg)

    return True, msg


def _reduce_stock(order):
    """Buyurtma tasdiqlanganda omborni kamaytirish."""
    from products.models import Product
    for item in order.items.all():
        try:
            product = Product.objects.get(id=item.product_id)
            product.stock = max(0, product.stock - item.quantity)
            product.save(update_fields=['stock'])
        except Product.DoesNotExist:
            pass


def _restore_stock(order):
    """Buyurtma bekor qilinganda omborni qaytarish."""
    from products.models import Product
    for item in order.items.all():
        try:
            product = Product.objects.get(id=item.product_id)
            product.stock += item.quantity
            product.save(update_fields=['stock'])
        except Product.DoesNotExist:
            pass


def _send_notification(order, status):
    """Telegram xabar yuborish."""
    try:
        from notifications.services.telegram_service import (
            send_order_created,
            send_status_updated,
            send_order_delivered,
        )
        if status == 'delivered':
            send_order_delivered(order)
        else:
            send_status_updated(order)
    except Exception:
        pass


def get_order_timeline(order):
    """Buyurtma tarixini timeline sifatida qaytarish."""
    history = order.history.all().order_by('created_at')
    timeline = []
    for h in history:
        timeline.append({
            'status': h.status,
            'label': ORDER_STATES.get(h.status, {}).get('label', h.status),
            'note': h.note,
            'changed_by': h.changed_by,
            'created_at': h.created_at,
        })
    return timeline
