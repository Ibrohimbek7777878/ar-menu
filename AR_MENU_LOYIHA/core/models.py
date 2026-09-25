from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(TimestampedModel):
    """
    ⚡ Restoran'ga bog'liq har bir model shundan meros oladi.
    Bu multi-tenant izolyatsiyaning asosi.
    """
    restaurant = models.ForeignKey(
        'tenants.Restaurant', on_delete=models.CASCADE, db_index=True)

    class Meta:
        abstract = True


# Job modeli alohida faylda — migratsiya uchun import
from core.models_job import Job  # noqa: F401,E402
