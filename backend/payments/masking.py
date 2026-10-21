"""
To'lov provayderlari javoblarini bazaga yozishdan oldin maxfiy maydonlarni yashirish (TZ: R1-7).

`Payment.raw_request` / `raw_response` provayder javobini to'liq saqlardi — karta raqami, imzo, token va kalitlar
ham ochiq holda bazada (va zaxira nusxalarida) qolardi. Bu yerda ular niqoblanadi; summa, holat va tranzaksiya
identifikatorlari (nizolarni hal qilish uchun kerak) saqlanadi.
"""
import re

MASK = '***'

# Kalit nomi so'zlarga bo'linadi (card_number, cardNumber, X-Auth-Token): "shipping" yoki "design" kabi
# oddiy nomlar tasodifan niqoblanmasligi uchun qism-satr emas, butun so'z solishtiriladi.
_SENSITIVE_WORDS = {'pan', 'cvv', 'cvc', 'pin', 'secret', 'password', 'passwd', 'token', 'signature', 'sign',
                    'auth', 'authorization'}
_SENSITIVE_COMPOUNDS = ('cardnumber', 'cardno', 'apikey', 'privatekey', 'secretkey')
_CARD_NUMBER = re.compile(r'(?<!\d)(\d{6})\d{3,9}(\d{4})(?!\d)')


def _is_sensitive_key(key) -> bool:
    words = [w for w in re.split(r'[^a-z0-9]+', re.sub(r'(?<=[a-z])(?=[A-Z])', '_', str(key)).lower()) if w]
    return any(w in _SENSITIVE_WORDS for w in words) or any(c in ''.join(words) for c in _SENSITIVE_COMPOUNDS)


def _mask_string(value: str) -> str:
    # 13–19 xonali ketma-ketlik (karta raqami) — faqat birinchi 6 va oxirgi 4 raqam qoladi
    return _CARD_NUMBER.sub(lambda m: f"{m.group(1)}{'*' * 6}{m.group(2)}", value)


def mask_sensitive(payload):
    """Rekursiv: maxfiy kalitlar qiymati '***' ga, matnlardagi karta raqamlari qisman yashiriladi."""
    if isinstance(payload, dict):
        return {
            key: (MASK if _is_sensitive_key(key) and value not in (None, '', 0, False)
                  else mask_sensitive(value))
            for key, value in payload.items()
        }
    if isinstance(payload, (list, tuple)):
        return [mask_sensitive(item) for item in payload]
    if isinstance(payload, str):
        return _mask_string(payload)
    return payload
