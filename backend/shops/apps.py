from django.apps import AppConfig


class ShopsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shops'

    def ready(self):
        # Istisno bilan tugagan so'rovdan joriy tenant qolib ketmasin (TenantMiddleware finally'iga qo'shimcha kafolat)
        from backend.tenancy import connect_tenant_signals
        connect_tenant_signals()
