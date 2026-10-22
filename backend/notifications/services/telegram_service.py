"""
Telegram bildirishnoma xizmati.
Telegram Bot API orqali buyurtma holatini xabar berish.

Yuborish `notifications.telegram_client` orqali (token har chaqiruvda o'qiladi, xato turi ajratiladi). Ichki
yuborishlar `OutboxEvent` navbati orqali fon ishchisida bajariladi (notifications/outbox.py), so'rov ichida emas.
"""
import logging

import httpx
from django.conf import settings
from django.utils import timezone
from notifications import telegram_client
from notifications.models import NotificationLog
from notifications.telegram_client import esc

logger = logging.getLogger(__name__)

# Eski import'lar uchun (web/health.py). Yangi kod `settings`dan chaqiruv vaqtida o'qiydi.
TELEGRAM_BOT_TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = getattr(settings, 'TELEGRAM_CHAT_ID', '')
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def _send_message(chat_id, text, parse_mode='HTML', reply_markup=None):
    """Telegram'ga xabar yuborish. {'success', 'error', 'retryable', 'skipped'} qaytaradi."""
    return telegram_client.send(chat_id, text, parse_mode=parse_mode, reply_markup=reply_markup).as_dict()


def _default_chat_id():
    """Umumiy guruh/admin chat (env TELEGRAM_CHAT_ID), chaqiruv vaqtida o'qiladi."""
    value = str(getattr(settings, 'TELEGRAM_CHAT_ID', '') or '').strip()
    return '' if value.lower() == 'none' else value


def _order_chat_ids(order):
    """Buyurtma tegishli restoranning xodim/admin chatlari, bo'lmasa umumiy guruh."""
    from notifications.admin_bot import get_shop_admin_chat_ids
    ids = [str(c) for c in get_shop_admin_chat_ids(getattr(order, 'shop', None)) if c]
    default = _default_chat_id()
    if not ids and default:
        ids = [default]
    return ids


def _order_link(order):
    """Xodim uchun buyurtma havolasi: faqat ochiq domen (RESTAURANT_PUBLIC_URL) sozlangan bo'lsa."""
    base = getattr(settings, 'RESTAURANT_PUBLIC_URL', '')
    if not base:
        return ''
    return f'\n\n🔗 <a href="{base}/seller/orders/{order.pk}/">Buyurtmani ko\'rish</a>'


def _hhmm(value):
    return timezone.localtime(value).strftime('%H:%M') if value else 'N/A'


def _log(order, recipient, text, result):
    try:
        NotificationLog.objects.create(
            order=order, type='telegram', recipient=str(recipient or 'N/A'), message=text[:4000],
            success=bool(result.get('success')), error_message=str(result.get('error', ''))[:500],
        )
    except Exception:
        logger.exception('[Telegram] NotificationLog yozilmadi')


def _notify_staff(order, text, reply_markup=None):
    """Matnni restoran xodimlariga yuboradi va natijani jurnalga yozadi."""
    results = []
    for cid in _order_chat_ids(order):
        result = _send_message(cid, text, reply_markup=reply_markup)
        results.append(result)
        _log(order, cid, text, result)
    return results


def _notify_customer(order, text):
    customer = getattr(order, 'customer', None)
    chat = getattr(customer, 'telegram_chat_id', '') if customer else ''
    if not chat:
        return None
    result = _send_message(chat, text)
    _log(order, chat, text, result)
    return result


def _combine(results):
    """Bir nechta qabul qiluvchiga yuborish natijasini bitta qarorga keltiradi.

    Kamida bittasiga yetgan bo'lsa — muvaffaqiyat (qolganlar jurnalda; qayta urinish yetganlarga dublikat berardi).
    Hech kim yo'q yoki bot sozlanmagan — `skipped` (xato emas, sozlama holati).
    """
    if not results:
        return {'success': False, 'skipped': True, 'error': "Chat ID yo'q"}
    if any(r.get('success') for r in results):
        return {'success': True, 'error': ''}
    return {
        'success': False,
        'skipped': all(r.get('skipped') for r in results),
        'retryable': any(r.get('retryable') for r in results),
        'retry_after': max((r.get('retry_after') or 0) for r in results),
        'error': results[0].get('error', ''),
    }


