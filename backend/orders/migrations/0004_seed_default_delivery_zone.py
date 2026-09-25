from django.db import migrations


def seed_default_zone(apps, schema_editor):
    DeliveryZone = apps.get_model('orders', 'DeliveryZone')
    if not DeliveryZone.objects.exists():
        DeliveryZone.objects.create(
            name='Guliston markaziy zona',
            description='Standart shahar ichidagi yetkazib berish zonasi',
            center_lat=40.4775,
            center_lng=66.8435,
            radius_km=5.0,
            base_fee=3000,
            per_km_fee=1200,
            peak_fee=2000,
            weight_fee_per_kg=500,
            min_order_amount=20000,
            max_distance_km=10.0,
            free_delivery_threshold=70000,
            is_active=True,
        )


def remove_seed(apps, schema_editor):
    DeliveryZone = apps.get_model('orders', 'DeliveryZone')
    DeliveryZone.objects.filter(name='Guliston markaziy zona').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_payment_status'),
    ]

    operations = [
        migrations.RunPython(seed_default_zone, remove_seed),
    ]
