"""Mehmon sayti tillari (restoran sozlamasi `Shop.business_profile['guest_languages']`, admin: /ra/settings -> "Tillar").

Qiymat — yoqilgan tillar ro'yxati, vergul bilan: `uz,ru,en` (standart, hammasi). Birinchi til — tarjimasi bo'lmagan
mehmon uchun asosiy til. Noma'lum kodlar tashlanadi, takrorlar olib tashlanadi, bo'sh qolsa standart: sayt hech qachon
tilsiz qolmaydi. Mehmon tilni o'zi almashtiradi (frontend/src/i18n).
"""

LANGUAGE_CODES = ('uz', 'ru', 'en')
DEFAULT_LANGUAGES = 'uz,ru,en'


def normalize_languages(value):
    if isinstance(value, (list, tuple)):
        parts = [str(v) for v in value]
    else:
        parts = str(value or '').split(',')
    codes = []
    for part in parts:
        code = part.strip().lower()
        if code in LANGUAGE_CODES and code not in codes:
            codes.append(code)
    return ','.join(codes) if codes else DEFAULT_LANGUAGES


def is_valid_languages(value):
    """Admin kiritganda qat'iy tekshiruv: faqat ma'lum kodlar va kamida bittasi."""
    parts = [p.strip().lower() for p in str(value or '').split(',')]
    return bool(parts) and all(p in LANGUAGE_CODES for p in parts) and len(set(parts)) == len(parts)


def _load_shop_setting(shop_id):
    from shops.models import Shop
    profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    return normalize_languages(profile.get('guest_languages') if isinstance(profile, dict) else None)


def guest_languages_for_shop_id(shop_id):
    """Mehmon sahifasiga: yoqilgan tillar; hammasi yoqiq (standart) bo'lsa '' (javobda kalit yo'q). Jarayon keshidan o'qiladi."""
    if not shop_id:
        return ''
    from backend.runtime_cache import cached_shop_value
    value = cached_shop_value(shop_id, 'guest_languages', lambda: _load_shop_setting(shop_id))
    return '' if value == DEFAULT_LANGUAGES else value