def get_chat_id_from_username(username):
    """Botga yozgan foydalanuvchining chat_id'sini olish."""
    try:
        resp = httpx.get(
            f"https://api.telegram.org/bot{telegram_client.get_token()}/getUpdates",
            timeout=10,
        )
        data = resp.json()
        for update in data.get('result', []):
            msg = update.get('message', {})
            chat = msg.get('chat', {})
            if chat.get('username', '').lower() == username.lower():
                return chat.get('id')
    except Exception:
        pass
    return None


def notify_enabled(key, default=False):
    """Admin sozlamasi (AppSetting) yoki .env (KEY nomi katta harfda) bilan yoqiladigan bildirishnoma."""
    from notifications.models import AppSetting
    row = AppSetting.objects.filter(key=key).first()
    if row is not None:
        return str(row.value).strip().lower() in ('1', 'true', 'yes', 'on', 'ha')
    return bool(getattr(settings, key.upper(), default))


def send_order_created(order):
    """Yangi buyurtma yaratilganda xabar — restoran xodimlariga + mijozga."""
    items_text = "\n".join([
        f"  • {esc(item.product_name)} x{item.quantity} — {int(item.total):,} so'm"
        for item in order.items.all()
    ])

    table_text = ""
    if getattr(order, 'table', None):
        table_text = f"🍽 <b>STOL:</b> №{esc(order.table.number)}"
        if order.table.hall:
            table_text += f" ({esc(order.table.hall.name)})"
        table_text += "\n"

    text = (
        f"🛒 <b>Yangi buyurtma!</b>\n\n"
        f"📦 #{esc(order.order_number)}\n"
        f"{table_text}"
        f"👤 {esc(order.customer_name)}\n"
        f"📞 {esc(order.customer_phone_1)}\n"
        f"📍 {esc(order.delivery_address) or 'Ko\'rsatilmagan'}\n\n"
        f"🛍 <b>Mahsulotlar:</b>\n{items_text}\n\n"
        f"💰 Jami: {int(order.total_amount):,} so'm\n"
        f"🚗 Yetkazish: {int(order.delivery_fee):,} so'm\n"
        f"💳 Umumiy: {int(order.final_amount):,} so'm"
        f"{_order_link(order)}"
    )

    reply_markup = None
    try:
        from notifications.admin_bot import build_order_keyboard
        reply_markup = build_order_keyboard(order)
    except Exception:
        logger.exception('[Telegram] Buyurtma tugmalari qurilmadi (order=%s)', order.pk)

    results = _notify_staff(order, text, reply_markup=reply_markup)

    # Mijozga alohida xabar
    customer_result = _notify_customer(order, (
        f"Salom, <b>{esc(order.customer_name)}</b>! 👋\n\n"
        f"Buyurtmangiz qabul qilindi!\n"
        f"📦 #{esc(order.order_number)}\n"
        f"💰 Umumiy: {int(order.final_amount):,} so'm\n\n"
        f"Tez orada tasdiqlanadi!"
    ))
    if customer_result:
        results.append(customer_result)
    return _combine(results)


