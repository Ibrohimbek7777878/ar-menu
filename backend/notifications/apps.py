from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        from notifications import signals  # noqa: F401
        from backend.runtime_cache import connect_runtime_cache_signals
        connect_runtime_cache_signals()
