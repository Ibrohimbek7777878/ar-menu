from django.db import models
from core.models import TimestampedModel


class Job(TimestampedModel):
    STATUS = [('queued', 'Navbatda'), ('running', 'Bajarilmoqda'),
              ('done', 'Tugadi'), ('failed', 'Xato')]
    queue = models.CharField(max_length=30, db_index=True)
    type = models.CharField(max_length=60)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS, default='queued', db_index=True)
    attempts = models.SmallIntegerField(default=0)
    max_attempts = models.SmallIntegerField(default=3)
    heartbeat_at = models.DateTimeField(null=True, blank=True, db_index=True)
    result = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=['queue', 'status', 'created_at'])]
