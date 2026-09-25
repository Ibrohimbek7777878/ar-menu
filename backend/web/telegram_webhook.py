"""
Telegram Bot Webhook — chat_id avtomatik saqlash (obunachi bazasiga).

Botga /start yoki istalgan xabar yozganda:
  • TelegramSubscriber yaratiladi (keyinroq yangi mahsulot xabarlari uchun).
  • /start → xush kelibsiz xabari.
  • /id → chat_id ni qaytaradi.
"""
import json
import httpx

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

from notifications.models import TelegramSubscriber
from notifications.telegram_bot import send_message
from notifications.admin_bot import handle_admin_command


def get_base_url_from_request(request):
    """
    So'rov kelgan public host va scheme ni dinamik aniqlash.
    Telegram webhook orqali kelganda doim Cloudflare / Ngrok ning joriy aktiv HTTPS domenini beradi.
    """
    req_host = request.get_host()
    if req_host and '127.0.0.1' not in req_host and 'localhost' not in req_host:
        is_secure = (
            request.is_secure()
            or 'trycloudflare.com' in req_host
            or 'ngrok' in req_host
            or request.headers.get('x-forwarded-proto') == 'https'
        )
        scheme = 'https' if is_secure else 'http'
        return f"{scheme}://{req_host}".rstrip('/')

    site_url = getattr(settings, 'SITE_URL', '').rstrip('/')
    if site_url.startswith('http://') or site_url.startswith('https://'):
        return site_url

    domain = getattr(settings, 'PUBLIC_DOMAIN', '127.0.0.1:8000').strip('/')
    if domain.startswith('http://') or domain.startswith('https://'):
        return domain

    scheme = 'http' if '127.0.0.1' in domain or 'localhost' in domain else 'https'
    return f"{scheme}://{domain}".rstrip('/')


def get_menu_markup(base_url):
    """Telegram Mini App va 3D/AR tugmalari bilan interaktiv markup yaratish."""
    is_https = base_url.startswith('https://')
    tma_btn = {"web_app": {"url": f"{base_url}/tma/"}} if is_https else {"url": f"{base_url}/tma/"}
    ar_btn = {"web_app": {"url": f"{base_url}/ar/"}} if is_https else {"url": f"{base_url}/ar/"}
    print_btn = {"web_app": {"url": f"{base_url}/3d-print/?ref=nfc_qr"}} if is_https else {"url": f"{base_url}/3d-print/?ref=nfc_qr"}
    orders_btn = {"web_app": {"url": f"{base_url}/tma/orders/"}} if is_https else {"url": f"{base_url}/tma/orders/"}
    catalog_btn = {"web_app": {"url": f"{base_url}/tma/catalog/"}} if is_https else {"url": f"{base_url}/tma/catalog/"}

    return {
        "inline_keyboard": [
            [
                {"text": "🛍 Do'kon (Mini App)", **tma_btn},
                {"text": "🥽 3D / AR Menyu", **ar_btn},
            ],
            [
                {"text": "🖨️ 3D Printer Xizmati (5% Keshbek)", **print_btn},
            ],
            [
                {"text": "📦 Mening buyurtmalarim", **orders_btn},
                {"text": "🔍 Katalog va Qidiruv", **catalog_btn},
            ]
        ]
    }


