"""TZ_SOTUVGA_TAYYORLASH_DESIGN_2026-09-23 — 1.2
Test seed skriptlari yozib qoldirgan generik variantlarni tozalash
(Rangi Oq/Ko'k, O'lchami XL/S/L, Og'irligi 500g/1kg/2kg va h.k.).
Sotuvchi paneli orqali real variantlar qayta qo'shilishi mumkin.
Ishga tushirish: cd backend && ./venv/bin/python manage.py shell < scripts/fix_variants_cleanup.py
"""
from collections import Counter

from products.models import Product

removed_counter = Counter()
cleaned = 0
for product in Product.objects.exclude(variants=[]).exclude(variants=None).iterator():
    variants = product.variants or []
    if not variants:
        continue
    for v in variants:
        removed_counter[v.get('name', '?')] += 1
    product.variants = []
    product.save(update_fields=['variants'])
    cleaned += 1

print(f"Tozalangan mahsulotlar: {cleaned}")
print(f"O'chirilgan variant guruhlari: {dict(removed_counter)}")
