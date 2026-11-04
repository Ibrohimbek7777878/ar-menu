"""Mehmon sahifasiga beriladigan restoran sozlamalari (fasl, animatsiya, taom oynasi, kun/tun, tillar, BREND) BITTA so'rov bilan.

Avval har sozlama alohida `Shop` so'rovi (kesh sovuq bo'lganda) edi; sozlamalar ko'payganda `/menu/` so'rovlar byudjeti
(web/test_query_budget.py) buzilardi. Endi hammasi bir marta o'qiladi va jarayon keshida saqlanadi. Alohida
`guest_*_for_shop_id` funksiyalari boshqa joylar uchun qoladi (o'chirilmagan).
"""
import copy

from shops import brand_color
from shops.brand import SHOP_BRAND_COLUMNS, brand_css_colors, build_brand, public_brand
from shops.guest_dish_sheet import normalize_dish_sheet
from shops.guest_languages import DEFAULT_LANGUAGES, normalize_languages
from shops.guest_motion import DEFAULT_MOTION, normalize_motion
from shops.guest_palette import DEFAULT_PALETTE, normalize_palette
from shops.guest_season import normalize_season, resolve_season
from shops.guest_theme import DEFAULT_THEME, normalize_theme


def _load(shop_id):
    from shops.models import Shop
    row = Shop.objects.filter(pk=shop_id).values('business_profile', *SHOP_BRAND_COLUMNS).first() or {}
    raw = row.get('business_profile')
    bp = raw if isinstance(raw, dict) else {}
    full_brand = build_brand(row, bp, shop_id) if row else None
    palette = normalize_palette(bp.get('guest_palette'))
    return {
        'season': normalize_season(bp.get('guest_season')),
        'motion': normalize_motion(bp.get('guest_motion')),
        'dish_sheet': normalize_dish_sheet(bp.get('guest_dish_sheet')),
        'theme': normalize_theme(bp.get('guest_theme')),
        'languages': normalize_languages(bp.get('guest_languages')),
        'palette': palette,
        # Brend: ochiq (kichik) qism va `palette == 'custom'` bo'lsa CSS uchun xom ranglar — jarayon keshida (CSS matnini brand_color keshlaydi)
        'brand': public_brand(full_brand) if full_brand else None,
        'brand_colors': brand_css_colors(full_brand, bp) if full_brand else None,
        # Restoranning o'z dizayn tartibi (new/classic); bo'sh = restoran tanlamagan, global sozlama (AppSetting) amal qiladi
        'design': (str(bp.get('guest_design') or '').strip().lower() if str(bp.get('guest_design') or '').strip().lower() in ('new', 'classic') else ''),
    }


def guest_profile(shop_id, request=None):
    """Restoranning mehmon sozlamalari (normallangan). Bitta so'rov ichida (`request`) bir marta o'qiladi: sahifada `<html data-palette>`
    va `window.__GULISTON_SESSION__` ikkalasi ham kerak bo'lsa ikkinchi SQL ketmaydi."""
    if not shop_id:
        return None
    memo = getattr(request, '_gulistan_guest_profile', None) if request is not None else None
    if memo is not None and memo[0] == shop_id:
        return memo[1]
    from backend.runtime_cache import cached_shop_value
    value = cached_shop_value(shop_id, 'guest_profile', lambda: _load(shop_id))
    if request is not None:
        try:
            request._gulistan_guest_profile = (shop_id, value)
        except Exception:  # noqa: BLE001 — so'rov obyekti o'zgartirib bo'lmasa, faqat memo yo'q
            pass
    return value


def guest_palette_for_shop_id(shop_id, request=None):
    """`<html data-palette>` uchun: 'classic' (standart) yoki 'orange'."""
    s = guest_profile(shop_id, request)
    return s['palette'] if s else DEFAULT_PALETTE


def guest_brand_css_for_shop_id(shop_id, request=None, scope='all'):
    """`<style id="brand-vars">` ichidagi matn (faqat `palette == 'custom'`), aks holda ''. `scope`: guest | admin | all (brand_color.CSS_SCOPES)."""
    s = guest_profile(shop_id, request)
    colors = s.get('brand_colors') if s else None
    return brand_color.build_brand_css(colors[0], colors[1], scope) if colors else ''


def guest_brand_for_shop_id(shop_id, request=None):
    """Ochiq brend (nom, logotip, palitra, shrift, bosh sahifa matnlari, aloqa, bo'limlar, atamalar) yoki None."""
    s = guest_profile(shop_id, request)
    return s['brand'] if s else None


def guest_session_extras(shop_id, now=None, request=None):
    """`window.__GULISTON_SESSION__` ga qo'shiladigan kalitlar; standart qiymatda kalit yo'q (javob avvalgidek)."""
    s = guest_profile(shop_id, request)
    if not s:
        return {}
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
    if s['palette'] != DEFAULT_PALETTE:
        extras['palette'] = s['palette']
    # Brend DOIM yuboriladi: mehmon ilovasi nom va logotipni kutadi (hajmi kichik: ~0.5 KB). Nusxa: kesh buzilmasin.
    if s.get('brand'):
        extras['brand'] = copy.deepcopy(s['brand'])
    return extras
