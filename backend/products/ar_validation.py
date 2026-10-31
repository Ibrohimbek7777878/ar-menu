"""
Mahsulotning AR/3D model manzilini (`Product.ar_model`) tekshirish (P2.4).

Avval menyu admin API bu maydonni hech qanday tekshirmay saqlardi: `javascript:`, `data:`, `file:` sxemalari, ixtiyoriy
kengaytma, `../` bilan chiqib ketish, 200 belgidan uzun qiymat (PostgreSQL'da 500). Qiymat mijoz brauzerida
<model-viewer src="..."> ga qo'yiladi, shuning uchun faqat xavfsiz model havolalari qabul qilinadi:
  • o'z serveringizdagi yo'l (`/media/ar/glb/osh.glb`, `/models/plov.glb`), yoki
  • `https://host/yol/model.glb` (host bo'lishi shart, login:parol@host va ichki manzillar — localhost/shaxsiy IP — rad etiladi;
    `http://` faqat DEBUG da);
  • kengaytma AR ko'rsatgich formatlaridan biri: .glb, .gltf, .usdz (ar3d quvuri ham shularni yaratadi).
Server o'zida turgan fayl bo'lsa (`/media/...` va diskda mavjud) hajmi UPLOAD_MAX_MODEL_MB dan oshmasligi tekshiriladi.
Tashqi havolaning hajmi tekshirilmaydi (server uni yuklab olmaydi — SSRF xavfi).
"""
import ipaddress
import os
from urllib.parse import unquote, urlsplit

from django.conf import settings

AR_MODEL_EXTENSIONS = ('.glb', '.gltf', '.usdz')
AR_MODEL_MAX_LENGTH = 200       # Product.ar_model URLField(max_length=200)


class ArModelError(ValueError):
    pass


def _is_internal_host(host):
    host = (host or '').lower().rstrip('.')
    if host in ('localhost', '') or host.endswith(('.localhost', '.local', '.internal')):
        return True
    try:
        ip = ipaddress.ip_address(host.strip('[]'))
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_unspecified


def validate_ar_model_ref(value):
    """Tozalangan qiymat (yoki bo'sh bo'lsa None) qaytaradi; yaroqsiz bo'lsa ArModelError (o'zbekcha xabar)."""
    text = (value or '').strip() if isinstance(value, str) else ''
    if not text:
        return None
    if len(text) > AR_MODEL_MAX_LENGTH:
        raise ArModelError(f"3D model manzili {AR_MODEL_MAX_LENGTH} belgidan oshmasligi kerak")
    if any(ch.isspace() or ord(ch) < 32 or ch == '\\' for ch in text):
        raise ArModelError("3D model manzilida bo'shliq, boshqaruv belgilari yoki teskari chiziq bo'lishi mumkin emas")

    parts = urlsplit(text)
    scheme = parts.scheme.lower()
    if scheme:
        if scheme == 'http' and not settings.DEBUG:
            raise ArModelError("3D model manzili faqat https:// bo'lishi kerak")
        if scheme not in ('https', 'http'):
            raise ArModelError("3D model manzili faqat https:// yoki o'z serveringiz yo'li (/media/...) bo'lishi mumkin")
        host = parts.hostname
        if not host or '@' in parts.netloc:
            raise ArModelError("3D model manzilida to'g'ri host bo'lishi shart (login:parol@ mumkin emas)")
        if _is_internal_host(host) and not settings.DEBUG:
            raise ArModelError("3D model manzili ichki tarmoq (localhost/shaxsiy IP) bo'lishi mumkin emas")
    else:
        if not text.startswith('/') or text.startswith('//') or parts.netloc:
            raise ArModelError("3D model manzili /media/... ko'rinishidagi yo'l yoki https:// havola bo'lishi kerak")

    path = unquote(parts.path)
    if '..' in path.split('/'):
        raise ArModelError("3D model yo'lida '..' bo'lishi mumkin emas")
    if os.path.splitext(path)[1].lower() not in AR_MODEL_EXTENSIONS:
        raise ArModelError(f"3D model fayli {', '.join(AR_MODEL_EXTENSIONS)} formatlaridan biri bo'lishi kerak")

    if not scheme:
        media_prefix = '/' + str(settings.MEDIA_URL).strip('/') + '/'
        if path.startswith(media_prefix):
            disk = os.path.join(str(settings.MEDIA_ROOT), path[len(media_prefix):])
            limit = int(getattr(settings, 'UPLOAD_MAX_MODEL_MB', 15)) * 1024 * 1024
            if os.path.isfile(disk) and os.path.getsize(disk) > limit:
                raise ArModelError(f"3D model fayli {limit // (1024 * 1024)} MB dan oshmasligi kerak")
    return text


def validate_ar_model_form_value(raw, current=None):
    """
    HTML formalar (eski admin va sotuvchi paneli) uchun: forma yuborgan `ar_model` ni tekshiradi va saqlanadigan qiymatni
    (bo'sh bo'lsa None) qaytaradi; yaroqsiz bo'lsa ArModelError (o'zbekcha xabar) — API bilan AYNAN bir xil qoida.

    Mahsulotda allaqachon saqlangan (`current`) qiymat O'ZGARTIRILMAGAN bo'lsa qayta tekshirilmaydi: forma har safar butun
    maydonlar to'plamini yuboradi, eski (hozirgi qoidaga mos kelmaydigan) manzil bo'lsa ham narx yoki nomni tahrirlash
    to'silib qolmasligi kerak. Yangi yozilgan har qanday qiymat to'liq tekshiriladi.
    """
    text = raw.strip() if isinstance(raw, str) else ''
    if text and text == (current or '').strip():
        return text
    return validate_ar_model_ref(text)
