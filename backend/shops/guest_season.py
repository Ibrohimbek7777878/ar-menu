"""Mehmon sayti fasl rangi (restoran sozlamasi `Shop.business_profile['guest_season']`, admin: /ra/settings -> "Fasl rangi").

Qiymatlar: `off` (standart, ranglar o'zgarmaydi), `auto` (oyga qarab), `kuz`, `qish`, `bahor`, `yoz`.
Noma'lum yoki buzuq qiymat saytni buzmaydi: `off` deb qabul qilinadi.
"""
from django.utils import timezone

SEASON_CHOICES = ('off', 'auto', 'kuz', 'qish', 'bahor', 'yoz')
DEFAULT_SEASON = 'off'

# Toshkent vaqti (settings.TIME_ZONE) bo'yicha: dek–fev qish, mar–may bahor, iyun–avg yoz, sen–noy kuz
_MONTH_SEASON = {12: 'qish', 1: 'qish', 2: 'qish', 3: 'bahor', 4: 'bahor', 5: 'bahor',
                 6: 'yoz', 7: 'yoz', 8: 'yoz', 9: 'kuz', 10: 'kuz', 11: 'kuz'}


def normalize_season(value):
    value = str(value or '').strip().lower()
    return value if value in SEASON_CHOICES else DEFAULT_SEASON


def resolve_season(value, now=None):
    """Sozlama qiymatidan mehmon sahifasiga beriladigan fasl: 'kuz' | 'qish' | 'bahor' | 'yoz', o'chiq bo'lsa ''.

    `auto` har chaqiruvda hisoblanadi (keshlanmaydi): oy almashganda sahifa o'zi yangilanadi.
    """
    value = normalize_season(value)
    if value == 'off':
        return ''
    if value == 'auto':
        return _MONTH_SEASON[timezone.localtime(now).month]
    return value


def _load_shop_setting(shop_id):
    from shops.models import Shop
    profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    return normalize_season(profile.get('guest_season') if isinstance(profile, dict) else None)


def guest_season_for_shop_id(shop_id, now=None):
    """Restoranning joriy fasli (''/kuz/qish/bahor/yoz). Sozlama jarayon keshidan o'qiladi: qo'shimcha SQL yo'q."""
    if not shop_id:
        return ''
    from backend.runtime_cache import cached_shop_value
    return resolve_season(cached_shop_value(shop_id, 'guest_season', lambda: _load_shop_setting(shop_id)), now)
