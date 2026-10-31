"""
Admin paneldan (AppSetting) yoki .env dan sozlama o'qish yordamchisi (AGENTS.md 4-qoida: kodni o'zgartirmasdan sozlash).
Qiymat butun son bo'lmasa yoki chegaradan chiqsa — xavfsiz standart/chegara.
"""
from django.conf import settings


def get_int(key, default, minimum, maximum):
    from backend.runtime_cache import get_app_setting
    value = get_app_setting(key)
    raw = value if value is not None else getattr(settings, key.upper(), default)
    try:
        return max(minimum, min(maximum, int(raw)))
    except (TypeError, ValueError):
        return default


def get_choice(key, default, choices):
    """AppSetting yoki .env dagi qiymat `choices` ichida bo'lmasa — `default` (noto'g'ri sozlama saytni buzmasin)."""
    from backend.runtime_cache import get_app_setting
    value = get_app_setting(key)
    raw = value if value is not None else getattr(settings, key.upper(), default)
    value = str(raw).strip().lower()
    return value if value in choices else default


def get_bool(key, default=False):
    """AppSetting yoki .env dan boolean sozlama o'qish (standart: default)."""
    from backend.runtime_cache import get_app_setting
    value = get_app_setting(key)
    raw = value if value is not None else getattr(settings, key.upper(), default)
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


