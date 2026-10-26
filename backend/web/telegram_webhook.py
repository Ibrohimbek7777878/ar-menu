"""
Telegram Bot Webhook — Restoran 3D AR menyusi va Biznes egasi stollar nazorati tizimi.
TZ: TZ_BOT_VA_STOLLAR_TIZIMI.md
"""
import json
import httpx

from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

from notifications import telegram_client
from notifications.telegram_client import esc
from notifications.models import TelegramSubscriber, BotMessage
from notifications.webhook_security import is_valid_telegram_webhook
from web.restaurant_auth import restaurant_staff_required
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
    So'rov kelgan public host va scheme ni aniqlash (TZ: Stage 5, T2).
    Production'da RESTAURANT_PUBLIC_URL ustun — Host sarlavhasi soxtalashtirilishiga yo'l qo'yilmaydi.
    """
    public_url = getattr(settings, 'RESTAURANT_PUBLIC_URL', '').rstrip('/')
    if public_url and (public_url.startswith('http://') or public_url.startswith('https://')):
        return public_url

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


def get_menu_markup(base_url, is_user_admin=False, shop=None, table_number=None, table_token=None):
    """
    Restoran bot klaviaturasi (TZ: Stage 5, T1, T3).
    bot_scope = 'restaurant' bo'lsa faqat 'Menyuni ochish' va 'Mening stolim & Bron'.
    bot_scope = 'all' bo'lsa barcha 4 ta tugma.
    """
    from backend.app_settings import get_choice
    bot_scope = get_choice('bot_scope', 'restaurant', ('restaurant', 'all'))
    is_https = base_url.startswith('https://')

    if table_token:
        tma_url = f"{base_url}/t/{table_token}/"
        orders_url = f"{base_url}/t/{table_token}/"
    else:
        tma_url = f"{base_url}/restaurant/"
        orders_url = f"{base_url}/restaurant/table/"
        if table_number:
            tma_url += f"?table={table_number}"
            orders_url += f"?table={table_number}"

    tma_btn = {"web_app": {"url": tma_url}} if is_https else {"url": tma_url}
    orders_btn = {"web_app": {"url": orders_url}} if is_https else {"url": orders_url}

    if bot_scope == 'restaurant':
        keyboard = [
            [
                {"text": "🍽 Menyuni ochish", **tma_btn}
            ],
            [
                {"text": "📍 Mening stolim & Bron", **orders_btn}
            ]
        ]
    else:
        studio_url = f"{base_url}/studio/"
        market_url = f"{base_url}/market/"
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



def _forbidden_webhook():
    return JsonResponse({'ok': False, 'error': 'invalid secret token'}, status=403)


@csrf_exempt
@require_POST
def telegram_webhook(request):
    """Eski umumiy webhook (/telegram/webhook/) — set_telegram_webhook TELEGRAM_BOT_TOKEN bilan o'rnatadi."""
    if not is_valid_telegram_webhook(request, getattr(settings, 'TELEGRAM_BOT_TOKEN', '')):
        return _forbidden_webhook()
    return _handle_telegram_update(request)


