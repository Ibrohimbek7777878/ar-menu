"""
⚡ Menyu o'zgarsa → Restaurant.menu_version += 1
   → kesh kaliti o'zgaradi → keyingi so'rov yangi ma'lumot oladi.
⛔ cache.delete_pattern ishlatilmaydi (Redis'da sekin va xavfli).
"""
import logging
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.db import transaction
from apps.menu.models import Category, Dish, DishModifier, UpsellRule
from core.cache import bump_menu_version

log = logging.getLogger('menu.signals')


def _bump(restaurant_id, reason=''):
    if not restaurant_id:
        return
    # ⚡ Transaksiya muvaffaqiyatli tugagandan KEYIN
    transaction.on_commit(lambda: _do_bump(restaurant_id, reason))


def _do_bump(restaurant_id, reason):
    try:
        bump_menu_version(restaurant_id)
        log.info(f'[cache] menu_version++ rest#{restaurant_id} ({reason})')
    except Exception as e:
        log.error(f'[cache] bump xato rest#{restaurant_id}: {e}')


@receiver([post_save, post_delete], sender=Category)
def category_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, 'category')


@receiver([post_save, post_delete], sender=Dish)
def dish_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, f'dish#{instance.pk}')


@receiver([post_save, post_delete], sender=DishModifier)
def modifier_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, 'modifier')


@receiver([post_save, post_delete], sender=UpsellRule)
def upsell_changed(sender, instance, **kwargs):
    _bump(instance.restaurant_id, 'upsell')


@receiver(m2m_changed, sender=UpsellRule.trigger_dishes.through)
def upsell_m2m_changed(sender, instance, action, **kwargs):
    if action in ('post_add', 'post_remove', 'post_clear'):
        _bump(instance.restaurant_id, 'upsell.m2m')