def send_table_reservation_alert(reservation):
    """Yangi stol broni haqida Telegram guruh va ofitsiantlarga bildirishnoma yuborish."""
    tbl_str = f"№{esc(reservation.table.number)}" if reservation.table else "Joyida beriladi"
    hall_str = esc(reservation.hall.name) if reservation.hall else (
        esc(reservation.table.hall.name) if reservation.table and reservation.table.hall else "Asosiy zal")

    text = (
        f"📅 <b>YANGI STOL BRONI QABUL QILINDI!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🍽 <b>Restoran:</b> {esc(reservation.shop.name)}\n"
        f"👤 <b>Mehmon:</b> {esc(reservation.customer_name)}\n"
        f"📞 <b>Telefon:</b> {esc(reservation.customer_phone)}\n"
        f"👥 <b>Mehmonlar soni:</b> {reservation.guests_count} kishi\n"
        f"📆 <b>Sana:</b> {reservation.reservation_date.strftime('%d.%m.%Y')}\n"
        f"⏰ <b>Vaqt:</b> {reservation.reservation_time.strftime('%H:%M')}\n"
        f"🏢 <b>Zal:</b> {hall_str}\n"
        f"📍 <b>Stol:</b> {tbl_str}\n"
        f"📝 <b>Izoh:</b> <i>{esc(reservation.notes) or 'Qo\'shimcha talab yo\'q'}</i>\n\n"
        f"👉 <i>Ofitsiant/Kassir paneli orqali tasdiqlang.</i>"
    )

    from notifications.admin_bot import get_shop_admin_chat_ids
    target_chat_ids = [str(c) for c in get_shop_admin_chat_ids(getattr(reservation, 'shop', None)) if c]
    if not target_chat_ids and _default_chat_id():
        target_chat_ids = [_default_chat_id()]

    return _combine([_send_message(cid, text) for cid in target_chat_ids])


STATUS_EMOJI = {
    'pending': '⏳', 'confirmed': '✅', 'preparing': '👨‍🍳',
    'ready': '📦', 'out_for_delivery': '🚗', 'delivered': '🎉', 'cancelled': '❌',
}
STATUS_TEXT = {
    'pending': 'Kutilmoqda', 'confirmed': 'Tasdiqlangan',
    'preparing': 'Tayyorlanmoqda', 'ready': 'Tayyor — olib ketish',
    'out_for_delivery': "Yo'lda", 'delivered': 'Yetkazildi', 'cancelled': 'Bekor qilindi',
}


def send_status_updated(order, old_status=None, new_status=None, notify_staff=True):
    """Buyurtma holati o'zgarganda xabar — xodimlarga (admin sozlamasi bilan) + mijozga."""
    new_status = new_status or order.status
    emoji = STATUS_EMOJI.get(new_status, '📋')
    status_text = STATUS_TEXT.get(new_status, new_status)
    courier_name = esc(order.courier.name) if getattr(order, 'courier', None) else ''

    results = []
    if notify_staff:
        text = (
            f"{emoji} <b>Buyurtma holati o'zgardi!</b>\n\n"
            f"📦 #{esc(order.order_number)}\n"
            f"👤 {esc(order.customer_name)}\n\n"
            f"🔄 {STATUS_TEXT.get(old_status, old_status or '—')} → <b>{status_text}</b>"
        )
        if new_status == 'out_for_delivery' and courier_name:
            text += f"\n🚗 Kuryer: {courier_name}"
        elif new_status == 'delivered':
            text += f"\n⏰ Yetkazildi: {_hhmm(order.delivered_at)}"
        text += _order_link(order)
        results = _notify_staff(order, text)

    customer_text = f"{emoji} <b>Buyurtma #{esc(order.order_number)}</b>\n\nHolat: <b>{status_text}</b>"
    if new_status == 'out_for_delivery' and courier_name:
        customer_text += f"\n🚗 Kuryer: {courier_name}"
    elif new_status == 'delivered':
        customer_text += "\n✅ Yetkazildi!"
    elif new_status == 'cancelled':
        customer_text += "\n❌ Bekor qilindi"
    customer_result = _notify_customer(order, customer_text)
    if customer_result:
        results.append(customer_result)
    return _combine(results)


