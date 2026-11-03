"""Mehmon "taom oynasi" (taom kartasini bosganda pastdan ochiladigan oyna) yoqilganmi: `Shop.business_profile['guest_dish_sheet']`.

Qiymatlar: `on` (standart) yoki `off` (karta avvalgidek: faqat 3D taomning rasmini bosganda 3D oyna ochiladi). Admin: /ra/settings.
Noma'lum qiymat saytni buzmaydi: `on`. Eski xatti-harakat o'chirilmaydi, faqat yashiriladi (AGENTS 4-qoida).
"""

DISH_SHEET_CHOICES = ('on', 'off')
DEFAULT_DISH_SHEET = 'on'


def normalize_dish_sheet(value):
    value = str(value or '').strip().lower()
    return value if value in DISH_SHEET_CHOICES else DEFAULT_DISH_SHEET


def _load_shop_setting(shop_id):
    from shops.models import Shop
    profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    return normalize_dish_sheet(profile.get('guest_dish_sheet') if isinstance(profile, dict) else None)


def guest_dish_sheet_for_shop_id(shop_id):
    """Mehmon sahifasiga: 'off' yoki '' (standart `on`: javobda kalit yo'q). Jarayon keshidan o'qiladi."""
    if not shop_id:
        return ''
    from backend.runtime_cache import cached_shop_value
    value = cached_shop_value(shop_id, 'guest_dish_sheet', lambda: _load_shop_setting(shop_id))
    return 'off' if value == 'off' else ''
