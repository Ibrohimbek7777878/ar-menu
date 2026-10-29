# Generated for Shop.public_id 3-step migration (Step 1: add null=True without default)
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0014_widen_template_slugs'),
    ]

    operations = [
        migrations.AddField(
            model_name='shop',
            name='public_id',
            field=models.UUIDField(null=True, editable=False),
        ),
    ]