def send_courier_assigned(order):
    """Kuryer biriktirilganda xabar — xodimlarga + mijozga."""
    courier = getattr(order, 'courier', None)
    text = (
        f"🚗 <b>Kuryer biriktirildi!</b>\n\n"
        f"📦 #{esc(order.order_number)}\n"
        f"👤 {esc(order.customer_name)}\n"
        f"📍 {esc(order.delivery_address) or 'Ko\'rsatilmagan'}\n\n"
        f"🧑 Kuryer: {esc(courier.name) if courier else 'N/A'}\n"
        f"📞 Tel: {esc(courier.phone) if courier else 'N/A'}"
    )
    results = _notify_staff(order, text)
    customer_result = _notify_customer(order, (
        f"🚗 <b>Buyurtma #{esc(order.order_number)}</b>\n\n"
        f"Kuryer yo'lda! 🚚\n"
        f"🧑 {esc(courier.name) if courier else 'N/A'}\n"
        f"📞 {esc(courier.phone) if courier else 'N/A'}"
    ))
    if customer_result:
        results.append(customer_result)
    return _combine(results)


def send_order_delivered(order, notify_staff=True):
    """Buyurtma yetkazilganda xabar — xodimlarga + mijozga."""
    results = []
    if notify_staff:
        results = _notify_staff(order, (
            f"🎉 <b>Buyurtma yetkazildi!</b>\n\n"
            f"📦 #{esc(order.order_number)}\n"
            f"👤 {esc(order.customer_name)}\n"
            f"💰 Summa: {int(order.final_amount):,} so'm\n"
            f"⏰ Vaqt: {_hhmm(order.delivered_at)}"
        ))
    customer_result = _notify_customer(order, (
        f"🎉 <b>Buyurtma yetkazildi!</b>\n\n"
        f"📦 #{esc(order.order_number)}\n"
        f"💰 {int(order.final_amount):,} so'm\n\n"
        f"Rahmat! 🙏"
    ))
    if customer_result:
        results.append(customer_result)
    return _combine(results)


def send_order_cancelled(order, reason=''):
    """Buyurtma bekor qilinganda xabar."""
    text = (
        f"❌ <b>Buyurtma bekor qilindi!</b>\n\n"
        f"📦 #{esc(order.order_number)}\n"
        f"👤 {esc(order.customer_name)}\n"
        f"💰 Summa: {int(order.final_amount):,} so'm"
    )
    if reason:
        text += f"\n📝 Sabab: {esc(reason)}"
    return _combine(_notify_staff(order, text))


def send_stock_warning(product, current_stock):
    """Ombor kamayganda xabar."""
    text = (
        f"⚠️ <b>Ombor kamaydi!</b>\n\n"
        f"📦 {esc(product.name)}\n"
        f"📊 Qoldiq: {current_stock} dona\n"
        f"🏪 Do'kon: {esc(product.shop.name)}"
    )
    chat = _default_chat_id()
    result = _send_message(chat, text)
    _log(None, chat, text, result)
    return result


def send_daily_report(orders_today, revenue_today):
    """Kunlik hisobot."""
    text = (
        f"📊 <b>Kunlik hisobot</b>\n\n"
        f"📦 Buyurtmalar: {orders_today}\n"
        f"💰 Daromad: {int(revenue_today):,} so'm\n"
        f"📅 Sana: {timezone.localdate().strftime('%d.%m.%Y')}"
    )
    return _send_message(_default_chat_id(), text)


def send_new_review(review):
    """Yangi sharh kelganda xabar."""
    text = (
        f"⭐ <b>Yangi sharh!</b>\n\n"
        f"📦 {esc(review.product.name) if review.product else 'N/A'}\n"
        f"👤 {esc(review.customer_name)}\n"
        f"⭐ {review.rating}/5\n"
        f"💬 {esc(review.comment[:100]) if review.comment else 'Yoq'}"
    )
    return _send_message(_default_chat_id(), text)


SERVICE_INFO = {
    'waiter': ("🔔 OFITSIANT CHAQIRUVI!", "Mijoz ofitsiantni chaqirmoqda."),
    'tea': ("🫖 CHOY YANGILASH!", "Mijoz choy yangilashni so'ramoqda."),
    'bread': ("🍞 ISSIQ NON!", "Mijoz issiq non keltirishni so'ramoqda."),
    'bill': ("🧾 HISOB (CHEK) SO'ROVI!", "Mijoz hisob-kitob qilishni so'ramoqda."),
    'dish_ready': ("🍽 TAOM TAYYOR!", "Oshxona taomni tayyorladi — stolga olib boring."),
}


