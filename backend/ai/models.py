from django.db import models


class ChatSession(models.Model):
    session_key = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey('accounts.AdminUser', null=True, blank=True,
                             on_delete=models.SET_NULL, related_name='chat_sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.session_key


class ChatMessage(models.Model):
    ROLE_CHOICES = [('user', 'Foydalanuvchi'), ('assistant', 'Yordamchi')]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE,
                                related_name='messages')
    role = models.CharField(max_length=12, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:40]}"


class AIUsage(models.Model):
    """V12 — MCP router har chaqiruv logi: xarajat, token, latensiya, xatolar."""
    provider = models.CharField(max_length=20, db_index=True)
    model = models.CharField(max_length=60, blank=True)
    task = models.CharField(max_length=20, db_index=True)   # chat|translate|vision|image_to_3d
    ok = models.BooleanField(default=True)
    tokens_in = models.IntegerField(default=0)
    tokens_out = models.IntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=8, decimal_places=5, default=0)
    latency_ms = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    prompt_preview = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'ai_usage'
        ordering = ['-created_at']
        verbose_name = 'AI ishlatilishi'
        verbose_name_plural = 'AI ishlatilishlari'

    def __str__(self):
        return f'{self.provider}/{self.task} {"✓" if self.ok else "✗"} ${self.cost_usd}'
