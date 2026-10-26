# Generated for Shop.public_id 3-step migration (Step 3: unique=True, null=False)
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0016_populate_shop_public_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shop',
            name='public_id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
