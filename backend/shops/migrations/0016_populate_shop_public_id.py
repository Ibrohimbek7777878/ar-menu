# Generated for Shop.public_id 3-step migration (Step 2: populate existing rows)
import uuid
from django.db import migrations


def populate_shop_public_ids(apps, schema_editor):
    Shop = apps.get_model('shops', 'Shop')
    for shop in Shop.objects.filter(public_id__isnull=True):
        shop.public_id = uuid.uuid4()
        shop.save(update_fields=['public_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0015_shop_public_id'),
    ]

    operations = [
        migrations.RunPython(populate_shop_public_ids, reverse_code=migrations.RunPython.noop),
    ]