def _handle_telegram_update(request):
    """Restoran boti update'ini qayta ishlash (faqat secret tekshirilgandan keyin chaqiriladi)."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': True})

    # Telegram bir xil update'ni qayta yuborishi mumkin (javob sekin bo'lsa): ikki marta bajarilmasin
    update_id = data.get('update_id')
    if update_id is not None and not cache.add(f'tg_update:restaurant:{update_id}', 1, 3600):
        return JsonResponse({'ok': True, 'duplicate': True})

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

        telegram_client.call('answerCallbackQuery', {"callback_query_id": cq_id})
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

    # Deep link orqali stolni aniqlash (/start t_<token> yoki demo'da table_5)
    table_num = None
    table_token = None
    if text_clean.startswith('/start'):
        parts = text_clean.split(maxsplit=1)
        if len(parts) > 1:
            arg = parts[1].strip()
            if arg.lower().startswith('t_'):
                raw_token = arg[2:].strip()
                import uuid
                try:
                    token_uuid = uuid.UUID(raw_token)
                    from tables_restaurant.models import Table
                    table_obj = Table.objects.filter(qr_token=token_uuid, is_active=True).first()
                    if table_obj:
                        table_token = str(table_obj.qr_token)
                        table_num = str(table_obj.number)
                except Exception:
                    pass
            elif getattr(settings, 'DEMO_MODE', False) or getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False):
                arg_lower = arg.lower()
                if arg_lower.startswith('table_'):
                    table_num = arg[6:]
                elif arg_lower.startswith('stol_'):
                    table_num = arg[5:]
                elif arg.isdigit():
                    table_num = arg

    markup = get_menu_markup(base_url, is_user_admin=is_user_admin, shop=shop, table_number=table_num, table_token=table_token)


    if text_clean.startswith('/start') or text_clean in ('/menu', 'menu', 'menyu', 'Menyu', 'boshlash', 'start'):
        if table_num:
            welcome = (
                f"Assalomu alaykum, <b>{esc(first_name or 'aziz mehmon')}</b>! 👋\n\n"
                f"🍽 Siz <b>Stol №{table_num}</b> ga muvaffaqiyatli ulandingiz!\n\n"
                f"Restoranimizning interaktiv 3D AR menyusi orqali:\n"
                f"• Mazali taomlarimizni 3D holda stolingiz ustida ko'rishingiz\n"
                f"• Tarkibi, tayyorlanish vaqti va narxlarini bilishingiz\n"
                f"• Stolingizdan turib tez va oson buyurtma berishingiz mumkin.\n\n"
                f"Taomlarni tanlash uchun 3D menyuni oching 👇"
            )
        else:
            welcome = (
                f"Assalomu alaykum, <b>{esc(first_name or 'aziz mehmon')}</b>! 👋\n\n"
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
        resp_id = f"Sizning Chat ID: <code>{chat_id}</code>\nUsername: @{esc(username)}{admin_flag}"
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
        target_shop = shop or get_restaurant_shop()
        if target_shop:
            from finance.services.summary import today_summary
            summary = today_summary(target_shop)
            inc = summary['income']
            exp = summary['expense']
            net = summary['net_profit']
            fmt_inc = f"{int(inc):,}".replace(",", " ")
            fmt_exp = f"{int(exp):,}".replace(",", " ")
            fmt_net = f"{int(net):,}".replace(",", " ")
            today_str = summary['today_date'].strftime('%d.%m.%Y')
            response_text = (
                f"📊 <b>{target_shop.name} — Bugungi Kassa ({today_str})</b>\n\n"
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
        if not is_user_admin:
            # Avval istalgan foydalanuvchi buyurtma raqami bilan mijoz ismi va summasini olardi
            err_txt = "⛔️ Buyurtma ma'lumotlari faqat biznes egasi va adminlar uchun."
            send_message(chat_id, err_txt)
            bot_msg.response = err_txt
            bot_msg.save(update_fields=['response'])
            return JsonResponse({'ok': True})
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
            f"Salom, <b>{esc(first_name or 'hurmatli mijoz')}</b>! Bizning 3D studiyamiz orqali siz:\n"
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
        market_url = f"{base_url}/market/"
        is_https = base_url.startswith('https://')
        mk_btn = {"web_app": {"url": market_url}} if is_https else {"url": market_url}
        rest_btn = {"web_app": {"url": f"{base_url}/restaurant/"}} if is_https else {"url": f"{base_url}/restaurant/"}
        response_text = (
            f"🛍 <b>Online Do'kon (Marketplace)</b>\n\n"
            f"Salom, <b>{esc(first_name or 'hurmatli mijoz')}</b>! Bizning onlayn savdo maydonchamiz orqali:\n"
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
            f"Salom, <b>{esc(first_name or 'hurmatli mehmon')}</b>!\n"
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
            f"Assalomu alaykum, <b>{esc(first_name or 'hurmatli mehmon')}</b>! 😊\n\n"
            f"🍽 Restoranimizning 3D AR menyusidan foydalanish yoki buyurtmalaringizni ko'rish uchun "
            f"quyidagi tugmalardan birini tanlang 👇"
        )
        send_message(chat_id, reply, reply_markup=markup)
        bot_msg.response = reply
        bot_msg.save(update_fields=['response'])

    return JsonResponse({'ok': True})


@restaurant_staff_required(roles=('super_admin',), api=True)
def telegram_set_chat_id(request):
    """GET: Barcha obunachilarni ko'rish (faqat platforma admini — bu shaxsiy ma'lumot)."""
    subs = TelegramSubscriber.objects.filter(is_active=True).values('chat_id', 'username', 'first_name')
    return JsonResponse({'subscribers': list(subs)})


@restaurant_staff_required(roles=('super_admin',), api=True)
def telegram_send_test(request):
    """POST: {chat_id, text} — test xabar (faqat platforma admini; avval istalgan kishi bot nomidan yozardi)."""
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


@csrf_exempt
@require_POST
def restaurant_webhook(request):
    """Mahsulot #1: Restoran 3D Menyu Boti webhooki."""
    from notifications.bots import get_bot_token
    if not is_valid_telegram_webhook(request, get_bot_token('restaurant')):
        return _forbidden_webhook()
    return _handle_telegram_update(request)


