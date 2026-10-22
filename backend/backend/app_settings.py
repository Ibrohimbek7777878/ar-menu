"""
Admin paneldan (AppSetting) yoki .env dan sozlama o'qish yordamchisi (AGENTS.md 4-qoida: kodni o'zgartirmasdan sozlash).
Qiymat butun son bo'lmasa yoki chegaradan chiqsa — xavfsiz standart/chegara.
"""
from django.conf import settings


def get_int(key, default, minimum, maximum):
    from notifications.models import AppSetting
    row = AppSetting.objects.filter(key=key.lower()).first()
    raw = row.value if row is not None else getattr(settings, key.upper(), default)
    try:
        return max(minimum, min(maximum, int(raw)))
    except (TypeError, ValueError):
        return default
