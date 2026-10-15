import logging
logger = logging.getLogger(__name__)
from datetime import timedelta
from django.contrib import messages
from django.conf import settings
from django.db.models import Avg, Sum, Q, Count
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from web.seller_decorators import seller_required
from django.views.decorators.clickjacking import xframe_options_exempt
from shops.models import Shop, ShopPage, SHOP_SECTION_TYPES
from products.models import Product
from orders.models import Order, OrderItem
from accounts.models import Customer, AdminUser
from notifications.models import TelegramSubscriber
from categories.models import Category
from django.contrib.auth import authenticate, login
@seller_required
def seller_telegram(request):
    """Telegram bot boshqaruv paneli — sozlamalar tahriri, jonli xabar yozish, obunachilar va statistika."""
    shop = request.tenant_shop
    from notifications.models import NotificationLog, TelegramSubscriber, BotMessage, AppSetting
    from django.conf import settings
    import urllib.request
    import json

    # 1. Sozlamalarni o'qish (AppSetting yoki settings dan)
    def get_setting(key, fallback=''):
        st = AppSetting.objects.filter(key=key).first()
        return st.value if st else fallback

    bot_token = get_setting('telegram_bot_token', getattr(settings, 'TELEGRAM_BOT_TOKEN', ''))
    chat_id = get_setting('telegram_chat_id', getattr(settings, 'TELEGRAM_CHAT_ID', ''))
    welcome_msg = get_setting('telegram_welcome_msg', f"Assalomu alaykum! {shop.name if shop else 'Online Store'} botiga xush kelibsiz! Buyurtma berish uchun quyidagi tugmani bosing.")
    order_msg_tpl = get_setting('telegram_order_msg_tpl', f"🛍️ Yangi buyurtma!\n\nBuyurtma kodi: {{order_number}}\nMijoz: {{customer_name}}\nTelefon: {{phone}}\nJami summa: {{total}} so'm")

    # POST amallari
    if request.method == 'POST':
        action = request.POST.get('action')

        # Bot sozlamalari va barcha obunachilarga rassilka butun platformaga tegishli —
        # faqat super_admin o'zgartira oladi (boshqa do'kon egasi global botni egallamasin).
        is_platform_admin = getattr(request.user, 'role', '') == 'super_admin' or request.user.is_superuser
        if not is_platform_admin and (
            action == 'save_settings'
            or (action == 'send_broadcast' and request.POST.get('target') == 'all_subscribers')
        ):
            messages.error(request, "Bu amal faqat platforma administratoriga ruxsat etilgan.")
            return redirect('seller_telegram_web')

        # 1. Bot Sozlamalarini Saqlash
        if action == 'save_settings':
            new_token = request.POST.get('bot_token', '').strip()
            new_chat_id = request.POST.get('chat_id', '').strip()
            new_welcome = request.POST.get('welcome_msg', '').strip()
            new_order_tpl = request.POST.get('order_msg_tpl', '').strip()
            
            # Token maydoni bo'sh qoldirilsa — mavjud token saqlanib qoladi (u sahifada ko'rsatilmaydi)
            if new_token:
                AppSetting.objects.update_or_create(key='telegram_bot_token', defaults={'value': new_token, 'category': 'telegram'})
            AppSetting.objects.update_or_create(key='telegram_chat_id', defaults={'value': new_chat_id, 'category': 'telegram'})
            if new_welcome:
                AppSetting.objects.update_or_create(key='telegram_welcome_msg', defaults={'value': new_welcome, 'category': 'telegram'})
            if new_order_tpl:
                AppSetting.objects.update_or_create(key='telegram_order_msg_tpl', defaults={'value': new_order_tpl, 'category': 'telegram'})
                
            messages.success(request, "Telegram bot sozlamalari muvaffaqiyatli saqlandi!")
            return redirect('seller_telegram_web')
            
        # 2. Xabar Yuborish (Rassilka / Jonli xabar)
        elif action == 'send_broadcast':
            text = request.POST.get('text', '').strip()
            target = request.POST.get('target', 'admin')
            if text:
                from notifications.services.telegram_service import _send_message
                send_count = 0
                fail_count = 0
                
                if target == 'all_subscribers':
                    subs = TelegramSubscriber.objects.filter(is_active=True)
                    for sub in subs:
                        res = _send_message(sub.chat_id, f"📢 <b>{shop.name}</b>\n\n{text}")
                        if res.get('success'):
                            send_count += 1
                        else:
                            fail_count += 1
                    NotificationLog.objects.create(
                        type='telegram', recipient=f"{subs.count()} obunachiga",
                        message=text, success=bool(send_count > 0),
                        error_message=f"{send_count} muvaffaqiyatli, {fail_count} xato" if fail_count else ''
                    )
                    messages.success(request, f"Xabar {send_count} ta obunachiga yuborildi!")
                else:
                    target_chat = chat_id or getattr(settings, 'TELEGRAM_CHAT_ID', '')
                    if target_chat:
                        res = _send_message(target_chat, f"📢 <b>{shop.name}</b>\n\n{text}")
                        NotificationLog.objects.create(
                            type='telegram', recipient=target_chat,
                            message=text, success=res.get('success', False),
                            error_message=res.get('error', '')
                        )
                        if res.get('success'):
                            messages.success(request, "Xabar Telegram guruh/kanaliga yuborildi!")
                        else:
                            messages.error(request, f"Xato: {res.get('error')}")
                    else:
                        messages.error(request, "Chat ID kiritilmagan. Avval Sozlamalarda Chat ID ni saqlang.")
            return redirect('seller_telegram_web')

        # 3. Botni tekshirish (getMe)
        elif action == 'test_bot':
            if bot_token:
                try:
                    req_url = f"https://api.telegram.org/bot{bot_token}/getMe"
                    with urllib.request.urlopen(req_url, timeout=5) as resp:
                        data = json.loads(resp.read().decode('utf-8'))
                        if data.get('ok'):
                            bot_user = data.get('result', {}).get('username', '')
                            messages.success(request, f"✅ Bot faol va ulandi! Bot username: @{bot_user}")
                        else:
                            messages.error(request, "Bot API xato javob qaytardi.")
                except Exception as e:
                    messages.error(request, f"Botga ulanib bo'lmadi: {e}")
            else:
                messages.error(request, "Avval Bot Tokenni kiriting!")
            return redirect('seller_telegram_web')

    # Filtrlar
    msg_type = request.GET.get('type', '')
    msg_status = request.GET.get('status', '')
    msg_search = request.GET.get('q', '').strip()
    date_from = request.GET.get('from', '')
    date_to = request.GET.get('to', '')

    bot_msgs = BotMessage.objects.all()
    if msg_type == 'command':
        bot_msgs = bot_msgs.filter(is_command=True)
    elif msg_type == 'text':
        bot_msgs = bot_msgs.filter(is_command=False)
    if msg_search:
        bot_msgs = bot_msgs.filter(text__icontains=msg_search) | bot_msgs.filter(first_name__icontains=msg_search) | bot_msgs.filter(username__icontains=msg_search)
    if date_from:
        bot_msgs = bot_msgs.filter(created_at__date__gte=date_from)
    if date_to:
        bot_msgs = bot_msgs.filter(created_at__date__lte=date_to)
    bot_msgs = bot_msgs[:80]

    logs = NotificationLog.objects.filter(type='telegram')
    if msg_status == 'success':
        logs = logs.filter(success=True)
    elif msg_status == 'fail':
        logs = logs.filter(success=False)
    if date_from:
        logs = logs.filter(sent_at__date__gte=date_from)
    if date_to:
        logs = logs.filter(sent_at__date__lte=date_to)
    logs = logs.select_related('order')[:80]

    subscribers = TelegramSubscriber.objects.filter(is_active=True)

    total_bot_msgs = BotMessage.objects.count()
    command_count = BotMessage.objects.filter(is_command=True).count()
    text_count = BotMessage.objects.filter(is_command=False).count()
    sent_ok = NotificationLog.objects.filter(type='telegram', success=True).count()
    sent_fail = NotificationLog.objects.filter(type='telegram', success=False).count()

    return render(request, 'seller/telegram.html', {
        'shop': shop,
        'logs': logs,
        'subscribers': subscribers,
        'bot_msgs': bot_msgs,
        'total_bot_msgs': total_bot_msgs,
        'command_count': command_count,
        'text_count': text_count,
        'sent_ok': sent_ok,
        'sent_fail': sent_fail,
        # Token HTML'ga hech qachon to'liq chiqarilmaydi — faqat oxirgi 4 belgi
        'bot_token': f"••••••••{bot_token[-4:]}" if bot_token else '',
        'chat_id': chat_id,
        'welcome_msg': welcome_msg,
        'order_msg_tpl': order_msg_tpl,
        'msg_type': msg_type,
        'msg_status': msg_status,
        'msg_search': msg_search,
        'date_from': date_from,
        'date_to': date_to,
    })

