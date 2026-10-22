from django.db import migrations, models

import tables_restaurant.models


def backfill_codes(apps, schema_editor):
    """Mavjud bronlarga taxmin qilib bo'lmaydigan noyob kod beradi (avval kod ketma-ket id+2840 edi)."""
    Reservation = apps.get_model('tables_restaurant', 'TableReservation')
    used = set()
    for row in Reservation.objects.all().only('id'):
        code = tables_restaurant.models.generate_reservation_code()
        while code in used:
            code = tables_restaurant.models.generate_reservation_code()
        used.add(code)
        Reservation.objects.filter(pk=row.pk).update(public_code=code)


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('tables_restaurant', '0005_table_deleted_at_table_is_deleted_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tablereservation',
            name='is_walk_in',
            field=models.BooleanField(default=False, verbose_name='Jonli kelgan (oldindan bron qilinmagan)'),
        ),
        migrations.AddField(
            model_name='tablereservation',
            name='public_code',
            field=models.CharField(editable=False, max_length=12, null=True, verbose_name='Bron kodi'),
        ),
        migrations.RunPython(backfill_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='tablereservation',
            name='public_code',
            field=models.CharField(default=tables_restaurant.models.generate_reservation_code, editable=False,
                                   max_length=12, unique=True, verbose_name='Bron kodi'),
        ),
        migrations.AlterField(
            model_name='tablereservation',
            name='status',
            field=models.CharField(
                choices=[('pending', 'Kutilmoqda'), ('confirmed', 'Tasdiqlangan'), ('arrived', 'Keldi (kutmoqda)'),
                         ('seated', "O'tirdi (Faol)"), ('completed', 'Yakunlangan'), ('cancelled', 'Bekor qilingan')],
                db_index=True, default='pending', max_length=20),
        ),
        migrations.AddIndex(
            model_name='tablereservation',
            index=models.Index(fields=['shop', 'reservation_date', 'status'], name='resv_shop_date_status_idx'),
        ),
    ]
