"""
3D Printer xizmatlari uchun Telegram bildirishnomalari xizmati.
- Adminga yangi buyurtma kelganda mijoz ma'lumotlari, fayli va 5% keshbek hisobi bilan xabar berish.
- Mijozga mahsulot 3D printerda tayyor bo'lganda rasm, lokatsiya yoki dastavka hisobi bilan xabar yuborish.
"""
import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

GULISTON_STUDIO_LAT = 40.4897
GULISTON_STUDIO_LON = 68.7842
DEFAULT_STUDIO_ADDRESS = "Guliston shahar, Sayxun ko'chasi 14 (3D Studio & AR Center)"


def _get_bot_token():
    return getattr(settings, 'TELEGRAM_BOT_TOKEN', '')


def _get_admin_chat_ids():
    raw = getattr(settings, 'TELEGRAM_ADMIN_CHAT_IDS', '') or getattr(settings, 'TELEGRAM_CHAT_ID', '')
    ids = [i.strip() for i in str(raw).split(',') if i.strip()]
    return ids


def notify_admin_new_3d_order(order, request=None):
    """Yangi 3D printer buyurtmasi tushganda adminga Telegram orqali xabar berish."""
    token = _get_bot_token()
    admin_ids = _get_admin_chat_ids()
    if not token or not admin_ids:
        logger.warning("Telegram bot token yoki admin chat ID topilmadi.")
        return False

    item_name = order.product.title if order.product else (order.custom_title or "Maxsus 3D model")
    order_type_label = "Tayyor tovar (Katalogdan)" if order.product else "Maxsus zakaz (Mijoz dizayni)"
    delivery_label = f"Olib ketish ({order.pickup_location})" if order.delivery_type == 'pickup' else f"Dastavka: {order.delivery_address}"

    msg = (
        f"🖨️ <b>YANGI 3D PRINTER BUYURTMASI!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🔢 <b>Buyurtma №:</b> <code>{order.order_number}</code>\n"
        f"👤 <b>Mijoz:</b> {order.customer_name}\n"
        f"📞 <b>Telefon:</b> <code>{order.customer_phone}</code>\n"
        f"{f'💬 <b>Telegram:</b> @{order.telegram_username}' if order.telegram_username else ''}\n"
        f"🏷 <b>Turi:</b> {order_type_label}\n"
        f"📦 <b>Mahsulot:</b> {item_name}\n"
        f"🧵 <b>Material:</b> {order.material} | Rang: {order.color}\n"
        f"🔢 <b>Soni:</b> {order.quantity} dona\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"💰 <b>Boshlang'ich narx:</b> {int(order.base_amount):,} so'm\n"
        f"🎁 <b>5% Keshbek chegirmasi:</b> -{int(order.discount_amount):,} so'm\n"
        f"🚚 <b>Dastavka narxi:</b> {int(order.delivery_cost):,} so'm\n"
        f"💎 <b>YAKUNIY TO'LOV:</b> <b>{int(order.final_amount):,} so'm</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🚚 <b>Yetkazib berish:</b> {delivery_label}\n"
        f"📍 <b>Manba:</b> {order.source.upper()} ({'5% keshbek qo\'llandi' if order.has_cashback else 'oddiy'})\n"
    )

    dim_label = "🔍 O'lchamni usta/AI aniqlasin" if getattr(order, 'dimension_mode', 'auto_detect') == 'auto_detect' else "📏 Aniq o'lcham"
    ref_label = dict(getattr(order, 'REFERENCE_OBJECT_CHOICES', [])).get(getattr(order, 'reference_object', 'none'), 'Oddiy')
    msg += f"📐 <b>O'lchov:</b> {dim_label} (Etalon: {ref_label})\n"

    if order.custom_description:
        msg += f"📝 <b>Mijoz izohi:</b> <i>{order.custom_description}</i>\n"

    # Base URL ni aniqlash (fayl havolasi uchun)
    base_url = getattr(settings, 'SITE_URL', 'https://suggesting-cst-proudly-speakers.trycloudflare.com')
    if request:
        host = request.get_host()
        scheme = 'https' if request.is_secure() or 'trycloudflare' in host or 'ngrok' in host else 'http'
        base_url = f"{scheme}://{host}"

    if order.custom_file:
        file_url = f"{base_url.rstrip('/')}{order.custom_file.url}"
        msg += f"\n📎 <b>Yuklangan fayl/eskiz:</b> <a href=\"{file_url}\">Faylni yuklab olish / ko'rish</a>\n"

    if getattr(order, 'video_file', None):
        vid_url = f"{base_url.rstrip('/')}{order.video_file.url}"
        msg += f"🎥 <b>Yuklangan video:</b> <a href=\"{vid_url}\">Videoni ko'rish</a>\n"

    action_buttons = [
        [
            {"text": "📞 Qo'ng'iroq qilish", "url": f"tel:{order.customer_phone}"},
        ],
        [
            {"text": "⚙️ Chop etishga olindi", "callback_data": f"3d_status:printing:{order.id}"},
            {"text": "✅ Tayyor bo'ldi", "callback_data": f"3d_status:ready:{order.id}"},
        ]
    ]
    if order.telegram_username:
        action_buttons[0].append(
            {"text": "💬 Telegramdan yozish", "url": f"https://t.me/{order.telegram_username.lstrip('@')}"}
        )

    reply_markup = {"inline_keyboard": action_buttons}

    for admin_id in admin_ids:
        try:
            httpx.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": admin_id,
                    "text": msg,
                    "parse_mode": "HTML",
                    "reply_markup": reply_markup,
                },
                timeout=10,
            )
        except Exception as e:
            logger.error(f"Adminga 3D order xabar yuborishda xatolik ({admin_id}): {e}")

    return True


