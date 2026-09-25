from django.db import models


class Courier(models.Model):
    STATUS_CHOICES = [
        ('active', 'Faol'),
        ('busy', 'Band'),
        ('offline', 'Oflayn'),
    ]

    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, unique=True)
    password = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='active'
    )
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    avatar = models.ImageField(upload_to='couriers/', null=True, blank=True)
    vehicle_type = models.CharField(max_length=50, blank=True)
    rating = models.FloatField(default=5.0)
    total_deliveries = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'couriers'
        verbose_name = 'Kuryer'
        verbose_name_plural = 'Kuryerlar'

    def __str__(self):
        return f'{self.name} ({self.status})'

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password)

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)
