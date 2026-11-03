"""Mehmon sahifasiga beriladigan restoran sozlamalari (fasl, animatsiya, taom oynasi, kun/tun, tillar) BITTA so'rov bilan.

Avval har sozlama alohida `Shop` so'rovi (kesh sovuq bo'lganda) edi; sozlamalar ko'payganda `/menu/` so'rovlar byudjeti
(web/test_query_budget.py) buzilardi. Endi hammasi bir marta o'qiladi va jarayon keshida saqlanadi. Alohida
`guest_*_for_shop_id` funksiyalari boshqa joylar uchun qoladi (o'chirilmagan).
"""
from shops.guest_dish_sheet import normalize_dish_sheet
from shops.guest_languages import DEFAULT_LANGUAGES, normalize_languages
from shops.guest_motion import DEFAULT_MOTION, normalize_motion
from shops.guest_season import normalize_season, resolve_season
from shops.guest_theme import DEFAULT_THEME, normalize_theme


def _load(shop_id):
    from shops.models import Shop
    raw = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    bp = raw if isinstance(raw, dict) else {}
    return {
        'season': normalize_season(bp.get('guest_season')),
        'motion': normalize_motion(bp.get('guest_motion')),
        'dish_sheet': normalize_dish_sheet(bp.get('guest_dish_sheet')),
        'theme': normalize_theme(bp.get('guest_theme')),
        'languages': normalize_languages(bp.get('guest_languages')),
    }


def guest_session_extras(shop_id, now=None):
    """`window.__GULISTON_SESSION__` ga qo'shiladigan kalitlar; standart qiymatda kalit yo'q (javob avvalgidek)."""
    if not shop_id:
        return {}
    from backend.runtime_cache import cached_shop_value
    s = cached_shop_value(shop_id, 'guest_profile', lambda: _load(shop_id))
    extras = {}
    season = resolve_season(s['season'], now)
    if season:
        extras['season'] = season
    if s['motion'] != DEFAULT_MOTION:
        extras['motion'] = s['motion']
    if s['dish_sheet'] == 'off':
        extras['dishSheet'] = 'off'
    if s['theme'] != DEFAULT_THEME:
        extras['theme'] = s['theme']
    if s['languages'] != DEFAULT_LANGUAGES:
        extras['languages'] = s['languages']
    return extras
