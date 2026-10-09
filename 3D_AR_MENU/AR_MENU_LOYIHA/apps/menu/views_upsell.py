"""Upsell API — savatdagi taomlarga taklif"""
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.menu.models import UpsellRule, Dish

log = logging.getLogger('menu.upsell')


@api_view(['POST'])
@permission_classes([AllowAny])
def upsell_suggestions(request):
    """POST /v1/menu/upsell/ {dish_ids: [1,2,3]}
    Savatdagi taomlarga mos takliflar qaytaradi.
    """
    dish_ids = request.data.get('dish_ids', [])
    if not dish_ids:
        return Response({'upsells': []})

    restaurant_id = request.data.get('restaurant_id')
    if not restaurant_id:
        return Response({'upsells': []})

    # Savatdagi taomlarga mos upsell qoidalarini topish
    rules = UpsellRule.objects.filter(
        restaurant_id=restaurant_id,
        is_active=True,
        trigger_dishes__id__in=dish_ids,
    ).select_related('suggest_dish').order_by('-priority')[:5]

    # Takrorlanishni oldini olish
    seen = set()
    upsells = []
    for rule in rules:
        suggest = rule.suggest_dish
        if suggest.id in seen or not suggest.is_available:
            continue
        seen.add(suggest.id)

        # Chegirma hisob
        discount = float(rule.discount_pct) if rule.discount_pct else 0
        price = float(suggest.price)
        final_price = price * (1 - discount / 100) if discount else price

        lang = request.data.get('lang', 'uz')
        text = getattr(rule, f'text_{lang}') or rule.text_uz

        upsells.append({
            'rule_id': rule.id,
            'dish_id': suggest.id,
            'dish_name': suggest.name_uz,
            'dish_price': price,
            'discount_pct': discount,
            'final_price': round(final_price),
            'text': text,
            'image': suggest.image.url if suggest.image else '',
        })

        # Ko'rsatish sonini oshirish
        UpsellRule.objects.filter(id=rule.id).update(
            shown_count=rule.shown_count + 1
        )

    return Response({'upsells': upsells})


@api_view(['POST'])
@permission_classes([AllowAny])
def upsell_accept(request):
    """POST /v1/menu/upsell/accept/ {rule_id}
    Mijoz upsellni qabul qildi — qabul qilish sonini oshirish.
    """
    rule_id = request.data.get('rule_id')
    if not rule_id:
        return Response({'error': 'rule_id kerak'}, status=400)

    from django.db.models import F
    updated = UpsellRule.objects.filter(id=rule_id).update(
        accepted_count=F('accepted_count') + 1
    )
    return Response({'ok': True, 'updated': updated > 0})
