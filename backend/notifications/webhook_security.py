"""
Telegram webhook haqiqiyligini tekshirish (TZ: R-SEC-12).

Avval webhook'lar hech narsani tekshirmas edi: istalgan kishi soxta "update" yuborib,
o'zini admin chat_id si bilan ko'rsatib, admin buyruqlarini bajara olardi.

Telegram `setWebhook(secret_token=...)` dan keyin har so'rovga
`X-Telegram-Bot-Api-Secret-Token` header'ini qo'shadi. Secret bot tokeni va SECRET_KEY dan
deterministik hosil qilinadi — yangi .env sozlamasi kerak emas, ro'yxatdan o'tkazish
(set_telegram_webhook / set_bot_webhook) va tekshiruv bir xil qiymatni ishlatadi.
Kerak bo'lsa TELEGRAM_WEBHOOK_SECRET orqali aniq qiymat berish mumkin.
"""
import hashlib
import hmac

from django.conf import settings


def webhook_secret_for(bot_token: str) -> str:
    explicit = (getattr(settings, 'TELEGRAM_WEBHOOK_SECRET', '') or '').strip()
    if explicit:
        return explicit
    if not bot_token:
        return ''
    # Telegram talabi: 1–256 belgi, A-Z a-z 0-9 _ - ; hex digest mos keladi
    return hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        f"telegram-webhook:{bot_token}".encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def is_valid_telegram_webhook(request, bot_token: str) -> bool:
    expected = webhook_secret_for(bot_token)
    if not expected:
        return False
    received = request.META.get('HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN', '')
    return bool(received) and hmac.compare_digest(received, expected)
