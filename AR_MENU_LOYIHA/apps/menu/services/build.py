"""
⚡ Menyu JSON'ini yig'adi. N+1 so'rov YO'Q — hammasi 4 ta so'rovda.
Natija Redis'ga menu_version bilan keshlanadi.
"""
import logging
from django.utils import timezone
from apps.menu.models import Category, Dish, UpsellRule
from apps.menu.serializers import (CategoryOutSerializer, DishOutSerializer,
                                   UpsellOutSerializer)

log = logging.getLogger('menu.build')


def build_menu(restaurant, lang='uz') -> dict:
    """DB'dan to'liq menyuni yig'adi (kesh yo'q — chaqiruvchi keshlaydi)"""
    ctx = {'lang': lang}
    rid = restaurant.id

    cats = list(Category.objects.filter(restaurant_id=rid, is_active=True)
                .order_by('order', 'id'))

    dishes = list(
        Dish.objects.filter(restaurant_id=rid, category__is_active=True)
        .select_related('category')
        .prefetch_related('modifiers')
        .order_by('order', 'id')
    )

    upsells = list(
        UpsellRule.objects.filter(restaurant_id=rid, is_active=True)
        .prefetch_related('trigger_dishes')
        .order_by('-priority', 'id')[:50]
    )

    return {
        'restaurant': {
            'id': rid,
            'slug': restaurant.slug,
            'name': restaurant.name,
            'logo': restaurant.logo.url if restaurant.logo else None,
            'colors': {'primary': restaurant.color_primary,
                       'accent': restaurant.color_accent},
            'langs': restaurant.langs_enabled or ['uz'],
            'default_lang': restaurant.default_lang,
            'service_fee_pct': float(restaurant.service_fee_pct),
            'has_ar': any(d.has_3d for d in dishes),
            'phone': restaurant.phone,
            'address': restaurant.address,
        },
        'categories': CategoryOutSerializer(cats, many=True, context=ctx).data,
        'dishes': DishOutSerializer(dishes, many=True, context=ctx).data,
        'upsell_rules': UpsellOutSerializer(upsells, many=True, context=ctx).data,
        'version': restaurant.menu_version,
        'lang': lang,
        'cached_at': timezone.now().isoformat(),
    }
