# Multi-tenant asos (TZ_MULTITENANT Bosqich 0): Shop.subdomain / business_type / status. Faqat sxema: ma'lumot 0019 da.
# Orqaga qaytariladi (ustunlar olib tashlanadi; mavjud ma'lumotga tegilmaydi).
import django.db.models.deletion
import shops.tenancy
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0017_alter_shop_public_id_unique'),
    ]

    operations = [
        # Faqat state: Category.shop (categories 0004) bilan teskari so'rov nomi to'qnashmasin. Bazaga ta'sir qilmaydi.
        migrations.AlterField(
            model_name='shop',
            name='category',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='shops_of_type', to='categories.category'),
        ),
        migrations.AddField(
            model_name='shop',
            name='business_type',
            field=models.CharField(choices=[('restaurant', 'Restoran'), ('cafe', 'Kafe'), ('banquet', "To'yxona")], default='restaurant', max_length=20, verbose_name='Biznes turi'),
        ),
        migrations.AddField(
            model_name='shop',
            name='status',
            field=models.CharField(choices=[('active', 'Faol'), ('suspended', "To'xtatilgan")], db_index=True, default='active', max_length=12, verbose_name='Holati'),
        ),
        migrations.AddField(
            model_name='shop',
            name='subdomain',
            field=models.CharField(blank=True, help_text='mijoz.<platforma domeni> — 3–40 belgi: kichik lotin harf, raqam, defis', max_length=40, null=True, unique=True, validators=[shops.tenancy.validate_subdomain], verbose_name='Subdomen'),
        ),
    ]
