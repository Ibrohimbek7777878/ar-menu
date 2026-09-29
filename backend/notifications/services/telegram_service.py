"""
Telegram bildirishnoma xizmati.
Telegram Bot API orqali buyurtma holatini xabar berish.
"""
import httpx
from django.conf import settings
from notifications.models import NotificationLog

TELEGRAM_BOT_TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = getattr(settings, 'TELEGRAM_CHAT_ID', '')
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def _send_message(chat_id, text, parse_mode='HTML', reply_markup=None):
    """Telegram'ga xabar yuborish."""
    if not TELEGRAM_BOT_TOKEN:
        return {'success': False, 'error': 'Bot token topilmadi'}
    if not chat_id:
        return {'success': False, 'error': 'Chat ID kiritilmagan'}

    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode,
    }
    if reply_markup:
        payload['reply_markup'] = reply_markup

    try:
        resp = httpx.post(
            f"{TELEGRAM_API_URL}/sendMessage",
            json=payload,
            timeout=10,
        )
        data = resp.json()
        return {'success': data.get('ok', False), 'error': data.get('description', '')}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_chat_id_from_username(username):
    """Botga yozgan foydalanuvchining chat_id'sini olish."""
    try:
        resp = httpx.get(
            f"{TELEGRAM_API_URL}/getUpdates",
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


def send_order_created(order):
    """Yangi buyurtma yaratilganda xabar — guruh + mijozga."""
    items_text = "\n".join([
        f"  • {item.product_name} x{item.quantity} — {int(item.total):,} so'm"
        for item in order.items.all()
    ])

    order_link = f"http://127.0.0.1:8000/seller/orders/{order.pk}/"

    table_text = ""
    if hasattr(order, 'table') and order.table:
        table_text = f"🍽 <b>STOL:</b> №{order.table.number}"
        if order.table.hall:
            table_text += f" ({order.table.hall.name})"
        table_text += "\n"

    text = (
        f"🛒 <b>Yangi buyurtma!</b>\n\n"
        f"📦 #{order.order_number}\n"
        f"{table_text}"
        f"👤 {order.customer_name}\n"
        f"📞 {order.customer_phone_1}\n"
        f"📍 {order.delivery_address or 'Ko\'rsatilmagan'}\n\n"
        f"🛍 <b>Mahsulotlar:</b>\n{items_text}\n\n"
        f"💰 Jami: {int(order.total_amount):,} so'm\n"
        f"🚗 Yetkazish: {int(order.delivery_fee):,} so'm\n"
        f"💳 Umumiy: {int(order.final_amount):,} so'm\n\n"
        f"🔗 <a href=\"{order_link}\">Buyurtmani ko'rish</a>"
    )

    # Guruhga yuborish
    results = []
    if TELEGRAM_CHAT_ID:
        try:
            from notifications.admin_bot import build_order_keyboard
            reply_markup = build_order_keyboard(order)
        except Exception:
            reply_markup = None
        result = _send_message(TELEGRAM_CHAT_ID, text, reply_markup=reply_markup)
        results.append(result)
        NotificationLog.objects.create(
            order=order, type='telegram', recipient=TELEGRAM_CHAT_ID,
            message=text, success=result['success'], error_message=result.get('error', ''),
        )

    # Mijozga alohida xabar
    if order.customer and order.customer.telegram_chat_id:
        customer_text = (
            f"Salom, <b>{order.customer_name}</b>! 👋\n\n"
            f"Buyurtmangiz qabul qilindi!\n"
            f"📦 #{order.order_number}\n"
            f"💰 Umumiy: {int(order.final_amount):,} so'm\n\n"
            f"Tez orada tasdiqlanadi!"
        )
        result = _send_message(order.customer.telegram_chat_id, customer_text)
        results.append(result)

    return results[0] if results else {'success': False, 'error': 'Chat ID yo\'q'}


def send_table_reservation_alert(reservation):
    """Yangi stol broni haqida Telegram guruh va ofitsiantlarga bildirishnoma yuborish."""
    tbl_str = f"№{reservation.table.number}" if reservation.table else "Joyida beriladi"
    hall_str = reservation.hall.name if reservation.hall else (reservation.table.hall.name if reservation.table and reservation.table.hall else "Asosiy zal")
    
    text = (
        f"📅 <b>YANGI STOL BRONI QABUL QILINDI!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🍽 <b>Restoran:</b> {reservation.shop.name}\n"
        f"👤 <b>Mehmon:</b> {reservation.customer_name}\n"
        f"📞 <b>Telefon:</b> {reservation.customer_phone}\n"
        f"👥 <b>Mehmonlar soni:</b> {reservation.guests_count} kishi\n"
        f"📆 <b>Sana:</b> {reservation.reservation_date.strftime('%d.%m.%Y')}\n"
        f"⏰ <b>Vaqt:</b> {reservation.reservation_time.strftime('%H:%M')}\n"
        f"🏢 <b>Zal:</b> {hall_str}\n"
        f"📍 <b>Stol:</b> {tbl_str}\n"
        f"📝 <b>Izoh:</b> <i>{reservation.notes or 'Qo\'shimcha talab yo\'q'}</i>\n\n"
        f"👉 <i>Ofitsiant/Kassir paneli orqali tasdiqlang.</i>"
    )

    if TELEGRAM_CHAT_ID:
        return _send_message(TELEGRAM_CHAT_ID, text)
    return {'success': False, 'error': 'Chat ID sozlanmagan'}


def send_status_updated(order, old_status, new_status):
    """Buyurtma holati o'zgarganda xabar — guruh + mijozga."""
    STATUS_EMOJI = {
        'pending': '⏳', 'confirmed': '✅', 'preparing': '👨‍🍳',
        'ready': '📦', 'out_for_delivery': '🚗', 'delivered': '🎉', 'cancelled': '❌',
    }
    STATUS_TEXT = {
        'pending': 'Kutilmoqda', 'confirmed': 'Tasdiqlangan',
        'preparing': 'Tayyorlanmoqda', 'ready': 'Tayyor — olib ketish',
        'out_for_delivery': "Yo'lda", 'delivered': 'Yetkazildi', 'cancelled': 'Bekor qilindi',
    }

    emoji = STATUS_EMOJI.get(new_status, '📋')
    status_text = STATUS_TEXT.get(new_status, new_status)
    order_link = f"http://127.0.0.1:8000/seller/orders/{order.pk}/"

    # Guruh uchun
    text = (
        f"{emoji} <b>Buyurtma holati o'zgardi!</b>\n\n"
        f"📦 #{order.order_number}\n"
        f"👤 {order.customer_name}\n\n"
        f"🔄 {STATUS_TEXT.get(old_status, old_status)} → <b>{status_text}</b>"
    )
    if new_status == 'out_for_delivery' and order.courier:
        text += f"\n🚗 Kuryer: {order.courier.name}"
    elif new_status == 'delivered':
        text += f"\n⏰ Yetkazildi: {order.delivered_at.strftime('%H:%M') if order.delivered_at else 'N/A'}"
    text += f"\n\n🔗 <a href=\"{order_link}\">Buyurtmani ko'rish</a>"

    results = []
    if TELEGRAM_CHAT_ID:
        result = _send_message(TELEGRAM_CHAT_ID, text)
        results.append(result)
        NotificationLog.objects.create(
            order=order, type='telegram', recipient=TELEGRAM_CHAT_ID,
            message=text, success=result['success'], error_message=result.get('error', ''),
        )

    # Mijozga alohida xabar
    if order.customer and order.customer.telegram_chat_id:
        customer_emoji = STATUS_EMOJI.get(new_status, '📋')
        customer_text = (
            f"{customer_emoji} <b>Buyurtma #{order.order_number}</b>\n\n"
            f"Holat: <b>{status_text}</b>"
        )
        if new_status == 'out_for_delivery' and order.courier:
            customer_text += f"\n🚗 Kuryer: {order.courier.name}"
        elif new_status == 'delivered':
            customer_text += f"\n✅ Yetkazildi!"
        elif new_status == 'cancelled':
            customer_text += f"\n❌ Bekor qilindi"

        result = _send_message(order.customer.telegram_chat_id, customer_text)
        results.append(result)

    return results[0] if results else {'success': False, 'error': 'Chat ID yo\'q'}


def send_courier_assigned(order):
    """Kuryer biriktirilganda xabar — guruh + mijozga."""
    text = (
        f"🚗 <b>Kuryer biriktirildi!</b>\n\n"
        f"📦 #{order.order_number}\n"
        f"👤 {order.customer_name}\n"
        f"📍 {order.delivery_address or 'Ko\'rsatilmagan'}\n\n"
        f"🧑 Kuryer: {order.courier.name if order.courier else 'N/A'}\n"
        f"📞 Tel: {order.courier.phone if order.courier else 'N/A'}"
    )

    results = []
    if TELEGRAM_CHAT_ID:
        result = _send_message(TELEGRAM_CHAT_ID, text)
        results.append(result)
        NotificationLog.objects.create(
            order=order, type='telegram', recipient=TELEGRAM_CHAT_ID,
            message=text, success=result['success'], error_message=result.get('error', ''),
        )

    # Mijozga
    if order.customer and order.customer.telegram_chat_id:
        customer_text = (
            f"🚗 <b>Buyurtma #{order.order_number}</b>\n\n"
            f"Kuryer yo'lda! 🚚\n"
            f"🧑 {order.courier.name if order.courier else 'N/A'}\n"
            f"📞 {order.courier.phone if order.courier else 'N/A'}"
        )
        result = _send_message(order.customer.telegram_chat_id, customer_text)
        results.append(result)

    return results[0] if results else {'success': False, 'error': 'Chat ID yo\'q'}


def send_order_delivered(order):
    """Buyurtma yetkazilganda xabar — guruh + mijozga."""
    text = (
        f"🎉 <b>Buyurtma yetkazildi!</b>\n\n"
        f"📦 #{order.order_number}\n"
        f"👤 {order.customer_name}\n"
        f"💰 Summa: {int(order.final_amount):,} so'm\n"
        f"⏰ Vaqt: {order.delivered_at.strftime('%H:%M') if order.delivered_at else 'N/A'}"
    )

    results = []
    if TELEGRAM_CHAT_ID:
        result = _send_message(TELEGRAM_CHAT_ID, text)
        results.append(result)
        NotificationLog.objects.create(
            order=order, type='telegram', recipient=TELEGRAM_CHAT_ID,
            message=text, success=result['success'], error_message=result.get('error', ''),
        )

    # Mijozga
    if order.customer and order.customer.telegram_chat_id:
        customer_text = (
            f"🎉 <b>Buyurtma yetkazildi!</b>\n\n"
            f"📦 #{order.order_number}\n"
            f"💰 {int(order.final_amount):,} so'm\n\n"
            f"Rahmat! 🙏"
        )
        result = _send_message(order.customer.telegram_chat_id, customer_text)
        results.append(result)

    return results[0] if results else {'success': False, 'error': 'Chat ID yo\'q'}


def send_order_cancelled(order, reason=''):
    """Buyurtma bekor qilinganda xabar."""
    text = (
        f"❌ <b>Buyurtma bekor qilindi!</b>\n\n"
        f"📦 #{order.order_number}\n"
        f"👤 {order.customer_name}\n"
        f"💰 Summa: {int(order.final_amount):,} so'm"
    )
    if reason:
        text += f"\n📝 Sabab: {reason}"

    chat_id = TELEGRAM_CHAT_ID
    result = _send_message(chat_id, text)

    NotificationLog.objects.create(
        order=order,
        type='telegram',
        recipient=chat_id or 'N/A',
        message=text,
        success=result['success'],
        error_message=result.get('error', ''),
    )
    return result


def send_stock_warning(product, current_stock):
    """Ombor kamayganda xabar."""
    text = (
        f"⚠️ <b>Ombor kamaydi!</b>\n\n"
        f"📦 {product.name}\n"
        f"📊 Qoldiq: {current_stock} dona\n"
        f"🏪 Do'kon: {product.shop.name}"
    )

    result = _send_message(TELEGRAM_CHAT_ID, text)
    NotificationLog.objects.create(
        type='telegram',
        recipient=TELEGRAM_CHAT_ID or 'N/A',
        message=text,
        success=result['success'],
        error_message=result.get('error', ''),
    )
    return result


def send_daily_report(orders_today, revenue_today):
    """Kunlik hisobot."""
    text = (
        f"📊 <b>Kunlik hisobot</b>\n\n"
        f"📦 Buyurtmalar: {orders_today}\n"
        f"💰 Daromad: {int(revenue_today):,} so'm\n"
        f"📅 Sana: {timezone.now().strftime('%d.%m.%Y')}"
    )

    result = _send_message(TELEGRAM_CHAT_ID, text)
    return result


def send_new_review(review):
    """Yangi sharh kelganda xabar."""
    text = (
        f"⭐ <b>Yangi sharh!</b>\n\n"
        f"📦 {review.product.name if review.product else 'N/A'}\n"
        f"👤 {review.customer_name}\n"
        f"⭐ {review.rating}/5\n"
        f"💬 {review.comment[:100] if review.comment else 'Yoq'}"
    )

    result = _send_message(TELEGRAM_CHAT_ID, text)
    return result


def send_table_service_call(shop, table, service_type, note=''):
    """
    Stoldan ofitsiant chaqirish yoki xizmat so'rash bildirishnomasi.
    service_type: 'waiter' (Ofitsiant), 'tea' (Choy), 'bread' (Non), 'bill' (Hisob/Chek)
    """
    from django.utils import timezone
    SERVICE_INFO = {
        'waiter': ("🔔 OFITSIANT CHAQIRUVI!", "Mijoz ofitsiantni chaqirmoqda."),
        'tea': ("🫖 CHOY YANGILASH!", "Mijoz choy yangilashni so'ramoqda."),
        'bread': ("🍞 ISSIQ NON!", "Mijoz issiq non keltirishni so'ramoqda."),
        'bill': ("🧾 HISOB (CHEK) SO'ROVI!", "Mijoz hisob-kitob qilishni so'ramoqda."),
    }
    title, desc = SERVICE_INFO.get(service_type, ("🔔 XIZMAT CHAQIRUVI!", "Mijoz xizmat so'ramoqda."))
    table_str = f"Stol №{table.number}" if table else "Noma'lum stol"
    hall_str = f" ({table.hall.name})" if table and getattr(table, 'hall', None) else ""
    shop_name = shop.name if shop else "Muassasa"

    text = (
        f"<b>{title}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🍽 <b>Joy:</b> {table_str}{hall_str}\n"
        f"🏪 <b>Muassasa:</b> {shop_name}\n"
        f"📝 <b>Holat:</b> {desc}\n"
    )
    if note:
        text += f"💬 <b>Izoh:</b> {note}\n"
    text += f"⏰ <b>Vaqt:</b> {timezone.now().strftime('%H:%M:%S')}\n"
    text += f"━━━━━━━━━━━━━━━━━━━\n"
    text += f"<i>Iltimos, kechiktirmasdan xizmat ko'rsating!</i>"

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

    # Standart guruh chat_id
    if TELEGRAM_CHAT_ID and str(TELEGRAM_CHAT_ID) not in target_chat_ids:
        target_chat_ids.append(str(TELEGRAM_CHAT_ID))

    results = []
    for cid in target_chat_ids:
        r = _send_message(cid, text)
        results.append(r)
        NotificationLog.objects.create(
            type='telegram',
            recipient=cid,
            message=text,
            success=r.get('success', False),
            error_message=r.get('error', ''),
        )

    return results[0] if results else {'success': False, 'error': 'Chat ID topilmadi'}


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
        try:
            httpx.post(f"{TELEGRAM_API_URL}/answerCallbackQuery", json={"callback_query_id": cb_id}, timeout=5)
        except Exception:
            pass

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
                        _send_message(cb_chat_id, f"⚙️ Buyurtma <b>#{order.order_number}</b> holati <b>'Chop etilmoqda'</b> ga o'zgartirildi!")
                        if order.telegram_chat_id:
                            _send_message(
                                order.telegram_chat_id,
                                f"⚙️ <b>Xushxabar, {order.customer_name}!</b>\n\n"
                                f"Sizning <b>#{order.order_number}</b> raqamli 3D printer buyurtmangiz hozirda usta tomonidan 3D printerda chop etilishni boshladi! 🚀\n\n"
                                f"Tayyor bo'lishi bilan sizga fotosurat va lokatsiya yuboramiz."
                            )
                    elif new_status == 'ready':
                        notify_customer_3d_order_ready(order)
                        _send_message(cb_chat_id, f"✅ Buyurtma <b>#{order.order_number}</b> 'TAYYOR' deb belgilandi va mijozga rasm/lokatsiya yuborildi!")
            return {'success': True}

        # Mijoz ustaxona lokatsiyasini so'raganda
        elif cb_data.startswith('3d_get_loc'):
            from notifications.services.print3d_notification_service import GULISTON_STUDIO_LAT, GULISTON_STUDIO_LON
            try:
                httpx.post(
                    f"{TELEGRAM_API_URL}/sendLocation",
                    json={
                        "chat_id": cb_chat_id,
                        "latitude": GULISTON_STUDIO_LAT,
                        "longitude": GULISTON_STUDIO_LON,
                    },
                    timeout=10,
                )
            except Exception:
                pass
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
            try:
                order = Order.objects.get(order_number=order_number)
                status_text = dict(Order.STATUS_CHOICES).get(order.status, order.status)
                response_text = (
                    f"📦 #{order.order_number}\n"
                    f"👤 {order.customer_name}\n"
                    f"💰 {int(order.final_amount):,} so'm\n"
                    f"📊 Holat: {status_text}"
                )
            except Order.DoesNotExist:
                response_text = "Buyurtma topilmadi"
            _send_message(chat_id, response_text)

    elif text == '/start':
        from django.conf import settings
        domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000')
        scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
        base_url = f"{scheme}://{domain}"

        welcome = (
            f"Assalomu alaykum, <b>{user.get('first_name', 'qadrli mijoz')}</b>! 👋\n\n"
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
                f"🍽 <b>{shop.name} — 3D/AR Menyu</b>\n\n"
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
        from shops.models import Shop
        from finance.models import FinanceTransaction
        from django.utils import timezone
        from django.db.models import Sum
        today = timezone.localdate()
        shop = Shop.objects.first()
        if shop:
            tx_today = FinanceTransaction.objects.filter(shop=shop, tx_date=today, is_cancelled=False)
            inc = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or 0
            exp = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or 0
            net = inc - exp
            fmt_inc = f"{int(inc):,}".replace(",", " ")
            fmt_exp = f"{int(exp):,}".replace(",", " ")
            fmt_net = f"{int(net):,}".replace(",", " ")
            response_text = (
                f"📊 <b>{shop.name} — Bugungi Kassa ({today.strftime('%d.%m.%Y')})</b>\n\n"
                f"🟢 <b>Kirim:</b> {fmt_inc} so'm\n"
                f"🔴 <b>Chiqim:</b> {fmt_exp} so'm\n"
                f"💎 <b>Sof kassa:</b> {fmt_net} so'm\n\n"
                f"Batafsil ma'lumot do'kon moliya panelida."
            )
        else:
            response_text = "Kassa ma'lumotlari topilmadi."
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
        try:
            httpx.post(
                f"{TELEGRAM_API_URL}/sendLocation",
                json={
                    "chat_id": chat_id,
                    "latitude": GULISTON_STUDIO_LAT,
                    "longitude": GULISTON_STUDIO_LON,
                },
                timeout=10,
            )
        except Exception:
            pass
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
    if not TELEGRAM_BOT_TOKEN:
        return {'success': False, 'error': 'Bot token topilmadi'}
    if not base_url:
        from django.conf import settings
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

    try:
        resp = httpx.post(
            f"{TELEGRAM_API_URL}/setChatMenuButton",
            json=payload,
            timeout=10,
        )
        data = resp.json()
        return {'success': data.get('ok', False), 'result': data}
    except Exception as e:
        return {'success': False, 'error': str(e)}