def send_table_service_call(shop, table, service_type, note=''):
    """
    Stoldan ofitsiant chaqirish yoki xizmat so'rash bildirishnomasi.
    service_type: 'waiter' (Ofitsiant), 'tea' (Choy), 'bread' (Non), 'bill' (Hisob/Chek), 'dish_ready' (Taom tayyor)
    """
    title, desc = SERVICE_INFO.get(service_type, ("🔔 XIZMAT CHAQIRUVI!", "Mijoz xizmat so'ramoqda."))
    table_str = f"Stol №{esc(table.number)}" if table else "Noma'lum stol"
    hall_str = f" ({esc(table.hall.name)})" if table and getattr(table, 'hall', None) else ""
    shop_name = esc(shop.name) if shop else "Muassasa"

    text = (
        f"<b>{title}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🍽 <b>Joy:</b> {table_str}{hall_str}\n"
        f"🏪 <b>Muassasa:</b> {shop_name}\n"
        f"📝 <b>Holat:</b> {desc}\n"
    )
    if note:
        text += f"💬 <b>Izoh:</b> {esc(note)}\n"
    text += f"⏰ <b>Vaqt:</b> {timezone.localtime().strftime('%H:%M:%S')}\n"
    text += "━━━━━━━━━━━━━━━━━━━\n"
    text += "<i>Iltimos, kechiktirmasdan xizmat ko'rsating!</i>"

    target_chat_ids = []
    # Agar stolga ofitsiant biriktirilgan bo'lsa
    if table and getattr(table, 'assigned_waiter', None):
        waiter = table.assigned_waiter
        w_chat = getattr(waiter, 'telegram_chat_id', '') or getattr(waiter, 'telegram_id', '')
        if w_chat:
            target_chat_ids.append(str(w_chat))

    # Shop egasining chat_id si
    if shop and hasattr(shop, 'owner') and getattr(shop.owner, 'telegram_chat_id', None):
        owner_chat = str(shop.owner.telegram_chat_id)
        if owner_chat not in target_chat_ids:
            target_chat_ids.append(owner_chat)

    # Shu restoranning xodim chatlari, bo'lmasa standart guruh
    from notifications.admin_bot import get_shop_admin_chat_ids
    for cid in get_shop_admin_chat_ids(shop) if shop else []:
        if str(cid) not in target_chat_ids:
            target_chat_ids.append(str(cid))
    default = _default_chat_id()
    if default and default not in target_chat_ids:
        target_chat_ids.append(default)

    results = []
    for cid in target_chat_ids:
        r = _send_message(cid, text)
        results.append(r)
        _log(None, cid, text, r)
    return _combine(results)


