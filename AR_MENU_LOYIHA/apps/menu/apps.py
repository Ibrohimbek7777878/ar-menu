from django.apps import AppConfig


class MenuConfig(AppConfig):
    name = 'apps.menu'
    label = 'menu'

    def ready(self):
        import apps.menu.signals  # noqa  (V-043)
