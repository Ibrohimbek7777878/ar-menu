from django.apps import AppConfig


class Ar3dConfig(AppConfig):
    name = 'apps.ar3d'
    label = 'ar3d'
    verbose_name = 'AR / 3D modellar'

    def ready(self):
        try:
            from apps.ar3d import signals  # noqa
        except ImportError:
            pass
