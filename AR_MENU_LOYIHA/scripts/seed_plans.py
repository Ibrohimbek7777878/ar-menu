"""Tariflarni yaratadi/yangilaydi. Qayta-qayta ishga tushirsa xavfsiz (idempotent).
TZ bo'yicha: FREE/START/PRO/PRO_FISKAL
Narxlar: 0 / 199000 / 590000 / 890000
Table limit: 5 / 15 / 60 / 60
"""
import os, sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.tenants.models import Plan

PLANS = [
    dict(code='free', name_uz='Bepul', name_ru='Бесплатный', name_en='Free',
         price_month_uzs=0, price_year_uzs=0,
         table_limit=5, dish_limit=30, ar_model_limit=0, staff_limit=3,
         ai_daily_usd=0, order=1,
         features={'custom_domain': False, 'fiscal': False, 'analytics_pro': False}),
    dict(code='start', name_uz='Start', name_ru='Старт', name_en='Start',
         price_month_uzs=199000, price_year_uzs=1990000,
         table_limit=15, dish_limit=150, ar_model_limit=10, staff_limit=10,
         ai_daily_usd=0.5, order=2,
         features={'custom_domain': False, 'fiscal': False, 'analytics_pro': False}),
    dict(code='pro', name_uz='Pro', name_ru='Про', name_en='Pro',
         price_month_uzs=590000, price_year_uzs=5900000,
         table_limit=60, dish_limit=-1, ar_model_limit=50, staff_limit=50,
         ai_daily_usd=2.0, order=3,
         features={'custom_domain': True, 'fiscal': False, 'analytics_pro': True}),
    dict(code='pro_fiskal', name_uz='Pro+Fiskal', name_ru='Про+Фискальный', name_en='Pro+Fiscal',
         price_month_uzs=890000, price_year_uzs=8900000,
         table_limit=60, dish_limit=-1, ar_model_limit=50, staff_limit=50,
         ai_daily_usd=2.0, order=4,
         features={'custom_domain': True, 'fiscal': True, 'analytics_pro': True}),
]

for p in PLANS:
    obj, created = Plan.objects.update_or_create(code=p['code'], defaults=p)
    print(('+ yaratildi' if created else '~ yangilandi'), obj.code, f"→ {obj.price_month_uzs:,} UZS/oy, {obj.table_limit} stol")
print('Jami tarif:', Plan.objects.count())
