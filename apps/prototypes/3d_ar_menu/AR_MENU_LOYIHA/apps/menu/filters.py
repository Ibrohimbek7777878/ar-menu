"""
⚡ GIN indeks ustida ishlaydigan filtrlar (V-035).
    ?diet=halal,vegan        — HAMMASI bo'lishi kerak (AND)
    ?no_allergens=nuts,dairy — BULARSIZ (exclude)
    ?max_price=50000&min_price=10000
    ?has_3d=1&is_hit=1
"""
from django.db.models import Q


def apply_menu_filters(qs, params):
    diet = [x.strip().lower() for x in (params.get('diet') or '').split(',') if x.strip()]
    if diet:
        qs = qs.filter(diet_tags__contains=diet)          # ⚡ GIN: barcha teg bor

    diet_any = [x.strip().lower() for x in (params.get('diet_any') or '').split(',') if x.strip()]
    if diet_any:
        qs = qs.filter(diet_tags__overlap=diet_any)       # ⚡ kamida bittasi

    no_all = [x.strip().lower() for x in (params.get('no_allergens') or '').split(',') if x.strip()]
    if no_all:
        qs = qs.exclude(allergens__overlap=no_all)        # ⚡ bularsiz

    for key, lookup in (('min_price', 'price__gte'), ('max_price', 'price__lte'),
                        ('max_cook', 'cook_min__lte'), ('max_cal', 'calories__lte')):
        val = params.get(key)
        if val:
            try:
                qs = qs.filter(**{lookup: float(val)})
            except ValueError:
                pass

    for key, field in (('has_3d', 'has_3d'), ('is_hit', 'is_hit'),
                       ('is_new', 'is_new'), ('available', 'is_available')):
        val = params.get(key)
        if val in ('1', 'true', 'True'):
            qs = qs.filter(**{field: True})
        elif val in ('0', 'false', 'False'):
            qs = qs.filter(**{field: False})

    cat = params.get('category')
    if cat:
        try:
            qs = qs.filter(category_id=int(cat))
        except ValueError:
            pass

    q = (params.get('q') or '').strip()
    if len(q) >= 2:
        qs = qs.filter(Q(name_uz__icontains=q) | Q(name_ru__icontains=q) |
                       Q(name_en__icontains=q))

    order = params.get('sort')
    ORDERS = {'price': 'price', '-price': '-price', 'popular': '-sold_count',
              'rating': '-rating_avg', 'new': '-created_at'}
    return qs.order_by(ORDERS.get(order, 'order'), 'id')


ALLERGEN_LABELS = {
    'nuts': {'uz': 'Yong\'oq', 'ru': 'Орехи', 'en': 'Nuts'},
    'gluten': {'uz': 'Glyuten', 'ru': 'Глютен', 'en': 'Gluten'},
    'dairy': {'uz': 'Sut', 'ru': 'Молоко', 'en': 'Dairy'},
    'eggs': {'uz': 'Tuxum', 'ru': 'Яйца', 'en': 'Eggs'},
    'fish': {'uz': 'Baliq', 'ru': 'Рыба', 'en': 'Fish'},
    'shellfish': {'uz': 'Dengiz mahsuloti', 'ru': 'Морепродукты', 'en': 'Shellfish'},
    'soy': {'uz': 'Soya', 'ru': 'Соя', 'en': 'Soy'},
    'sesame': {'uz': 'Kunjut', 'ru': 'Кунжут', 'en': 'Sesame'},
}


DIET_LABELS = {
    'halal': {'uz': 'Halol', 'ru': 'Халяль', 'en': 'Halal'},
    'vegetarian': {'uz': 'Vegetarian', 'ru': 'Вегетар.', 'en': 'Vegetarian'},
    'vegan': {'uz': 'Vegan', 'ru': 'Веган', 'en': 'Vegan'},
    'spicy': {'uz': 'Achchiq', 'ru': 'Острое', 'en': 'Spicy'},
    'no_spicy': {'uz': 'Achchiq emas', 'ru': 'Не острое', 'en': 'Not spicy'},
    'lactose_free': {'uz': 'Laktozasiz', 'ru': 'Без лактозы', 'en': 'Lactose-free'},
    'gluten_free': {'uz': 'Glyutensiz', 'ru': 'Без глютена', 'en': 'Gluten-free'},
    'low_cal': {'uz': 'Kam kaloriya', 'ru': 'Низкокалор.', 'en': 'Low calorie'},
}


def filter_options(lang='uz') -> dict:
    """Frontend uchun filtr tugmalari ro'yxati"""
    return {
        'allergens': [{'key': k, 'label': v.get(lang, v['uz'])}
                      for k, v in ALLERGEN_LABELS.items()],
        'diet': [{'key': k, 'label': v.get(lang, v['uz'])}
                 for k, v in DIET_LABELS.items()],
    }