def notify_customer_3d_order_ready(order, request=None):
    """3D Printerda buyurtma tayyor bo'lganda mijozga Telegram orqali xabar, rasm va lokatsiya yuborish."""
    token = _get_bot_token()
    if not token or not order.telegram_chat_id:
        logger.info(f"Mijozda telegram_chat_id mavjud emas ({order.order_number})")
        return False

    item_name = order.product.title if order.product else (order.custom_title or "3D buyumingiz")
    chat_id = order.telegram_chat_id

    # 1. Asosiy tabrik va ma'lumot xabari
    msg = (
        f"🎉 <b>Xushxabar, hurmatli {order.customer_name}!</b>\n\n"
        f"Sizning <b>#{order.order_number}</b> raqamli 3D printer buyurtmangiz muvaffaqiyatli chop etildi va <b>TAYYOR BO'LDI!</b> ✅\n\n"
        f"📦 <b>Mahsulot:</b> {item_name}\n"
        f"🧵 <b>Material:</b> {order.material} ({order.color})\n"
        f"🔢 <b>Miqdori:</b> {order.quantity} dona\n"
        f"💰 <b>To'lov summasi (5% keshbek bilan):</b> <b>{int(order.final_amount):,} so'm</b>\n\n"
    )

    if order.delivery_type == 'pickup':
        msg += (
            f"📍 <b>Olib ketish manzili:</b>\n"
            f"{order.pickup_location or DEFAULT_STUDIO_ADDRESS}\n\n"
            f"🕒 <b>Ish vaqti:</b> Har kuni 09:00 dan 20:00 gacha.\n"
            f"Marhamat, buyurtmangizni olib ketishingiz mumkin! Quyidagi tugma orqali ustaxonamiz lokatsiyasini olishingiz mumkin 👇"
        )
    elif order.delivery_type == 'taxi':
        msg += (
            f"🚕 <b>Taksi orqali yetkazish (Taxi Plus / Yandex Go):</b>\n"
            f"Yetkazish manzili: <i>{order.delivery_address or 'Guliston'}</i>\n"
            f"Yo'lkira to'g'ridan-to'g'ri taksi haydovchisiga to'lanadi.\n"
            f"Taksi chaqirish yoki usta bilan bog'lanish uchun quyidagi tugmalardan foydalaning 👇"
        )
    else:
        delivery_fee = int(order.delivery_cost or 12000)
        msg += (
            f"🚚 <b>Yetkazib berish xizmati:</b>\n"
            f"Yetkazish manzili: <i>{order.delivery_address}</i>\n"
            f"Yetkazish narxi: <b>{delivery_fee:,} so'm</b>\n\n"
            f"Buyurtmangiz tez orada yetkazib beriladi! 🚗💨"
        )

    # Base URL ni aniqlash
    base_url = getattr(settings, 'SITE_URL', 'https://suggesting-cst-proudly-speakers.trycloudflare.com')
    if request:
        host = request.get_host()
        scheme = 'https' if request.is_secure() or 'trycloudflare' in host or 'ngrok' in host else 'http'
        base_url = f"{scheme}://{host}"

    # 2. Agar tayyor mahsulot rasmi bo'lsa, avval rasmni yuboramiz
    if order.finished_photo:
        photo_url = f"{base_url.rstrip('/')}{order.finished_photo.url}"
        try:
            httpx.post(
                f"https://api.telegram.org/bot{token}/sendPhoto",
                json={
                    "chat_id": chat_id,
                    "photo": photo_url,
                    "caption": f"📸 #{order.order_number} — Sizning tayyor 3D mahsulotingiz ko'rinishi!",
                },
                timeout=10,
            )
        except Exception as e:
            logger.warning(f"Mijozga tayyor rasm yuborishda xato: {e}")

    # Mijoz uchun interaktiv tugmalar
    customer_buttons = [
        [
            {"text": "📍 Ustaxona Lokatsiyasini olish", "callback_data": f"3d_get_loc:{order.id}"},
        ],
        [
            {"text": "🚕 Taksi chaqirish (Taxi Plus / Yandex)", "callback_data": "taxi_call"},
        ],
        [
            {"text": "👨‍🔧 Usta bilan bog'lanish", "url": "https://t.me/Guliston3DStudio"},
        ]
    ]

    # 3. Matnli xabar yuborish
    try:
        httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": msg,
                "parse_mode": "HTML",
                "reply_markup": {"inline_keyboard": customer_buttons},
            },
            timeout=10,
        )
    except Exception as e:
        logger.error(f"Mijozga tayyorlik matnini yuborishda xato: {e}")

    # 4. Agar olib ketish bo'lsa, lokatsiyani darhol ham yuboramiz
    if order.delivery_type == 'pickup':
        try:
            httpx.post(
                f"https://api.telegram.org/bot{token}/sendLocation",
                json={
                    "chat_id": chat_id,
                    "latitude": GULISTON_STUDIO_LAT,
                    "longitude": GULISTON_STUDIO_LON,
                },
                timeout=10,
            )
        except Exception as e:
            logger.warning(f"Lokatsiya yuborishda xato: {e}")

    order.ready_notification_sent = True
    order.save(update_fields=['ready_notification_sent'])
    return True


