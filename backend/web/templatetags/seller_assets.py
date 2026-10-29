"""
Shablon yordamchisi: klassik Seller/Admin paneli (base.html merosxo'rlari) aktivlari manbasini tanlaydi.

`{% seller_assets_mode as assets_mode %}` -> 'local' (standart) yoki 'cdn' (eski xatti-harakat, zaxira).
Manba: admin paneldagi AppSetting 'seller_assets' (kodni o'zgartirmasdan almashtirish — AGENTS.md 4-qoida),
bo'lmasa settings.SELLER_ASSETS (.env). Noto'g'ri qiymat -> 'local'. Qo'shimcha DB so'rovi yo'q:
site_context context-processor har so'rovda AppSetting'larni `public_settings` ichiga allaqachon yuklagan.
"""
from django import template
from django.conf import settings

register = template.Library()

ASSET_MODES = ('local', 'cdn')


@register.simple_tag(takes_context=True)
def seller_assets_mode(context):
    raw = None
    public_settings = context.get('public_settings')
    if isinstance(public_settings, dict):
        raw = public_settings.get('seller_assets')
    if raw is None or str(raw).strip() == '':
        raw = getattr(settings, 'SELLER_ASSETS', 'local')
    value = str(raw).strip().lower()
    return value if value in ASSET_MODES else 'local'
