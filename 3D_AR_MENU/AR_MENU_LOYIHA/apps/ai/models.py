from django.db import models
from core.models import TimestampedModel

class AIUsage(TimestampedModel):
    restaurant = models.ForeignKey('tenants.Restaurant', null=True, blank=True, on_delete=models.SET_NULL, db_index=True, related_name='ai_usages')
    provider = models.CharField(max_length=30, db_index=True)
    model = models.CharField(max_length=80, blank=True)
    task = models.CharField(max_length=30, db_index=True)
    tokens_in = models.IntegerField(default=0)
    tokens_out = models.IntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    latency_ms = models.IntegerField(default=0)
    ok = models.BooleanField(default=True)
    class Meta:
        db_table='ai_aiusage'
        indexes=[models.Index(fields=['restaurant','-created_at']), models.Index(fields=['provider','task'])]

class ChatSession(TimestampedModel):
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE, db_index=True, related_name='chat_sessions')
    guest_session = models.CharField(max_length=64, db_index=True)
    lang = models.CharField(max_length=5, default='uz')
    table_id = models.IntegerField(null=True, blank=True)
    messages_count = models.IntegerField(default=0)
    class Meta:
        db_table='ai_chatsession'
        unique_together=('restaurant','guest_session')
        indexes=[models.Index(fields=['restaurant','guest_session'])]

class ChatMessage(TimestampedModel):
    ROLE=[('user','User'),('assistant','Assistant')]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE)
    text = models.TextField()
    provider = models.CharField(max_length=30, blank=True)
    buttons = models.JSONField(default=list, blank=True)
    class Meta:
        db_table='ai_chatmessage'
        ordering=['created_at']
