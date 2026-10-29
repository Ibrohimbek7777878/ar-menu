"""
Shop.public_id populate migratsiyasi (2-qadam: bo'sh va takroriy UUID'larni to'ldirish).

DIQQAT: Agar dev bazada 0016 ilgari qo'llangan va 0017 yiqilgan bo'lsa,
orqaga qaytib, yangilangan 0016 bilan qayta ishga tushiring:
    python manage.py migrate shops 0015
    python manage.py migrate
"""
import uuid
from django.db import migrations


def populate_shop_public_ids(apps, schema_editor):
    Shop = apps.get_model('shops', 'Shop')
    seen_uuids = set()

    for shop in Shop.objects.order_by('id'):
        if not shop.public_id or shop.public_id in seen_uuids:
            new_id = uuid.uuid4()
            while new_id in seen_uuids:
                new_id = uuid.uuid4()
            shop.public_id = new_id
            shop.save(update_fields=['public_id'])
            seen_uuids.add(new_id)
        else:
            seen_uuids.add(shop.public_id)


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0015_shop_public_id'),
    ]

    operations = [
        migrations.RunPython(populate_shop_public_ids, reverse_code=migrations.RunPython.noop),
    ]
