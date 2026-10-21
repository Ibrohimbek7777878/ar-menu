"""
Bosma QR kodlar uchun asosiy domen (TZ: R1-10).

QR ichida stol raqami emas, doimiy tasodifiy token (/t/<uuid>/) turadi. Domen — RESTAURANT_PUBLIC_URL (production),
bo'lmasa so'rov kelgan sayt (lokal sinov).
"""
from django.conf import settings


def qr_base_url(request) -> str:
    return getattr(settings, 'RESTAURANT_PUBLIC_URL', '') or request.build_absolute_uri('/').rstrip('/')
