"""TZ_SOTUVGA_TAYYORLASH_DESIGN_2026-09-23 — 1.1
reviews_count/rating maydonlarini real Review qatorlari bilan sinxronlash.
Ishga tushirish: cd backend && ./venv/bin/python manage.py shell < scripts/fix_reviews_sync.py
Idempotent — qayta ishga tushirsa ham zarari yo'q.
"""
from django.db.models import Count, Avg

from notifications.models import Review
from products.models import Product

fixed = 0
skipped = 0
for product in Product.objects.iterator():
    agg = product.reviews.aggregate(avg=Avg('rating'), cnt=Count('id'))
    real_rating = round(agg['avg'], 1) if agg['avg'] is not None else 0.0
    real_count = agg['cnt'] or 0
    if product.reviews_count != real_count or float(product.rating or 0) != float(real_rating):
        old = (product.rating, product.reviews_count)
        product.rating = real_rating
        product.reviews_count = real_count
        product.save(update_fields=['rating', 'reviews_count'])
        fixed += 1
        if fixed <= 10:
            print(f"  {product.name}: {old} -> ({real_rating}, {real_count})")
    else:
        skipped += 1

print(f"Tayyor: {fixed} mahsulot tuzatildi, {skipped} allaqachon to'g'ri edi")
