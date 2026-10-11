from django.apps import AppConfig


class TablesConfig(AppConfig):
    name = 'apps.tables'
    label = 'tables'
    verbose_name = 'Zallar va stollar'

    def ready(self):
        try:
            from apps.tables import signals_floorplan  # noqa
        except ImportError:
            pass
