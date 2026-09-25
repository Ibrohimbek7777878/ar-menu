from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from apps.ar3d.models import DishModel3D


@receiver(post_save, sender=DishModel3D)
def sync_has_3d(sender, instance, **kwargs):
    from apps.menu.models import Dish
    try:
        from core.cache import bump_menu_version
        has_bump = True
    except ImportError:
        has_bump = False
    want = instance.status == 'ready'
    changed = Dish.objects.filter(id=instance.dish_id).exclude(has_3d=want).update(has_3d=want)
    if changed and has_bump:
        try:
            bump_menu_version(instance.restaurant_id)
        except Exception:
            pass


@receiver(post_delete, sender=DishModel3D)
def clear_has_3d(sender, instance, **kwargs):
    from apps.menu.models import Dish
    try:
        from core.cache import bump_menu_version
        has_bump = True
    except ImportError:
        has_bump = False
    Dish.objects.filter(id=instance.dish_id).update(has_3d=False)
    if has_bump:
        try:
            bump_menu_version(instance.restaurant_id)
        except Exception:
            pass
