"""
Telegram Mini App `initData` imzosini tekshirish (TZ: R1-11).

Avval checkout POST'dagi `telegram_id` ga ko'r-ko'rona ishonilardi: begona odam o'zga telefon raqami va o'zga
Telegram ID bilan buyurtma berib, qurbonning ma'lumotlarini (ism, manzil, buyurtma holati) o'z chatiga olishi yoki
qurbonning chatini spam qilishi mumkin edi. Endi faqat Telegram o'zi imzolagan `initData` qabul qilinadi
(https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
"""
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from django.conf import settings

MAX_AGE_SECONDS = 24 * 60 * 60


def verify_init_data(init_data: str, bot_token: str = '', max_age: int = MAX_AGE_SECONDS):
    """To'g'ri imzolangan va eskirmagan bo'lsa Telegram `user` lug'atini, aks holda None qaytaradi."""
    bot_token = bot_token or getattr(settings, 'TELEGRAM_RESTAURANT_BOT_TOKEN', '') or ''
    if not init_data or not bot_token or len(init_data) > 4096:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    except ValueError:
        return None
    received_hash = pairs.pop('hash', '')
    if not received_hash:
        return None

    check_string = '\n'.join(f'{key}={pairs[key]}' for key in sorted(pairs))
    secret = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None

    try:
        age = time.time() - int(pairs.get('auth_date', '0'))
        user = json.loads(pairs.get('user', ''))
    except (TypeError, ValueError):
        return None
    if age > max_age or age < -300 or not isinstance(user, dict) or not user.get('id'):
        return None
    return user


def telegram_id_from_request(request) -> str:
    """Checkout uchun ishonchli Telegram ID (yoki bo'sh satr).

    Imzolangan `init_data` bo'lsa — shu; aks holda faqat DEMO_MODE'da (lokal sinov) eski `telegram_id` maydoni.
    """
    init_data = request.POST.get('init_data') or request.headers.get('X-Telegram-Init-Data', '')
    user = verify_init_data(init_data)
    if user:
        return str(user['id'])
    if getattr(settings, 'DEMO_MODE', False):
        return (request.POST.get('telegram_id') or '').strip()[:32]
    return ''
