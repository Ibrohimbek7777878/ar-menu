"""Mehmon sayti animatsiya darajasi (restoran sozlamasi `Shop.business_profile['guest_motion']`, admin: /ra/settings).

Qiymatlar: `full` (standart: hozirgi va yangi animatsiyalar), `light` (faqat bir martalik effektlar, cheksiz animatsiyalarsiz),
`off` (animatsiyasiz). Noma'lum yoki buzuq qiymat saytni buzmaydi: `full`. Zaif qurilmada brauzer `full` ni o'zi `light` ga
tushiradi (frontend/src/utils/guestMotion.ts); server faqat sozlamani beradi.
"""

MOTION_CHOICES = ('full', 'light', 'off')
DEFAULT_MOTION = 'full'


def normalize_motion(value):
    value = str(value or '').strip().lower()
    return value if value in MOTION_CHOICES else DEFAULT_MOTION


def _load_shop_setting(shop_id):
    from shops.models import Shop
    profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    return normalize_motion(profile.get('guest_motion') if isinstance(profile, dict) else None)


def guest_motion_for_shop_id(shop_id):
    """Mehmon sahifasiga beriladigan daraja: 'light' | 'off'; standart (`full`) bo'lsa '' (javobda kalit yo'q).
    Sozlama jarayon keshidan o'qiladi: qo'shimcha SQL yo'q."""
    if not shop_id:
        return ''
    from backend.runtime_cache import cached_shop_value
    value = cached_shop_value(shop_id, 'guest_motion', lambda: _load_shop_setting(shop_id))
    return '' if value == DEFAULT_MOTION else value
