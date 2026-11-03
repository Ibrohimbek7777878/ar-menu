"""
Admin paneldan (AppSetting) yoki .env dan sozlama o'qish yordamchisi (AGENTS.md 4-qoida: kodni o'zgartirmasdan sozlash).
Qiymat butun son bo'lmasa yoki chegaradan chiqsa — xavfsiz standart/chegara.

Multi-tenant (shops/tenant_settings.py): restoranga oid kalitlar avval `Shop.business_profile[kalit]` dan o'qiladi
(`shop=` uzatilsa o'sha do'kon, aks holda joriy tenant), keyin global AppSetting, keyin .env, keyin standart.
"""
from django.conf import settings


def _raw(key, default, shop=None):
    """Sozlamaning xom qiymati: do'kon -> AppSetting -> .env -> default (hech biri bo'lmasa `default`)."""
    from backend.runtime_cache import get_app_setting
    from shops.tenant_settings import shop_value
    value = shop_value(key, shop, explicit=shop is not None)
    if value is not None:
        return value, True
    value = get_app_setting(key)
    return (value if value is not None else getattr(settings, key.upper(), default)), False


def get_int(key, default, minimum, maximum, shop=None):
    raw, from_shop = _raw(key, default, shop)
    try:
        return max(minimum, min(maximum, int(raw)))
    except (TypeError, ValueError):
        if from_shop:                    # restoranning noto'g'ri qiymati saytni buzmasin: global zaxiraga tushadi
            return get_int(key, default, minimum, maximum, shop=_NO_SHOP)
        return default


def get_choice(key, default, choices, shop=None):
    """Do'kon/AppSetting/.env dagi qiymat `choices` ichida bo'lmasa — `default` (noto'g'ri sozlama saytni buzmasin)."""
    raw, from_shop = _raw(key, default, shop)
    value = str(raw).strip().lower()
    if value in choices:
        return value
    if from_shop:
        return get_choice(key, default, choices, shop=_NO_SHOP)
    return default


def get_bool(key, default=False, shop=None):
    """AppSetting yoki .env dan boolean sozlama o'qish (standart: default)."""
    raw, _ = _raw(key, default, shop)
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() in ('1', 'true', 'yes', 'on')


def set_setting(key, value):
    """AppSetting qiymatini saqlash yoki yangilash."""
    from notifications.models import AppSetting
    row, _ = AppSetting.objects.update_or_create(
        key=key.lower(),
        defaults={'value': str(value)},
    )
    return row  # post_save signali jarayon keshini tozalaydi (backend/runtime_cache.py)


class _NoShop:
    """Do'kon qiymatini ataylab o'tkazib yuborish belgisi (tenant fallback ham ishlamasin): `business_profile` yo'q."""
    business_profile = None


_NO_SHOP = _NoShop()
