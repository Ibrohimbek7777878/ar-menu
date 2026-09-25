"""
Audit Log — tizim harakatlarini kuzatish.
"""
from django.db import models


class AuditLog(models.Model):
    """Tizim audit logi."""
    ACTION_TYPES = [
        ('login', 'Kirish'),
        ('logout', 'Chiqish'),
        ('role_change', 'Rol o\'zgarishi'),
        ('seller_approval', 'Sotuvchi tasdiqlash'),
        ('price_change', 'Narx o\'zgarishi'),
        ('stock_change', 'Ombor o\'zgarishi'),
        ('order_status', 'Buyurtma holati'),
        ('payment', 'To\'lov'),
        ('refund', 'Qaytarish'),
        ('payout', "To'lov chiqarish"),
        ('ai_action', 'AI harakati'),
        ('campaign', 'Kampaniya'),
        ('moderation', 'Moderatsiya'),
        ('account_change', 'Hisob o\'zgarishi'),
        ('security', 'Xavfsizlik'),
    ]

    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    actor_id = models.IntegerField(null=True, blank=True)
    actor_name = models.CharField(max_length=200, blank=True, default='')
    actor_role = models.CharField(max_length=50, blank=True, default='')

    target_type = models.CharField(max_length=50, blank=True, default='')
    target_id = models.IntegerField(null=True, blank=True)

    old_value = models.JSONField(default=dict, blank=True)
    new_value = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action_type', 'created_at']),
            models.Index(fields=['actor_id', 'action_type']),
            models.Index(fields=['target_type', 'target_id']),
        ]

    def __str__(self):
        return f'{self.action_type} — {self.actor_name} — {self.created_at}'


def log_audit(action_type, request=None, actor=None, target_type='',
              target_id=None, old_value=None, new_value=None, **kwargs):
    """Audit log yaratish."""
    data = {
        'action_type': action_type,
        'target_type': target_type,
        'target_id': target_id,
        'old_value': old_value or {},
        'new_value': new_value or {},
        **kwargs,
    }

    if actor:
        data['actor_id'] = actor.id
        data['actor_name'] = str(actor)
        data['actor_role'] = getattr(actor, 'role', '')

    if request:
        data['ip_address'] = _get_client_ip(request)
        data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:200]

    AuditLog.objects.create(**data)


def _get_client_ip(request):
    """Client IP manzilini olish."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
