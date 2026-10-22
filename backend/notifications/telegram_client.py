"""
Telegram'ga yuborishning yagona past darajali klienti (TZ: R3-1, R3-3, R3-4).

Avval ikkita nusxa bor edi (`telegram_service._send_message` — dict, `telegram_bot.send_message` — bool), ikkalasi ham:
  • tokenni modul import qilinganda o'qirdi (keyin o'zgartirib bo'lmasdi, testda esa haqiqiy kalitga bog'liq);
  • xatoni "qayta urinsa bo'ladimi yoki yo'qmi" deb ajratmasdi — outbox esa har doim "bajarildi" deb belgilardi;
  • matnda `&`/`<` bo'lsa Telegram 400 qaytarardi va oshxona buyurtmani umuman olmasdi.

`send()` hech qachon istisno ko'tarmaydi va tokenni xato matniga qo'shmaydi.
"""
import html
import logging
import re
from dataclasses import dataclass

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_API_BASE = 'https://api.telegram.org'
TIMEOUT = 8
_TAG = re.compile(r'</?(?:b|i|u|s|a|code|pre|em|strong|tg-spoiler)(?:\s[^>]*)?>', re.IGNORECASE)


@dataclass
class SendResult:
    ok: bool
    error: str = ''
    retryable: bool = False       # tarmoq/5xx/429 — keyinroq urinib ko'rish mantiqli
    retry_after: int = 0          # Telegram 429 bergan kutish (soniya)
    skipped: bool = False         # bot sozlanmagan: xato emas, sozlama holati

    def as_dict(self):
        """Eski `_send_message` formati bilan moslik."""
        return {'success': self.ok, 'error': self.error, 'retryable': self.retryable, 'skipped': self.skipped,
                'retry_after': self.retry_after}

    def __bool__(self):
        return self.ok


def get_token(bot_key='restaurant') -> str:
    from notifications.bots import get_bot_token
    return (get_bot_token(bot_key) or '').strip()


def strip_html(text: str) -> str:
    """Telegram HTML belgilarini olib tashlab, oddiy matn qiladi (parse xatosi uchun zaxira)."""
    return html.unescape(_TAG.sub('', text or ''))


def esc(value) -> str:
    """Foydalanuvchi matnini Telegram HTML uchun xavfsiz qiladi (ism, manzil, izoh, taom nomi)."""
    return html.escape('' if value is None else str(value), quote=False)


def _mask(text: str, token: str) -> str:
    return text.replace(token, '***') if token else text


def _post(token, method, payload):
    # TELEGRAM_API_BASE: lokal Bot API serveri yoki sinov uchun soxta server (standart: rasmiy Telegram)
    base = (getattr(settings, 'TELEGRAM_API_BASE', '') or DEFAULT_API_BASE).rstrip('/')
    return httpx.post(f'{base}/bot{token}/{method}', json=payload, timeout=TIMEOUT)


def send(chat_id, text, parse_mode='HTML', reply_markup=None, bot_key='restaurant') -> SendResult:
    token = get_token(bot_key)
    if not token:
        return SendResult(False, 'Bot token topilmadi', skipped=True)
    if not chat_id:
        return SendResult(False, 'Chat ID kiritilmagan')

    payload = {'chat_id': str(chat_id), 'text': (text or '')[:4096]}
    if parse_mode:
        payload['parse_mode'] = parse_mode
    if reply_markup:
        payload['reply_markup'] = reply_markup

    try:
        resp = _post(token, 'sendMessage', payload)
    except Exception as exc:                                    # tarmoq, DNS, timeout
        return SendResult(False, _mask(f'{type(exc).__name__}: {exc}', token)[:300], retryable=True)

    try:
        data = resp.json()
    except ValueError:
        data = {}
    if resp.status_code == 200 and data.get('ok'):
        return SendResult(True)

    description = str(data.get('description') or f'HTTP {resp.status_code}')
    # Matn HTML sifatida o'qilmadi (kutilmagan belgi): xabar yo'qolmasin, oddiy matn qilib qayta yuboramiz
    if resp.status_code == 400 and parse_mode and "can't parse entities" in description.lower():
        logger.warning('[Telegram] HTML parse xatosi, oddiy matn bilan qayta yuborilmoqda: %s', description)
        plain = dict(payload)
        plain.pop('parse_mode', None)
        plain['text'] = strip_html(payload['text'])
        try:
            retry = _post(token, 'sendMessage', plain)
            if retry.status_code == 200 and retry.json().get('ok'):
                return SendResult(True)
        except Exception as exc:
            return SendResult(False, _mask(str(exc), token)[:300], retryable=True)

    retry_after = int((data.get('parameters') or {}).get('retry_after') or 0)
    retryable = resp.status_code == 429 or resp.status_code >= 500
    return SendResult(False, description[:300], retryable=retryable, retry_after=retry_after)


def call(method, payload, bot_key='restaurant') -> SendResult:
    """Boshqa Bot API metodlari (answerCallbackQuery, sendLocation, ...)."""
    token = get_token(bot_key)
    if not token:
        return SendResult(False, 'Bot token topilmadi', skipped=True)
    try:
        resp = _post(token, method, payload)
        data = resp.json()
        if resp.status_code == 200 and data.get('ok'):
            return SendResult(True)
        return SendResult(False, str(data.get('description') or f'HTTP {resp.status_code}')[:300],
                          retryable=resp.status_code >= 500)
    except Exception as exc:
        return SendResult(False, _mask(str(exc), token)[:300], retryable=True)
