"""
Telegram Bot Webhook — Restoran 3D AR menyusi va Biznes egasi stollar nazorati tizimi.
TZ: TZ_BOT_VA_STOLLAR_TIZIMI.md
"""
import json
import httpx

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

from notifications.models import TelegramSubscriber, BotMessage
from notifications.telegram_bot import send_message, edit_message_text, answer_callback_query
from notifications.admin_bot import (
    handle_admin_command,
    handle_table_callback,
    is_admin,
    get_restaurant_shop,
    build_tables_monitoring_text,
    build_tables_keyboard,
)


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


def get_menu_markup(base_url, is_user_admin=False, shop=None, table_number=None):
    """
    Mehmonlar va mijozlar uchun 3D Restoran, 3D Printer Studio, Online Do'kon va Stol tugmalari.
    Biznes egasi (admin) uchun stollar nazorati tugmasi.
    """
    is_https = base_url.startswith('https://')
    tma_url = f"{base_url}/restaurant/"
    if table_number:
        tma_url += f"?table={table_number}"
    orders_url = f"{base_url}/restaurant/table/"
    if table_number:
        orders_url += f"?table={table_number}"
    studio_url = f"{base_url}/studio/"
    market_url = f"{base_url}/market/"

    tma_btn = {"web_app": {"url": tma_url}} if is_https else {"url": tma_url}
    orders_btn = {"web_app": {"url": orders_url}} if is_https else {"url": orders_url}
    studio_btn = {"web_app": {"url": studio_url}} if is_https else {"url": studio_url}
    market_btn = {"web_app": {"url": market_url}} if is_https else {"url": market_url}

    keyboard = [
        [
            {"text": "🍽 3D Restoran Menyu", **tma_btn}
        ],
        [
            {"text": "🖨 3D Printer Studio", **studio_btn},
            {"text": "🛍 Online Do'kon", **market_btn}
        ],
        [
            {"text": "📍 Mening stolim & Bron", **orders_btn}
        ]
    ]

    if is_user_admin:
        shop_id = shop.id if shop else 0
        keyboard.append([
            {"text": "📊 Stollar Nazorati (Admin)", "callback_data": f"t_list:{shop_id}"}
        ])

    return {"inline_keyboard": keyboard}


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
        message_obj = callback_query.get('message', {})
        message_id = message_obj.get('message_id')
        chat = message_obj.get('chat', {})
        chat_id = str(chat.get('id') or from_user.get('id', ''))
        username = from_user.get('username', '')
        first_name = from_user.get('first_name', '')
        cq_data = callback_query.get('data', '')

        # Stol va admin interaktiv callback tugmalarini bajarish
        BotMessage.objects.create(
            chat_id=chat_id,
            username=username or '',
            first_name=first_name or '',
            text=f"[Tugma bosildi]: {cq_data}",
            is_command=False,
            command='callback',
            response="Callback qabul qilindi",
        )
        if handle_table_callback(cq_data, chat_id, message_id=message_id, cq_id=cq_id, username=username):
            return JsonResponse({'ok': True})

        try:
            httpx.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                json={"callback_query_id": cq_id},
                timeout=5,
            )
        except Exception:
            pass
        return JsonResponse({'ok': True})

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

    text_clean = (text or '').strip()
    is_cmd = text_clean.startswith('/')
    cmd_name = text_clean.split()[0] if is_cmd else ''

    # Botga yozilgan xabarni doimiy arxivlash
    bot_msg = BotMessage.objects.create(
        chat_id=chat_id,
        username=username or '',
        first_name=first_name or '',
        text=text or '',
        message_id=message.get('message_id'),
        is_command=is_cmd,
        command=cmd_name,
    )

    # Admin buyruqlari (/admin, /panel, /stats, /orders, /stollar, /tables, /stol)
    if handle_admin_command(text, chat_id, username):
        bot_msg.response = f"[Admin buyrug'i bajarildi: {cmd_name}]"
        bot_msg.save(update_fields=['response'])
        return JsonResponse({'ok': True})

    base_url = get_base_url_from_request(request)
    is_user_admin = is_admin(chat_id, username)
    shop = get_restaurant_shop()

    # Deep link orqali stol raqami aniqlash (/start table_5, /start stol_3, /start 2)
    table_num = None
    if text_clean.startswith('/start'):
        parts = text_clean.split(maxsplit=1)
        if len(parts) > 1:
            arg = parts[1].strip().lower()
            if arg.startswith('table_'):
                table_num = arg.replace('table_', '')
            elif arg.startswith('stol_'):
                table_num = arg.replace('stol_', '')
            elif arg.startswith('t_'):
                table_num = arg.replace('t_', '')
            elif arg.isdigit():
                table_num = arg

    markup = get_menu_markup(base_url, is_user_admin=is_user_admin, shop=shop, table_number=table_num)

    if text_clean.startswith('/start') or text_clean in ('/menu', 'menu', 'menyu', 'Menyu', 'boshlash', 'start'):
        if table_num:
            welcome = (
                f"Assalomu alaykum, <b>{first_name or 'aziz mehmon'}</b>! 👋\n\n"
                f"🍽 Siz <b>Stol №{table_num}</b> ga muvaffaqiyatli ulandingiz!\n\n"
                f"Restoranimizning interaktiv 3D AR menyusi orqali:\n"
                f"• Mazali taomlarimizni 3D holda stolingiz ustida ko'rishingiz\n"
                f"• Tarkibi, tayyorlanish vaqti va narxlarini bilishingiz\n"
                f"• Stolingizdan turib tez va oson buyurtma berishingiz mumkin.\n\n"
                f"Taomlarni tanlash uchun 3D menyuni oching 👇"
            )
        else:
            welcome = (
                f"Assalomu alaykum, <b>{first_name or 'aziz mehmon'}</b>! 👋\n\n"
                f"🍽 Restoranimizning <b>3D AR interaktiv menyusi</b>ga xush kelibsiz!\n\n"
                f"Telefoningiz orqali:\n"
                f"• Mazali taomlarimizni 3D holda stolingiz ustida ko'rishingiz\n"
                f"• Tarkibi, tayyorlanish vaqti va narxlarini bilishingiz\n"
                f"• Stolingizdan turib tez va qulay buyurtma berishingiz mumkin.\n\n"
                f"Taomlarni ko'rish va tanlash uchun quyidagi tugmani bosing 👇"
            )
        send_message(chat_id, welcome, reply_markup=markup)
        bot_msg.response = welcome
        bot_msg.save(update_fields=['response'])

    elif text_clean == '/id':
        admin_flag = " (Admin / Biznes egasi ✅)" if is_user_admin else ""
        resp_id = f"Sizning Chat ID: <code>{chat_id}</code>\nUsername: @{username}{admin_flag}"
        send_message(chat_id, resp_id)
        bot_msg.response = resp_id
        bot_msg.save(update_fields=['response'])

    elif text_clean.startswith(('/kassa', 'kassa')):
        if not is_user_admin:
            err_txt = "⛔️ Kassa ma'lumotlari faqat biznes egasi va adminlar uchun."
            send_message(chat_id, err_txt)
            bot_msg.response = err_txt
            bot_msg.save(update_fields=['response'])
            return JsonResponse({'ok': True})
        from finance.models import FinanceTransaction
        from django.utils import timezone
        from django.db.models import Sum
        today = timezone.localdate()
        target_shop = shop or get_restaurant_shop()
        if target_shop:
            tx_today = FinanceTransaction.objects.filter(shop=target_shop, tx_date=today, is_cancelled=False)
            inc = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or 0
            exp = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or 0
            net = inc - exp
            fmt_inc = f"{int(inc):,}".replace(",", " ")
            fmt_exp = f"{int(exp):,}".replace(",", " ")
            fmt_net = f"{int(net):,}".replace(",", " ")
            response_text = (
                f"📊 <b>{target_shop.name} — Bugungi Kassa ({today.strftime('%d.%m.%Y')})</b>\n\n"
                f"🟢 <b>Kirim:</b> {fmt_inc} so'm\n"
                f"🔴 <b>Chiqim:</b> {fmt_exp} so'm\n"
                f"💎 <b>Sof kassa:</b> {fmt_net} so'm\n\n"
                f"Batafsil ma'lumot do'kon moliya panelida."
            )
        else:
            response_text = "Kassa ma'lumotlari topilmadi."
        send_message(chat_id, response_text)
        bot_msg.response = response_text
        bot_msg.save(update_fields=['response'])

    elif text_clean.startswith('/order'):
        parts = text_clean.split()
        if len(parts) > 1:
            order_number = parts[1]
            from orders.models import Order
            try:
                order = Order.objects.get(order_number=order_number)
                status_text = dict(Order.STATUS_CHOICES).get(order.status, order.status)
                table_str = f" | Stol #{order.table.number}" if order.table else ""
                response_text = (
                    f"📦 #{order.order_number}{table_str}\n"
                    f"👤 {order.customer_name}\n"
                    f"💰 {int(order.final_amount):,} so'm\n"
                    f"📊 Holat: {status_text}"
                )
            except Order.DoesNotExist:
                response_text = "Buyurtma topilmadi"
            send_message(chat_id, response_text)
            bot_msg.response = response_text
            bot_msg.save(update_fields=['response'])

    elif text_clean.startswith(('/studio', '/printer', '/3dprint', '/3d', 'studio', 'printer')):
        studio_url = f"{base_url}/studio/"
        is_https = base_url.startswith('https://')
        st_btn = {"web_app": {"url": studio_url}} if is_https else {"url": studio_url}
        rest_btn = {"web_app": {"url": f"{base_url}/restaurant/"}} if is_https else {"url": f"{base_url}/restaurant/"}
        response_text = (
            f"🖨 <b>3D Printer va 3D Modellashtirish Studiyasi</b>\n\n"
            f"Salom, <b>{first_name or 'hurmatli mijoz'}</b>! Bizning 3D studiyamiz orqali siz:\n"
            f"• Tayyor 3D modellarni ko'rishingiz va yuklab olishingiz\n"
            f"• O'zingiz xohlagan detallar yoki suvenirlarni 3D printerda buyurtma qilishingiz\n"
            f"• Yuqori aniqlikdagi PLA / PETG materiallaridan foydalanishingiz mumkin.\n\n"
            f"Studiyaga o'tish uchun quyidagi tugmani bosing 👇"
        )
        st_markup = {
            "inline_keyboard": [
                [{"text": "🖨 3D Studio & Servisni Ochish", **st_btn}],
                [{"text": "🍽 3D Restoran Menyu", **rest_btn}]
            ]
        }
        send_message(chat_id, response_text, reply_markup=st_markup)
        bot_msg.response = response_text
        bot_msg.save(update_fields=['response'])

    elif text_clean.startswith(('/market', '/dokon', '/store', '/shop', 'market', 'dokon')):
        market_url = f"{base_url}/"
        is_https = base_url.startswith('https://')
        mk_btn = {"web_app": {"url": market_url}} if is_https else {"url": market_url}
        rest_btn = {"web_app": {"url": f"{base_url}/restaurant/"}} if is_https else {"url": f"{base_url}/restaurant/"}
        response_text = (
            f"🛍 <b>Online Do'kon (Marketplace)</b>\n\n"
            f"Salom, <b>{first_name or 'hurmatli mijoz'}</b>! Bizning onlayn savdo maydonchamiz orqali:\n"
            f"• Oziq-ovqat, maishiy va kundalik mahsulotlarni xarid qilishingiz\n"
            f"• Tezkor yetkazib berish xizmatidan foydalanishingiz mumkin.\n\n"
            f"Do'konga o'tish uchun quyidagi tugmani bosing 👇"
        )
        mk_markup = {
            "inline_keyboard": [
                [{"text": "🛍 Online Do'konni Ochish", **mk_btn}],
                [{"text": "🍽 3D Restoran Menyu", **rest_btn}]
            ]
        }
        send_message(chat_id, response_text, reply_markup=mk_markup)
        bot_msg.response = response_text
        bot_msg.save(update_fields=['response'])

    elif text_clean.startswith(('/table', '/stol', '/bron', 'stol', 'bron')):
        table_url = f"{base_url}/restaurant/table/"
        is_https = base_url.startswith('https://')
        tbl_btn = {"web_app": {"url": table_url}} if is_https else {"url": table_url}
        rest_btn = {"web_app": {"url": f"{base_url}/restaurant/"}} if is_https else {"url": f"{base_url}/restaurant/"}
        response_text = (
            f"📍 <b>Restoran Stollari & Bron Qilish</b>\n\n"
            f"Salom, <b>{first_name or 'hurmatli mehmon'}</b>!\n"
            f"• Bo'sh stollarni ko'rish va oldindan bron qilish\n"
            f"• Stolingiz hisobini tekshirish va xodimlarni chaqirish uchun quyidagi tugmani bosing 👇"
        )
        tbl_markup = {
            "inline_keyboard": [
                [{"text": "📍 Stolim & Bron Xizmatlari", **tbl_btn}],
                [{"text": "🍽 3D Restoran Menyu", **rest_btn}]
            ]
        }
        send_message(chat_id, response_text, reply_markup=tbl_markup)
        bot_msg.response = response_text
        bot_msg.save(update_fields=['response'])

    else:
        reply = (
            f"Assalomu alaykum, <b>{first_name or 'hurmatli mehmon'}</b>! 😊\n\n"
            f"🍽 Restoranimizning 3D AR menyusidan foydalanish yoki buyurtmalaringizni ko'rish uchun "
            f"quyidagi tugmalardan birini tanlang 👇"
        )
        send_message(chat_id, reply, reply_markup=markup)
        bot_msg.response = reply
        bot_msg.save(update_fields=['response'])

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
