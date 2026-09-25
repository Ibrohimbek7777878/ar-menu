from django.db import migrations


def convert_free_to_basic(apps, schema_editor):
    Shop = apps.get_model('shops', 'Shop')
    Shop.objects.filter(plan='free').update(plan='basic')


def reverse_convert(apps, schema_editor):
    Shop = apps.get_model('shops', 'Shop')
    Shop.objects.filter(plan='basic').update(plan='free')


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0003_shop_ai_credits_monthly_shop_ai_credits_used_and_more'),
    ]

    operations = [
        migrations.RunPython(convert_free_to_basic, reverse_convert),
    ]
