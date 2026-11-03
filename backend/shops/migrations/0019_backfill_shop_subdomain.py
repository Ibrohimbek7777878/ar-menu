# Mavjud do'konlarga `slug`dan subdomen to'ldiriladi (TZ_MULTITENANT Bosqich 0). Yaroqsiz (qisqa, band so'z, noto'g'ri belgi)
# yoki band nom uchun 'shop-<id>' ishlatiladi — shunda hech bir do'kon subdomensiz qolmaydi va hech biri o'chmaydi.
# Faqat bo'sh (NULL) subdomenlar to'ldiriladi: qayta ishga tushirish xavfsiz. Orqaga qaytarish — hech narsa qilmaydi
# (subdomen ustuni 0018 ni qaytarganda olib tashlanadi).
from django.db import migrations

from shops.tenancy import is_valid_subdomain, slug_to_subdomain


def backfill_subdomains(apps, schema_editor):
    Shop = apps.get_model('shops', 'Shop')
    taken = {s for s in Shop.objects.exclude(subdomain__isnull=True).values_list('subdomain', flat=True)}
    for shop in Shop.objects.filter(subdomain__isnull=True).order_by('id').only('id', 'slug'):
        candidate = slug_to_subdomain(shop.slug)
        if not candidate or candidate in taken:
            candidate = f'shop-{shop.pk}'
            if not is_valid_subdomain(candidate) or candidate in taken:     # 'shop-1' kabi: 3+ belgi; band bo'lsa raqam qo'shiladi
                n = 1
                while f'shop-{shop.pk}-{n}' in taken:
                    n += 1
                candidate = f'shop-{shop.pk}-{n}'
        taken.add(candidate)
        Shop.objects.filter(pk=shop.pk).update(subdomain=candidate)


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0018_shop_tenancy_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_subdomains, migrations.RunPython.noop),
    ]
