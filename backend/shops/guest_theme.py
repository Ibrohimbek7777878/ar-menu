"""Mehmon sayti kun/tun rejimi (restoran sozlamasi `Shop.business_profile['guest_theme']`, admin: /ra/settings).

Qiymatlar: `day` (standart: yangi mehmon "Kun" ko'radi, almashtirgich bor), `night` (yangi mehmon "Tun" ko'radi),
`auto` (telefon/Telegram mavzusiga ergashadi), `off` (qorong'i rejim umuman yo'q, almashtirgich ko'rinmaydi).
Mehmonning o'z tanlovi brauzerda eslab qolinadi va sozlamadan ustun turadi (frontend/src/utils/guestTheme.ts).
Noma'lum yoki buzuq qiymat saytni buzmaydi: `day`. Eski ko'rinish o'chirilmaydi, faqat boshqariladi (AGENTS 4-qoida).
"""

THEME_CHOICES = ('day', 'night', 'auto', 'off')
DEFAULT_THEME = 'day'


def normalize_theme(value):
    value = str(value or '').strip().lower()
    return value if value in THEME_CHOICES else DEFAULT_THEME


def _load_shop_setting(shop_id):
    from shops.models import Shop
    profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    return normalize_theme(profile.get('guest_theme') if isinstance(profile, dict) else None)


def guest_theme_for_shop_id(shop_id):
    """Mehmon sahifasiga: 'night' | 'auto' | 'off'; standart (`day`) bo'lsa '' (javobda kalit yo'q). Jarayon keshidan o'qiladi."""
    if not shop_id:
        return ''
    from backend.runtime_cache import cached_shop_value
    value = cached_shop_value(shop_id, 'guest_theme', lambda: _load_shop_setting(shop_id))
    return '' if value == DEFAULT_THEME else value
