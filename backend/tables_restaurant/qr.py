"""
Bosma QR kodlar uchun asosiy domen (TZ: R1-10).

QR ichida stol raqami emas, doimiy tasodifiy token (/t/<uuid>/) turadi. Domen — RESTAURANT_PUBLIC_URL (production),
bo'lmasa so'rov kelgan sayt (lokal sinov).
"""
from django.conf import settings


def qr_base_url(request) -> str:
    return getattr(settings, 'RESTAURANT_PUBLIC_URL', '') or request.build_absolute_uri('/').rstrip('/')


def qr_svg(url: str) -> bytes:
    """URL uchun QR kod (SVG), serverning o'zida yasaladi.

    Avval seller shablonlari QR rasmini tashqi `api.qrserver.com` xizmatidan olardi: stol havolasi uchinchi tomonga
    ketardi va internet bo'lmasa QR chiqmasdi (F5). `segno` — sof Python, qo'shimcha bog'liqliksiz.
    """
    import io

    import segno
    buffer = io.BytesIO()
    segno.make(url, error='m').save(buffer, kind='svg', scale=8, border=2, xmldecl=False, svgns=True)
    return buffer.getvalue()
