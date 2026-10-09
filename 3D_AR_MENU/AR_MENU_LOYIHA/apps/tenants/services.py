"""
⚡ Tarif limitlarini tekshirish. Limitni oshirsa → PlanLimit (402).
Har CRUD'da chaqiriladi: stol qo'shish, taom qo'shish, 3D yaratish, xodim qo'shish.
"""
import logging
from django.core.cache import cache
from django.utils import timezone
from core.exceptions import PlanLimit

log = logging.getLogger('tenants.services')

UNLIMITED = -1

# Model → Plan limit maydoni moslashuvi
LIMIT_MAP = {
    'table': 'table_limit',
    'dish': 'dish_limit',
    'ar': 'ar_model_limit',
    'staff': 'staff_limit',
}


def get_plan(restaurant):
    """Restoran tarifi (Plan obyekti). Kesh 300s."""
    key = f'plan:{restaurant.plan}'
    plan = cache.get(key)
    if plan is None:
        from apps.tenants.models import Plan
        plan = Plan.objects.filter(code=restaurant.plan, is_active=True).first()
        if plan is None:
            plan = Plan.objects.filter(code='free').first()
        cache.set(key, plan, 300)
    return plan


def plan_expired(restaurant) -> bool:
    if restaurant.plan == 'free':
        return False
    return not (restaurant.plan_expires and restaurant.plan_expires > timezone.now())


def get_limit(restaurant, kind: str) -> int:
    """kind: table|dish|ar|staff → int (-1 = cheksiz)"""
    field = LIMIT_MAP[kind]
    plan = get_plan(restaurant)
    if plan is None:
        return 0
    if plan_expired(restaurant):
        from apps.tenants.models import Plan
        free = Plan.objects.filter(code='free').first()
        return getattr(free, field, 0) if free else 0
    return getattr(plan, field, 0)


def current_usage(restaurant, kind: str) -> int:
    """Hozirgi ishlatilgan miqdor"""
    rid = restaurant.id
    if kind == 'table':
        from apps.tables.models import Table
        return Table.objects.filter(restaurant_id=rid, is_active=True).count()
    if kind == 'dish':
        from apps.menu.models import Dish
        return Dish.objects.filter(restaurant_id=rid).count()
    if kind == 'ar':
        from apps.ar3d.models import DishModel3D
        return DishModel3D.objects.filter(dish__restaurant_id=rid, status='ready').count()
    if kind == 'staff':
        from apps.accounts.models import Staff
        return Staff.objects.filter(restaurant_id=rid, is_active=True).count()
    return 0


def check_limit(restaurant, kind: str, add: int = 1):
    """
    ⚡ Limit oshsa PlanLimit (402) tashlaydi.
    Ishlatish:  check_limit(request.restaurant, 'table')
    """
    limit = get_limit(restaurant, kind)
    if limit == UNLIMITED:
        return
    used = current_usage(restaurant, kind)
    if used + add > limit:
        log.info(f'[plan] {restaurant.slug} limit: {kind} {used}+{add} > {limit}')
        raise PlanLimit({'kind': kind, 'used': used, 'limit': limit,
                         'plan': restaurant.plan})


def has_feature(restaurant, feature: str) -> bool:
    plan = get_plan(restaurant)
    if plan is None or plan_expired(restaurant):
        return False
    return bool((plan.features or {}).get(feature, False))


def usage_summary(restaurant) -> dict:
    """Admin dashboard uchun: har limitning holati"""
    out = {}
    for kind in LIMIT_MAP:
        limit = get_limit(restaurant, kind)
        used = current_usage(restaurant, kind)
        out[kind] = {
            'used': used,
            'limit': limit,
            'unlimited': limit == UNLIMITED,
            'pct': 0 if limit in (0, UNLIMITED) else round(used * 100 / limit),
        }
    return out
