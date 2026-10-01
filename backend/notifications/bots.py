"""
Multi-bot infratuzilmasi — 3 ta mustaqil Telegram bot ekotizimi.
TZ: TZ_3_TA_MUSTAQIL_MAHSULOT_EKOTIZIMI.md

Har bir mahsulot o'z tokeni, webhook manzili va mustaqil handleriga ega:
  1. restaurant — Restoran 3D Menyu & Stollar boti (TMA: /restaurant/)
  2. market     — Online Store E-Commerce Shopping Bot (TMA: /)
  3. studio     — 3D Studio & Print Assistant Bot (TMA: /studio/)

Botlar bitta serverda yashaydi, biroq tokenlari alohida — bittasi o'chsa
qolgan ikkisi ishlashda davom etadi (loose coupling).
"""
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org"

BOT_REGISTRY = {
    'restaurant': {
        'key': 'restaurant',
        'title': '🍽 Restoran 3D Menyu Boti',
        'token_setting': 'TELEGRAM_RESTAURANT_BOT_TOKEN',
        'legacy_token_setting': 'TELEGRAM_BOT_TOKEN',
        'webhook_path': '/bot/restaurant/webhook/',
        'legacy_webhook_path': '/telegram/webhook/',
        'tma_path': '/restaurant/',
    },
    'market': {
        'key': 'market',
        'title': "🛍 Online Store E-Commerce Boti",
        'token_setting': 'TELEGRAM_MARKET_BOT_TOKEN',
        'legacy_token_setting': '',
        'webhook_path': '/bot/market/webhook/',
        'legacy_webhook_path': '',
        'tma_path': '/market/',
    },
    'studio': {
        'key': 'studio',
        'title': '🖨 3D Studio & Print Bot',
        'token_setting': 'TELEGRAM_STUDIO_BOT_TOKEN',
        'legacy_token_setting': '',
        'webhook_path': '/bot/studio/webhook/',
        'legacy_webhook_path': '',
        'tma_path': '/studio/',
    },
}


def get_bot_config(bot_key):
    return BOT_REGISTRY.get(bot_key)


def get_bot_token(bot_key):
    """Bot tokenini sozlamalardan olish (eski nom bilan moslik saqlanadi)."""
    cfg = BOT_REGISTRY.get(bot_key)
    if not cfg:
        return ''
    token = getattr(settings, cfg['token_setting'], '')
    if not token and cfg.get('legacy_token_setting'):
        token = getattr(settings, cfg['legacy_token_setting'], '')
    return (token or '').strip()


def configured_bots():
    """Tokeni bor botlar ro'yxati — monitoring va setup uchun."""
    return [cfg for cfg in BOT_REGISTRY.values() if get_bot_token(cfg['key'])]


def bot_api(bot_key, method, payload=None, timeout=10):
    """Umumiy Bot API chaqiruvi. {'ok': bool, ...} yoki {'ok': False, 'error': ...}"""
    token = get_bot_token(bot_key)
    if not token:
        return {'ok': False, 'error': f'{bot_key} bot tokeni sozlanmagan'}
    try:
        resp = httpx.post(f"{TELEGRAM_API}/bot{token}/{method}", json=payload or {}, timeout=timeout)
        data = resp.json()
        if not data.get('ok'):
            logger.warning("Telegram %s/%s xato: %s", bot_key, method, data.get('description'))
        return data
    except Exception as exc:
        logger.warning("Telegram %s/%s ulanish xatosi: %s", bot_key, method, exc)
        return {'ok': False, 'error': str(exc)}


def send_bot_message(bot_key, chat_id, text, parse_mode='HTML', reply_markup=None):
    """Tanlangan bot orqali xabar yuborish."""
    if not chat_id or not text:
        return False
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    if reply_markup:
        payload['reply_markup'] = reply_markup
    return bool(bot_api(bot_key, 'sendMessage', payload).get('ok'))


def send_bot_photo(bot_key, chat_id, photo_url, caption='', parse_mode='HTML', reply_markup=None):
    """URL orqali rasm yuborish (3D buyurtma tayyor bo'lganda va boshqalar)."""
    if not chat_id or not photo_url:
        return False
    payload = {'chat_id': chat_id, 'photo': photo_url, 'caption': caption, 'parse_mode': parse_mode}
    if reply_markup:
        payload['reply_markup'] = reply_markup
    return bool(bot_api(bot_key, 'sendPhoto', payload).get('ok'))


def get_bot_file_url(bot_key, file_id):
    """Botga yuborilgan faylni yuklab olish uchun to'liq URL qaytaradi."""
    data = bot_api(bot_key, 'getFile', {'file_id': file_id}, timeout=15)
    if not data.get('ok'):
        return None, None
    info = data.get('result', {})
    file_path = info.get('file_path')
    if not file_path:
        return None, None
    token = get_bot_token(bot_key)
    return info, f"{TELEGRAM_API}/file/bot{token}/{file_path}"


def download_bot_file(bot_key, file_id, max_bytes=25 * 1024 * 1024):
    """Bot faylini baytlarda yuklab olish (STL tahlili uchun)."""
    import httpx as _httpx
    info, url = get_bot_file_url(bot_key, file_id)
    if not url:
        return None, info
    try:
        resp = _httpx.get(url, timeout=30, follow_redirects=True)
        if resp.status_code != 200 or len(resp.content) > max_bytes:
            return None, info
        return resp.content, info
    except Exception as exc:
        logger.warning("Bot fayli yuklab olinmadi: %s", exc)
        return None, info


def set_bot_webhook(bot_key, base_url):
    """setWebhook — management command uchun."""
    cfg = BOT_REGISTRY.get(bot_key)
    if not cfg:
        return False, 'Noma\'lum bot'
    webhook_url = f"{base_url.rstrip('/')}{cfg['webhook_path']}"
    data = bot_api(bot_key, 'setWebhook', {
        'url': webhook_url,
        'allowed_updates': ['message', 'callback_query', 'channel_post'],
        'drop_pending_updates': False,
    }, timeout=15)
    return bool(data.get('ok')), data.get('description', webhook_url)


def get_bot_me(bot_key):
    """Token to'g'riligini tekshirish (getMe)."""
    data = bot_api(bot_key, 'getMe', timeout=10)
    if data.get('ok'):
        me = data.get('result', {})
        return {'ok': True, 'username': me.get('username'), 'title': me.get('first_name')}
    return {'ok': False, 'error': data.get('error', 'token xato')}