def handle_webhook(update):
    """Telegram webhook handler — kelgan xabarlarni va inline callback_query larni qayta ishlaydi."""
    # 1. CALLBACK QUERY (Inline tugmalar bosilganda)
    callback_query = update.get('callback_query')
    if callback_query:
        cb_id = callback_query.get('id')
        cb_data = callback_query.get('data', '')
        cb_message = callback_query.get('message', {})
        cb_chat_id = cb_message.get('chat', {}).get('id')

        # Telegram spinner to'xtashi uchun answerCallbackQuery
        telegram_client.call('answerCallbackQuery', {"callback_query_id": cb_id})

        # 3D Buyurtma holatini o'zgartirish (Usta tomonidan)
        if cb_data.startswith('3d_status:'):
            from ar3d.models import Print3DOrder
            from notifications.services.print3d_notification_service import notify_customer_3d_order_ready
            parts = cb_data.split(':')
            if len(parts) >= 3:
                new_status = parts[1]
                order_id = parts[2]
                order = Print3DOrder.objects.filter(id=order_id).first()
                if order:
                    order.status = new_status
                    order.save(update_fields=['status'])

                    if new_status == 'printing':
                        _send_message(cb_chat_id, f"⚙️ Buyurtma <b>#{esc(order.order_number)}</b> holati <b>'Chop etilmoqda'</b> ga o'zgartirildi!")
                        if order.telegram_chat_id:
                            _send_message(
                                order.telegram_chat_id,
                                f"⚙️ <b>Xushxabar, {esc(order.customer_name)}!</b>\n\n"
                                f"Sizning <b>#{esc(order.order_number)}</b> raqamli 3D printer buyurtmangiz hozirda usta tomonidan 3D printerda chop etilishni boshladi! 🚀\n\n"
                                f"Tayyor bo'lishi bilan sizga fotosurat va lokatsiya yuboramiz."
                            )
                    elif new_status == 'ready':
                        notify_customer_3d_order_ready(order)
                        _send_message(cb_chat_id, f"✅ Buyurtma <b>#{esc(order.order_number)}</b> 'TAYYOR' deb belgilandi va mijozga rasm/lokatsiya yuborildi!")
            return {'success': True}

        # Mijoz ustaxona lokatsiyasini so'raganda
        elif cb_data.startswith('3d_get_loc'):
            from notifications.services.print3d_notification_service import GULISTON_STUDIO_LAT, GULISTON_STUDIO_LON
            telegram_client.call('sendLocation', {
                "chat_id": cb_chat_id, "latitude": GULISTON_STUDIO_LAT, "longitude": GULISTON_STUDIO_LON,
            })
            loc_msg = (
                f"📍 <b>Guliston 3D Studio & AR Center</b>\n"
                f"🏢 <b>Manzil:</b> Guliston shahar, Sayxun ko'chasi 14-uy\n"
                f"🎯 <b>Mo'ljal:</b> Sayxun bozorchasi yonida\n"
                f"🕒 <b>Ish vaqti:</b> Har kuni 09:00 dan 20:00 gacha\n"
                f"📞 <b>Telefon:</b> +998 90 123 45 67\n\n"
                f"Marhamat, buyurtmangizni ko'rib olib ketishingiz mumkin!"
            )
            _send_message(cb_chat_id, loc_msg)
            return {'success': True}

        # Taksi chaqirish tugmasi
        elif cb_data == 'taxi_call':
            from couriers.taxi_service import get_telegram_taxi_markup
            taxi_msg = (
                f"🚕 <b>Guliston Tezkor va Arzon Taksi Xizmatlari:</b>\n\n"
                f"Quyidagi xizmatlardan birini tanlab, 1-bosishda dispetcherga qo'ng'iroq qilishingiz mumkin 👇"
            )
            _send_message(cb_chat_id, taxi_msg, reply_markup=get_telegram_taxi_markup())
            return {'success': True}

        return {'success': True}

    # 2. ODDIY XABARLAR (Messages)
    message = update.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    text = message.get('text', '')
    user = message.get('from', {})
    message_id = message.get('message_id')

    if not chat_id or not text:
        return {'success': False, 'error': 'Invalid update'}

    from notifications.models import BotMessage, TelegramSubscriber
    response_text = ''

    # Obunachini saqlash / yangilash
    TelegramSubscriber.objects.update_or_create(
        chat_id=str(chat_id),
        defaults={
            'username': user.get('username', ''),
            'first_name': user.get('first_name', ''),
            'is_active': True,
        }
    )

    # Buyurtma raqamini tekshirish
    if text.startswith('/order'):
        parts = text.split()
        if len(parts) > 1:
            order_number = parts[1]
            from orders.models import Order
            from notifications.admin_bot import is_admin
            # Buyurtma raqami taxmin qilinadi (GLS-YYYYMMDD-NNNN): ism va summani faqat buyurtma egasi (shu Telegram
            # akkaunt bog'langan mijoz) yoki admin ko'ra oladi; boshqalarga "topilmadi" (mavjudligi ham oshkor bo'lmaydi)
            order = Order.objects.select_related('customer').filter(order_number=order_number).first()
            owner_chat = str(getattr(getattr(order, 'customer', None), 'telegram_chat_id', '') or '')
            if order and (owner_chat == str(chat_id) or is_admin(chat_id, user.get('username', ''))):
                status_text = dict(Order.STATUS_CHOICES).get(order.status, order.status)
                response_text = (
                    f"📦 #{esc(order.order_number)}\n"
                    f"👤 {esc(order.customer_name)}\n"
                    f"💰 {int(order.final_amount):,} so'm\n"
                    f"📊 Holat: {esc(status_text)}"
                )
            else:
                response_text = "Buyurtma topilmadi"
            _send_message(chat_id, response_text)

    elif text == '/start':
        from django.conf import settings
        domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        base_url = f"{scheme}://{domain}"

        welcome = (
            f"Assalomu alaykum, <b>{esc(user.get('first_name') or 'qadrli mijoz')}</b>! 👋\n\n"
            f"🏪 <b>Online Store Guliston & AR Menu</b> rasmiy Telegram Mini App botiga xush kelibsiz!\n\n"
            f"Bu yerda siz:\n"
            f"• 🛍 Barcha do'kon va restoranlardan xarid qilishingiz\n"
            f"• 🥽 Taomlarni 3D & AR formatda ko'rishingiz\n"
            f"• 📦 Buyurtmangiz holatini kuzatib borishingiz mumkin.\n\n"
            f"Ilovani ochish uchun quyidagi tugmani bosing 👇"
        )
        markup = {
            "inline_keyboard": [
                [
                    {"text": "🛍 Do'konni ochish (Mini App)", "web_app": {"url": f"{base_url}/tma/"}},
                    {"text": "🥽 3D / AR Menyu", "web_app": {"url": f"{base_url}/ar/"}},
                ],
                [
                    {"text": "📦 Mening buyurtmalarim", "web_app": {"url": f"{base_url}/tma/orders/"}},
                    {"text": "🔍 Katalog va Qidiruv", "web_app": {"url": f"{base_url}/tma/catalog/"}},
                ]
            ]
        }
        response_text = welcome
        _send_message(chat_id, welcome, reply_markup=markup)

    elif text == '/menu' or text.startswith('/menu'):
        from shops.models import Shop
        from django.conf import settings
        domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        base_url = f"{scheme}://{domain}"
        shop = Shop.objects.first()
        if shop:
            menu_url = f"{scheme}://{domain}/m/{shop.slug}/"
            response_text = (
                f"🍽 <b>{esc(shop.name)} — 3D/AR Menyu</b>\n\n"
                f"Kamerangiz orqali taomlarni 3D ko'rib, buyurtma bering:\n"
                f"👉 Quyidagi tugma orqali menyuni oching:"
            )
            markup = {
                "inline_keyboard": [
                    [{"text": "🍽 3D/AR Menyuni ochish", "web_app": {"url": menu_url}}],
                    [{"text": "🛍 Barcha mahsulotlar (Mini App)", "web_app": {"url": f"{base_url}/tma/"}}]
                ]
            }
        else:
            response_text = "Hozircha faol do'kon menyusi topilmadi."
            markup = {
                "inline_keyboard": [
                    [{"text": "🛍 Do'konni ochish (Mini App)", "web_app": {"url": f"{base_url}/tma/"}}]
                ]
            }
        _send_message(chat_id, response_text, reply_markup=markup)

    elif text == '/kassa' or text.startswith('/kassa'):
        from finance.models import FinanceTransaction
        from django.db.models import Sum
        from notifications.admin_bot import get_restaurant_shop, is_admin
        today = timezone.localdate()
        # Kassa — moliyaviy ma'lumot: avval istalgan Telegram foydalanuvchiga "birinchi do'kon" kassasi ko'rsatilardi
        shop = get_restaurant_shop() if is_admin(chat_id, user.get('username', '')) else None
        if shop:
            tx_today = FinanceTransaction.objects.filter(shop=shop, tx_date=today, is_cancelled=False)
            inc = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or 0
            exp = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or 0
            net = inc - exp
            fmt_inc = f"{int(inc):,}".replace(",", " ")
            fmt_exp = f"{int(exp):,}".replace(",", " ")
            fmt_net = f"{int(net):,}".replace(",", " ")
            response_text = (
                f"📊 <b>{esc(shop.name)} — Bugungi Kassa ({today.strftime('%d.%m.%Y')})</b>\n\n"
                f"🟢 <b>Kirim:</b> {fmt_inc} so'm\n"
                f"🔴 <b>Chiqim:</b> {fmt_exp} so'm\n"
                f"💎 <b>Sof kassa:</b> {fmt_net} so'm\n\n"
                f"Batafsil ma'lumot do'kon moliya panelida."
            )
        else:
            response_text = "Kassa ma'lumotlari faqat adminlar uchun."
        _send_message(chat_id, response_text)

    elif text == '/taxi' or text.startswith('/taksi'):
        from couriers.taxi_service import get_telegram_taxi_markup
        response_text = (
            f"🚕 <b>Guliston Tezkor va Arzon Taksi Xizmatlari:</b>\n\n"
            f"Quyidagi xizmatlardan birini tanlab, 1-bosishda dispetcherga qo'ng'iroq qilishingiz mumkin 👇"
        )
        _send_message(chat_id, response_text, reply_markup=get_telegram_taxi_markup())

    elif text == '/location' or text.startswith('/manzil'):
        from notifications.services.print3d_notification_service import GULISTON_STUDIO_LAT, GULISTON_STUDIO_LON
        telegram_client.call('sendLocation', {
            "chat_id": chat_id, "latitude": GULISTON_STUDIO_LAT, "longitude": GULISTON_STUDIO_LON,
        })
        response_text = (
            f"📍 <b>Guliston 3D Studio & AR Center</b>\n"
            f"🏢 <b>Manzil:</b> Guliston shahar, Sayxun ko'chasi 14-uy\n"
            f"🎯 <b>Mo'ljal:</b> Sayxun bozorchasi yonida\n"
            f"🕒 <b>Ish vaqti:</b> Har kuni 09:00 dan 20:00 gacha\n"
            f"📞 <b>Telefon:</b> +998 90 123 45 67"
        )
        _send_message(chat_id, response_text)

    else:
        # Noma'lum xabar — javob berish
        response_text = "Buyruqlar: /menu — 3D Menyu, /order <raqam> — Buyurtma, /taxi — Taksi chaqirish, /location — Ustaxona manzili, /kassa — Kassa."

    # Xabarni saqlash
    is_command = text.startswith('/')
    command = text.split()[0] if is_command else ''
    BotMessage.objects.create(
        chat_id=str(chat_id),
        username=user.get('username', ''),
        first_name=user.get('first_name', ''),
        text=text,
        message_id=message_id,
        is_command=is_command,
        command=command,
        response=response_text,
    )

    return {'success': True}


def set_chat_menu_button(chat_id=None, base_url=None):
    """Telegram botning pastki chap burchagidagi doimiy Mini App (TMA) tugmasini o'rnatish."""
    if not telegram_client.get_token():
        return {'success': False, 'error': 'Bot token topilmadi'}
    if not base_url:
        base_url = getattr(settings, 'RESTAURANT_PUBLIC_URL', '')
    if not base_url:
        domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        base_url = f"{scheme}://{domain}"

    payload = {
        "menu_button": {
            "type": "web_app",
            "text": "🛍 Do'kon (Mini App)",
            "web_app": {
                "url": f"{base_url.rstrip('/')}/tma/"
            }
        }
    }
    if chat_id:
        payload["chat_id"] = chat_id

    result = telegram_client.call('setChatMenuButton', payload)
    return {'success': result.ok, 'error': result.error}
