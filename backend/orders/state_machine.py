"""
Order State Machine — buyurtma holatlarini boshqarish.
"""
import logging
from decimal import Decimal
from django.utils import timezone
from django.contrib import messages

logger = logging.getLogger(__name__)


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
        # Mahsulot omborini kamaytirish va zaxirani yopish
        _reduce_stock(order)

        # Avtomatik Moliya & Kassa kirimini yozish.
        # Yetkazib berish/olib ketish (stolsiz) buyurtmasi topshirilganda pul olinadi. Stol buyurtmasi esa
        # "yetkazildi" (ya'ni stolga olib chiqildi) bo'lganda hali to'lanmagan — kirim stol yopilganda yoziladi
        # (avval bu yerda ham yozilib, keyin stol yopilganda yana yozilib, daromad ikki baravar chiqardi).
        if not order.table_id and order.payment_status in ('unpaid', 'pending'):
            order.payment_status = 'paid'
        try:
            from finance.services.order_integration import record_order_payment_income
            record_order_payment_income(order, actor=actor)
        except Exception as e:
            logger.warning(f"Finance auto-record error for order {order.pk}: {e}")

    elif new_status == 'cancelled':
        order.cancelled_at = timezone.now()
        order.cancel_reason = reason
        # Bekor qilinganda ishlatilgan bonusni mijoz hisobiga qaytarish
        if order.customer and hasattr(order, 'bonus_used') and order.bonus_used:
            order.customer.bonus = (order.customer.bonus or Decimal('0')) + order.bonus_used
            order.customer.save()
        # Ombor yetkazilganda kamayadi (_reduce_stock), bekor qilingan buyurtma esa hech qachon kamaytirmagan —
        # shuning uchun qoldiq QAYTARILMAYDI (avval har bekor qilishda +qty bo'lib, qoldiq asossiz o'sardi);
        # faqat zaxira bo'shatiladi.
        from orders.inventory import release_reservations
        release_reservations(order)

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

    # Telegram xabar: outbox hodisasi (yuborishni fon ishchisi bajaradi)
    _send_notification(order, new_status, old_status)

    msg = f"Buyurtma #{order.order_number} holati: {ORDER_STATES[new_status]['label']}"
    if request:
        messages.success(request, msg)

    return True, msg


def _reduce_stock(order):
    """
    Buyurtma yetkazilganda omborni kamaytirish (TZ: R10-4).

    Faqat qoldig'i yuritiladigan (stock > 0) mahsulotlar. Qator qulflanadi, shuning uchun parallel yetkazishlarda
    qoldiq manfiy bo'lmaydi va yo'qolmaydi. Oxirgi dona sotilsa, mahsulot "mavjud emas" qilinadi: aks holda
    stock=0 "cheksiz" deb talqin qilinib, sotuv davom etardi.
    """
    from django.db import transaction
    from orders.inventory import convert_reservations
    from products.models import Product

    with transaction.atomic():
        for item in order.items.order_by('product_id'):
            product = Product.objects.select_for_update().filter(id=item.product_id).first()
            if product is None or product.stock <= 0:
                continue
            product.stock = max(0, product.stock - item.quantity)
            fields = ['stock']
            if product.stock == 0 and product.is_available:
                product.is_available = False
                fields.append('is_available')
            product.save(update_fields=fields)
        convert_reservations(order)


def _restore_stock(order):
    """
    Yetkazilgan buyurtma qaytarilganda omborni tiklash (hozir hech qayerda avtomatik chaqirilmaydi: `delivered` — yakuniy
    holat). Bekor qilishda CHAQIRILMAYDI — qarang `_reduce_stock`.
    """
    from django.db import transaction
    from products.models import Product

    with transaction.atomic():
        for item in order.items.order_by('product_id'):
            product = Product.objects.select_for_update().filter(id=item.product_id).first()
            if product is None or product.stock <= 0:
                continue
            product.stock += item.quantity
            product.save(update_fields=['stock'])


def _send_notification(order, status, old_status=None):
    """Holat o'zgarishi haqidagi Telegram xabarini outbox'ga yozadi (so'rovda tarmoqqa chiqilmaydi)."""
    try:
        from notifications.outbox import publish_outbox_event
        publish_outbox_event(
            aggregate_type='order',
            aggregate_id=str(order.pk),
            event_type='order.status_changed',
            payload={'order_id': order.pk, 'old_status': old_status, 'new_status': status},
        )
    except Exception:
        logger.exception("Holat xabarini outbox'ga yozib bo'lmadi (order=%s)", order.pk)


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