def check_and_send_master_reminders():
    """
    Usta buyurtmani unutib qo'ymasligi uchun qat'iy hisobot tekshiruvi.
    Yangi yoki kutilayotgan buyurtmalar bo'yicha ustadan hisobot va holatni so'raydi.
    """
    from datetime import timedelta
    from django.utils import timezone
    from ar3d.models import Print3DOrder

    token = _get_bot_token()
    admin_ids = _get_admin_chat_ids()
    if not token or not admin_ids:
        return 0

    now = timezone.now()
    two_hours_ago = now - timedelta(hours=2)

    # 2 soatdan oshgan va hali tayyor bo'lmagan buyurtmalar
    pending_orders = Print3DOrder.objects.filter(
        status__in=['new', 'confirmed'],
        created_at__lte=two_hours_ago
    )

    sent_count = 0
    for order in pending_orders:
        # Agar so'nggi 2 soat ichida eslatma yuborilmagan bo'lsa
        if order.last_status_reminder_at and (now - order.last_status_reminder_at) < timedelta(hours=2):
            continue

        item_name = order.product.title if order.product else (order.custom_title or "3D buyum")
        reminder_text = (
            f"⚠️ <b>USTA UCHUN QAT'IY HISOBOT ESLATMASI!</b>\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"Buyurtma: <b>#{order.order_number}</b> ({item_name})\n"
            f"Mijoz: <b>{order.customer_name}</b> ({order.customer_phone})\n"
            f"Vaqt: {order.created_at.strftime('%d.%m.%Y %H:%M')}\n\n"
            f"Mijoz buyurtma bo'yicha yangilik kutmoqda! Iltimos, joriy holatni yangilang 👇"
        )
        markup = {
            "inline_keyboard": [
                [
                    {"text": "⚙️ Chop etilmoqda", "callback_data": f"3d_status:printing:{order.id}"},
                    {"text": "✅ Tayyor bo'ldi", "callback_data": f"3d_status:ready:{order.id}"},
                ],
                [
                    {"text": "📞 Mijozga qo'ng'iroq", "url": f"tel:{order.customer_phone}"},
                ]
            ]
        }

        for admin_id in admin_ids:
            try:
                httpx.post(
                    f"https://api.telegram.org/bot{token}/sendMessage",
                    json={
                        "chat_id": admin_id,
                        "text": reminder_text,
                        "parse_mode": "HTML",
                        "reply_markup": markup,
                    },
                    timeout=10,
                )
            except Exception as e:
                logger.error(f"Usta eslatmasi yuborishda xato: {e}")

        order.last_status_reminder_at = now
        order.save(update_fields=['last_status_reminder_at'])
        sent_count += 1

    return sent_count
