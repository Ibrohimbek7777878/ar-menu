# Bron mexanizmi: tadbir turi, davomiylik, idempotentlik, manba, 'kelmadi' holati. Hammasi orqaga qaytariladi (AddField/AddConstraint).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tables_restaurant', '0006_reservation_codes_and_arrived'),
    ]

    operations = [
        migrations.AddField(
            model_name='tablereservation',
            name='duration_minutes',
            field=models.PositiveSmallIntegerField(default=120, verbose_name='Stol band qilinish davomiyligi (daqiqa)'),
        ),
        migrations.AddField(
            model_name='tablereservation',
            name='event_type',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='Tadbir turi'),
        ),
        migrations.AddField(
            model_name='tablereservation',
            name='source',
            field=models.CharField(choices=[('guest', 'Mehmon (sayt)'), ('staff', "Xodim (qo'lda)"), ('bot', 'Bot')], default='guest', max_length=10, verbose_name='Manba'),
        ),
        migrations.AddField(
            model_name='tablereservation',
            name='submission_id',
            field=models.CharField(blank=True, default='', max_length=40, verbose_name='Yuborish identifikatori (idempotentlik)'),
        ),
        migrations.AlterField(
            model_name='tablereservation',
            name='status',
            field=models.CharField(choices=[('pending', 'Kutilmoqda'), ('confirmed', 'Tasdiqlangan'), ('arrived', 'Keldi (kutmoqda)'), ('seated', "O'tirdi (Faol)"), ('completed', 'Yakunlangan'), ('cancelled', 'Bekor qilingan'), ('no_show', 'Kelmadi')], db_index=True, default='pending', max_length=20),
        ),
        migrations.AddConstraint(
            model_name='tablereservation',
            constraint=models.UniqueConstraint(condition=models.Q(('submission_id', ''), _negated=True), fields=('shop', 'submission_id'), name='resv_shop_submission_uniq'),
        ),
    ]
