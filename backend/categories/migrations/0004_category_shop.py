# Multi-tenant ajratish (TZ_MULTITENANT Bosqich 0): menyu bo'limi aniq bitta restoranniki. Faqat sxema (null=True):
# mavjud ma'lumot 0005 da egasiga bog'lanadi. Orqaga qaytariladi (ustun olib tashlanadi).
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0003_category_kind'),
        ('shops', '0019_backfill_shop_subdomain'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='menu_categories', to='shops.shop', verbose_name='Restoran'),
        ),
    ]
