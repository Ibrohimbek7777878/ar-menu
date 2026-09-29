"""
Telegram bot xizmati — xabar yuborish va yangi mahsulot bo'yicha
"3 mahalla xabari" (e'lon + upsell + kayfiyat) marketing ketma-ketligi.

Token `settings.TELEGRAM_BOT_TOKEN` orqali o'qiladi (env). Token bo'lmasa
xabarlar yuborilmaydi, lekin xatolikka olib kelmaydi (log qilinadi).
"""
import logging

import httpx
from django.conf import settings

from .models import TelegramSubscriber, NotificationLog

logger = logging.getLogger(__name__)

API = 'https://api.telegram.org/bot{token}/{method}'


def _log(recipient, message, success, error='', msg_type='telegram'):
    try:
        NotificationLog.objects.create(
            type=msg_type, recipient=str(recipient), message=message[:4000],
            success=success, error_message=error,
        )
    except Exception:
        pass


def send_message(chat_id, text, parse_mode='HTML', reply_markup=None):
    """Bitta Telegram xabari yuborish (reply_markup qo'llab-quvvatlaydi). Muvaffaqiyatli bo'lsa True."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token:
        logger.warning('TELEGRAM_BOT_TOKEN o\'rnatilmagan — xabar yuborilmadi.')
        return False
    if not chat_id:
        return False
    try:
        payload = {'chat_id': str(chat_id), 'text': text, 'parse_mode': parse_mode}
        if reply_markup:
            payload['reply_markup'] = reply_markup
        resp = httpx.post(
            API.format(token=token, method='sendMessage'),
            json=payload,
            timeout=10,
        )
        ok = resp.status_code == 200 and resp.json().get('ok')
        _log(chat_id, text, bool(ok), '' if ok else resp.text[:500])
        return bool(ok)
    except Exception as e:
        _log(chat_id, text, False, str(e)[:500])
        logger.error(f'Telegram yuborish xatosi: {e}')
        return False


def edit_message_text(chat_id, message_id, text, parse_mode='HTML', reply_markup=None):
    """Telegramdagi mavjud xabarni yangilash (inline tugmalar uchun)."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token or not chat_id or not message_id:
        return False
    try:
        payload = {
            'chat_id': str(chat_id),
            'message_id': int(message_id),
            'text': text,
            'parse_mode': parse_mode,
        }
        if reply_markup is not None:
            payload['reply_markup'] = reply_markup
        resp = httpx.post(
            API.format(token=token, method='editMessageText'),
            json=payload,
            timeout=10,
        )
        return resp.status_code == 200 and resp.json().get('ok', False)
    except Exception as e:
        logger.error(f'Telegram editMessageText xatosi: {e}')
        return False


def edit_message_reply_markup(chat_id, message_id, reply_markup=None):
    """Telegramdagi mavjud xabarning inline tugmalarini yangilash."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token or not chat_id or not message_id:
        return False
    try:
        payload = {
            'chat_id': str(chat_id),
            'message_id': int(message_id),
        }
        if reply_markup is not None:
            payload['reply_markup'] = reply_markup
        resp = httpx.post(
            API.format(token=token, method='editMessageReplyMarkup'),
            json=payload,
            timeout=10,
        )
        return resp.status_code == 200 and resp.json().get('ok', False)
    except Exception as e:
        logger.error(f'Telegram editMessageReplyMarkup xatosi: {e}')
        return False


def answer_callback_query(callback_query_id, text=None, show_alert=False):
    """Telegram inline tugma bosilganda alert yoki yuklanish belgisini to'xtatish."""
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token or not callback_query_id:
        return False
    try:
        payload = {'callback_query_id': str(callback_query_id)}
        if text:
            payload['text'] = text
            payload['show_alert'] = show_alert
        resp = httpx.post(
            API.format(token=token, method='answerCallbackQuery'),
            json=payload,
            timeout=5,
        )
        return resp.status_code == 200 and resp.json().get('ok', False)
    except Exception as e:
        logger.error(f'Telegram answerCallbackQuery xatosi: {e}')
        return False


def get_subscribers():
    """Faol obunachilar chat_id ro'yxati."""
    return list(TelegramSubscriber.objects.filter(is_active=True).values_list('chat_id', flat=True))


def _msg_announce(product, shop, neighborhood):
    return (
        f"🆕 {neighborhood} mahallasida YANGI MAHSULOT!\n\n"
        f"🛒 <b>{product.name}</b>\n"
        f"💰 Narxi: {product.price} so'm\n"
        f"🏪 {shop.name}\n\n"
        f"Hoziroq ko'rib chiqing — zaxira cheklangan! ⏰"
    )


def _msg_upsell(product, shop, neighborhood):
    extra = " va bepul yetkazib berish" if (getattr(shop, 'free_delivery_from', 0) or 0) else ""
    return (
        f"🔥 {product.name} sotib olganlar buni ham oldi:\n\n"
        f"Qo'shnilaringiz bu mahsulotni allaqachon sinab ko'rishdi va "
        f"javoban 5 yulduz qoldirishdi ⭐⭐⭐⭐⭐\n\n"
        f"💡 Fikr: {product.name} ni boshqa mahsulotlar bilan birga buyurtma "
        f"qilsangiz vaqtinjoz tejaysiz{extra}.\n"
        f"📦 {shop.name} — {shop.delivery_fee or 0} so'm yetkazib berish."
    )


def _msg_mood(product, shop, neighborhood):
    return (
        f"😊 Kuningiz yaxshiroq bo'lsin!\n\n"
        f"{neighborhood} dagi do'stlaringiz {product.name} bilan uyini yanada "
        f"yoqimli qilishyapti. Siz ham o'z shareingizni oling 🎁\n\n"
        f"👉 Buyurtma berish: {shop.name}\n"
        f"Tez yetkazib beramiz — siz faqat zavqlaning 🌿"
    )


def notify_new_product(product, neighborhood=None):
    """Yangi mahsulot qo'shilganda obunachilarga 3 ta xabar yuborish."""
    shop = product.shop
    if not shop:
        return 0
    if not neighborhood:
        neighborhood = (shop.address or '').split(',')[0][:24] or 'Mahallangizda'
    chats = get_subscribers()
    if not chats:
        logger.info('Telegram obunachilari yo\'q — yangi mahsulot xabari yuborilmadi.')
        return 0
    sent = 0
    for chat_id in chats:
        for fn in (_msg_announce, _msg_upsell, _msg_mood):
            if send_message(chat_id, fn(product, shop, neighborhood)):
                sent += 1
    owner_chat = getattr(settings, 'TELEGRAM_CHAT_ID', '')
    if owner_chat:
        send_message(
            owner_chat,
            f"✅ Yangi mahsulot e'lon qilindi: {product.name} ({shop.name}). "
            f"{len(chats)} obunachiga 3 tadan xabar yuborildi.",
        )
    return sent
