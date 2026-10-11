import logging
from django.db import models

log = logging.getLogger('analytics.audit')


class AuditLog(models.Model):
    """
    ⚡ Har muhim amal yoziladi: kim, nima, qachon, qayerdan.
    ⛔ Audit yozuvi HECH QACHON o'chirilmaydi/tahrirlanmaydi.
    """
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   null=True, blank=True, db_index=True, db_constraint=False)
    actor = models.ForeignKey('accounts.Staff', on_delete=models.SET_NULL,
                                   null=True, blank=True, db_constraint=False)
    actor_name = models.CharField(max_length=150, blank=True)   # denorm (staff o'chsa qoladi)
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL,
                                   null=True, blank=True, db_constraint=False)

    action = models.CharField(max_length=60, db_index=True)
    # staff.login | order.status | dish.update | table.regen_qr | plan.upgrade ...
    model = models.CharField(max_length=60, blank=True)
    object_id = models.CharField(max_length=40, blank=True, db_index=True)

    old = models.JSONField(default=dict, blank=True)
    new = models.JSONField(default=dict, blank=True)

    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    request_id = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_log'
        indexes = [
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['restaurant', 'action', '-created_at']),
            models.Index(fields=['model', 'object_id']),
        ]

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.action} by {self.actor_name}'

    @classmethod
    def log(cls, restaurant_id=None, actor=None, action='', model='', object_id='',
            old=None, new=None, ip=None, request=None, user=None):
        """
        ⚡ Audit YOZUV XATOSI asosiy amalni BUZMASLIGI kerak — try/except.
        Ishlatish:
            AuditLog.log(restaurant_id=r.id, actor=request.staff,
                         action='dish.update', model='Dish', object_id=d.id,
                         old={'price': 45000}, new={'price': 49000}, request=request)
        """
        try:
            if request is not None:
                ip = ip or cls._ip(request)
                actor = actor or getattr(request, 'staff', None)
                restaurant_id = restaurant_id or getattr(request, 'restaurant_id', None)
            return cls.objects.create(
                restaurant_id=restaurant_id,
                actor=actor,
                actor_name=getattr(actor, 'full_name', '') or '',
                user=user or getattr(actor, 'user', None),
                action=action, model=model, object_id=str(object_id or ''),
                old=old or {}, new=new or {}, ip=ip,
                user_agent=(request.META.get('HTTP_USER_AGENT', '')[:255]
                            if request is not None else ''),
                request_id=getattr(request, 'request_id', '') if request is not None else '',
            )
        except Exception as e:                       # ⚡ jim yiqiladi
            log.error(f'[audit] yozilmadi action={action}: {e}')
            return None

    @staticmethod
    def _ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')

    @staticmethod
    def diff(instance, fields):
        """Model obyektining ko'rsatilgan maydonlaridagi joriy qiymatlarini dict qilib qaytaradi"""
        out = {}
        for f in fields:
            val = getattr(instance, f, None)
            if hasattr(val, 'pk'):
                val = val.pk
            elif hasattr(val, 'isoformat'):
                val = val.isoformat()
            elif isinstance(val, (int, float, bool, str, list, dict)) or val is None:
                pass
            else:
                val = str(val)
            out[f] = val
        return out

class AnalyticsEvent(models.Model):
    """Event store — handler orqali yoziladi, keyinchalik ClickHouse'ga ko'chiriladi."""
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   null=True, blank=True, db_index=True, db_constraint=False)
    event_type = models.CharField(max_length=60, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'analytics_event'
        indexes = [
            models.Index(fields=['restaurant', 'event_type', '-created_at']),
        ]

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.event_type}'


    @classmethod
    def diff(cls, instance, fields):
        """DB'dagi eski qiymatlarni oladi (update'dan OLDIN chaqiriladi)"""
        if not instance.pk:
            return {}
        old = type(instance).objects.filter(pk=instance.pk).values(*fields).first()
        return old or {}