@csrf_exempt
@require_POST
def telegram_webhook(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': True})

    callback_query = data.get('callback_query')
    if callback_query:
        cq_id = callback_query.get('id')
        from_user = callback_query.get('from', {})
        chat_id = str(from_user.get('id', ''))
        username = from_user.get('username', '')
        first_name = from_user.get('first_name', '')
        text = callback_query.get('data', '')
        try:
            httpx.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                json={"callback_query_id": cq_id},
                timeout=5,
            )
        except Exception:
            pass
    else:
        message = data.get('message') or data.get('channel_post') or {}
        chat = message.get('chat', {})
        from_user = message.get('from', {})
        chat_id = str(chat.get('id', ''))
        username = chat.get('username') or from_user.get('username', '')
        first_name = chat.get('first_name') or from_user.get('first_name', '')
        text = message.get('text', '')

    if not chat_id:
        return JsonResponse({'ok': True})

    # Obunachini bazaga saqlash
    sub, _ = TelegramSubscriber.objects.get_or_create(
        chat_id=chat_id,
        defaults={'username': username, 'first_name': first_name},
    )
    if not sub.is_active:
        sub.is_active = True
        sub.save(update_fields=['is_active'])
    if sub.username != username or sub.first_name != first_name:
        sub.username = username
        sub.first_name = first_name
        sub.save(update_fields=['username', 'first_name'])

    # Admin buyruqlari (/admin, /panel, /stats, /orders) — admin bo'lmasa ham javob qaytaradi
    if handle_admin_command(text, chat_id, username):
        return JsonResponse({'ok': True})

    # Dinamik base_url va tugmalar
    base_url = get_base_url_from_request(request)
    markup = get_menu_markup(base_url)

    text_clean = (text or '').strip()

    if text_clean in ('/start', '/menu', 'menu', 'Do\'kon', "do'kon", 'boshlash', 'start'):
        welcome = (
            f"Assalomu alaykum, <b>{first_name or 'qadrli mijoz'}</b>! 👋\n\n"
            f"🏪 <b>Online Store Guliston & AR Menu</b> rasmiy Telegram Mini App botiga xush kelibsiz!\n\n"
            f"Bu yerda siz:\n"
            f"• 28 xil yo'nalishdagi do'konlar va xizmatlardan qulay xarid qilishingiz\n"
            f"• 3D va AR (Augmented Reality) da taom va tovarlarni ko'rishingiz\n"
            f"• 🖨️ <b>3D Printer xizmati</b> orqali istalgan buyumni 5% keshbek bilan buyurtma berishingiz mumkin!\n\n"
            f"Quyidagi tugmani bosing va xaridni boshlang 👇"
        )
        send_message(chat_id, welcome, reply_markup=markup)

    elif text_clean.startswith('/start 3d') or text_clean in ('/3d', '3d', '3dprint', '3d printer', 'printer'):
        welcome_3d = (
            f"Assalomu alaykum, <b>{first_name or 'qadrli mijoz'}</b>! 👋\n\n"
            f"🖨️ <b>Online Store Guliston — 3D Printer Studiyasi</b>ga xush kelibsiz!\n\n"
            f"🎉 <b>NFC & QR Maxsus Aksiya:</b> Sizga barcha 3D printer buyurtmalari uchun <b>5% KESHBEK / CHEGIRMA</b> biriktirildi!\n\n"
            f"Biz bilan:\n"
            f"• Sevimli personaj figuralari va suvenirlar\n"
            f"• Telefon, planshet va gadjet stendlari\n"
            f"• Avtomobil va maishiy texnika ehtiyot qismlarini buyurtma qilishingiz mumkin.\n\n"
            f"Mahsulotingiz tayyor bo'lgach, botimiz sizga rasmini va lokatsiyasini yuboradi! 👇"
        )
        send_message(chat_id, welcome_3d, reply_markup=markup)

    elif text_clean == '/id':
        send_message(
            chat_id,
            f"Sizning Chat ID: <code>{chat_id}</code>\nUsername: @{username}",
        )

    elif text_clean == '/kassa' or text_clean.startswith('/kassa'):
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
        send_message(chat_id, response_text)

    elif text_clean.startswith('/order'):
        parts = text_clean.split()
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
            send_message(chat_id, response_text)

    else:
        # Har qanday boshqa matn, salomlashuv yoki savol uchun qulay menyu va yordamchi javob
        reply = (
            f"Assalomu alaykum, <b>{first_name or 'hurmatli mijoz'}</b>! 😊\n\n"
            f"🏪 <b>Online Store Guliston</b> xizmatlaridan foydalanish uchun quyidagi tugmalardan birini tanlang:\n\n"
            f"• <b>🛍 Do'konni ochish</b> — barcha tovarlar va Mini App\n"
            f"• <b>🥽 3D / AR Menyu</b> — taom va mahsulotlarni 3D ko'rish\n"
            f"• <b>📦 Mening buyurtmalarim</b> — buyurtma holati\n\n"
            f"Kerakli bo'limni tanlang 👇"
        )
        send_message(chat_id, reply, reply_markup=markup)

    return JsonResponse({'ok': True})


def telegram_set_chat_id(request):
    """GET: Barcha obunachilarni ko'rish."""
    subs = TelegramSubscriber.objects.filter(is_active=True).values('chat_id', 'username', 'first_name')
    return JsonResponse({'subscribers': list(subs)})


@csrf_exempt
def telegram_send_test(request):
    """POST: {chat_id, text} — test xabar."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST kerak'}, status=400)
    try:
        data = json.loads(request.body)
        chat_id = data.get('chat_id')
        text = data.get('text', 'Test xabar ✅')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON xato'}, status=400)
    if not chat_id:
        return JsonResponse({'error': 'chat_id kerak'}, status=400)
    ok = send_message(chat_id, text)
    return JsonResponse({'success': ok})