@csrf_exempt
@require_POST
def market_webhook(request):
    """Mahsulot #2: Online Store Guliston (Marketplace) Boti webhooki."""
    from notifications.bots import get_bot_token, send_bot_message
    if not is_valid_telegram_webhook(request, get_bot_token('market')):
        return _forbidden_webhook()
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': True})

    message = data.get('message') or data.get('channel_post') or {}
    chat = message.get('chat', {})
    from_user = message.get('from', {})
    chat_id = str(chat.get('id') or from_user.get('id', ''))
    text = (message.get('text') or '').strip()
    first_name = from_user.get('first_name', '')

    if not chat_id:
        return JsonResponse({'ok': True})

    base_url = get_base_url_from_request(request)
    is_https = base_url.startswith('https://')
    market_url = f"{base_url}/market/"
    orders_url = f"{base_url}/orders/"
    
    market_btn = {"web_app": {"url": market_url}} if is_https else {"url": market_url}
    orders_btn = {"web_app": {"url": orders_url}} if is_https else {"url": orders_url}

    kb = {
        "inline_keyboard": [
            [{"text": "🛍 Do'konni Ochish (TMA)", **market_btn}],
            [{"text": "📦 Mening Buyurtmalarim", **orders_btn}]
        ]
    }

    resp = (
        f"Assalomu alaykum, <b>{esc(first_name or 'hurmatli xaridor')}</b>! 👋\n\n"
        f"🛍 <b>Online Store Guliston</b> gipermarketiga xush kelibsiz!\n\n"
        f"Bizning onlayn savdo maydonchamiz orqali:\n"
        f"• Shahringizdagi do'konlardan tovarlarni qulay xarid qilishingiz\n"
        f"• Manzilingizgacha tezkor kuryer xizmatidan foydalanishingiz mumkin.\n\n"
        f"Xaridni boshlash uchun quyidagi tugmani bosing 👇"
    )
    send_bot_message('market', chat_id, resp, reply_markup=kb)
    return JsonResponse({'ok': True})


@csrf_exempt
@require_POST
def studio_webhook(request):
    """Mahsulot #3: 3D Studio & Print Assistant Boti webhooki."""
    from notifications.bots import get_bot_token, send_bot_message
    if not is_valid_telegram_webhook(request, get_bot_token('studio')):
        return _forbidden_webhook()
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'ok': True})

    message = data.get('message') or data.get('channel_post') or {}
    chat = message.get('chat', {})
    from_user = message.get('from', {})
    chat_id = str(chat.get('id') or from_user.get('id', ''))
    text = (message.get('text') or '').strip()
    first_name = from_user.get('first_name', '')
    doc = message.get('document')

    if not chat_id:
        return JsonResponse({'ok': True})

    base_url = get_base_url_from_request(request)
    is_https = base_url.startswith('https://')
    studio_url = f"{base_url}/studio/"
    calc_url = f"{base_url}/3d-print/"

    studio_btn = {"web_app": {"url": studio_url}} if is_https else {"url": studio_url}
    calc_btn = {"web_app": {"url": calc_url}} if is_https else {"url": calc_url}

    # Agar foydalanuvchi fayl yuborgan bo'lsa (.stl, .obj)
    if doc:
        file_name = doc.get('file_name', 'model.stl')
        file_size = doc.get('file_size', 0)
        size_mb = round(file_size / (1024 * 1024), 2)
        
        reply_doc = (
            f"🖨 <b>3D Model Qabul Qilindi!</b>\n\n"
            f"📁 <b>Fayl:</b> <code>{file_name}</code> ({size_mb} MB)\n"
            f"🔍 <b>Tahlil:</b> 3D printerda chop etishga yaroqli.\n\n"
            f"💰 <b>Taxminiy narxlar:</b>\n"
            f"• PLA (Standart): 500 so'm / gramm\n"
            f"• PETG (Mustahkam): 700 so'm / gramm\n"
            f"• ABS (Zaruriy qism): 800 so'm / gramm\n"
            f"🎁 <i>Har bir buyurtmada 5% keshbek beriladi!</i>\n\n"
            f"Aniq o'lcham va rangni tanlab buyurtma berish uchun quyidagi tugmani bosing 👇"
        )
        kb_doc = {
            "inline_keyboard": [
                [{"text": "📐 3D Kalkulyatorda Ochish", **calc_btn}],
                [{"text": "🖨 3D Studio Portali", **studio_btn}]
            ]
        }
        send_bot_message('studio', chat_id, reply_doc, reply_markup=kb_doc)
        return JsonResponse({'ok': True})

    kb = {
        "inline_keyboard": [
            [{"text": "🖨 3D Studio & Narx Kalkulyatori", **calc_btn}],
            [{"text": "🌐 3D Studio Portali", **studio_btn}]
        ]
    }

    reply = (
        f"Assalomu alaykum, <b>{esc(first_name or 'hurmatli muhandis')}</b>! ⚙️\n\n"
        f"🖨 <b>3D Printing & Prototyping Studio</b>ga xush kelibsiz!\n\n"
        f"Xizmatlarimiz:\n"
        f"• Talab bo'yicha ehtiyot qismlar, maketlar va suvenirlar chop etish\n"
        f"• PLA, PETG, ABS, TPU va SLA Resin materiallar\n"
        f"• Har bir buyurtmada kafolatlangan <b>5% keshbek</b>!\n\n"
        f"Siz to'g'ridan-to'g'ri <code>.stl</code> yoki <code>.obj</code> faylingizni ushbu botga yuborishingiz mumkin. "
        f"Yoki narxni onlayn hisoblash uchun quyidagi tugmani bosing 👇"
    )
    send_bot_message('studio', chat_id, reply, reply_markup=kb)
    return JsonResponse({'ok': True})
