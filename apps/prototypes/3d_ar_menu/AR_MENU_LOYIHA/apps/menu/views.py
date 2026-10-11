import logging
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q, F, Value, FloatField
from django.db.models.functions import Greatest
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from apps.tenants.models import Restaurant
from apps.menu.models import Dish
from apps.menu.serializers import DishOutSerializer
from apps.menu.services.build import build_menu
from core.cache import menu_key
from core.i18n import pick_lang, t
from core.exceptions import RestaurantInactive

log = logging.getLogger('menu.views')
MENU_TTL = 60  # ⚡ 60 sekund


class GuestThrottle(AnonRateThrottle):
    scope = 'guest'


def get_restaurant(slug):
    """Restoran obyektini keshdan/DB'dan oladi"""
    key = f'rest:slug:{slug}'
    r = cache.get(key)
    if r is None:
        r = Restaurant.objects.filter(slug=slug).first()
        cache.set(key, r or False, 300)
    if not r:
        from django.http import Http404
        raise Http404('Restoran topilmadi')
    if not r.is_active:
        raise RestaurantInactive()
    return r


class MenuView(APIView):
    """
    GET /v1/menu/{slug}/?lang=uz&table=5
    Kesh: menu:{slug}:{lang}:v{menu_version} — 60s
    ⚡ menu_version o'zgarsa kesh kaliti ham o'zgaradi (invalidation bepul).
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    def get(self, request, slug):
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)
        etag = f'"v{restaurant.menu_version}-{lang}"'

        # ⚡ 304 — trafik tejaladi (mobil internet uchun muhim)
        if request.headers.get('If-None-Match') == etag:
            resp = HttpResponse(status=304)
            resp['ETag'] = etag
            resp['Cache-Control'] = 'public, max-age=60'
            return resp

        key = menu_key(slug, lang, restaurant.menu_version)

        data = cache.get(key)
        cache_hit = data is not None
        if not cache_hit:
            data = build_menu(restaurant, lang)
            cache.set(key, data, MENU_TTL)
            log.info(f'[menu] MISS {slug}/{lang} v{restaurant.menu_version}')

        data = dict(data)
        data['table'] = self._table(request, restaurant)

        resp = Response(data)
        resp['ETag'] = etag
        resp['Cache-Control'] = 'public, max-age=60'
        resp['Vary'] = 'Accept-Language'
        resp['X-Cache'] = 'HIT' if cache_hit else 'MISS'
        return resp

    @staticmethod
    def _table(request, restaurant):
        tid = request.GET.get('table')
        if not tid:
            return None
        try:
            from apps.tables.models import Table
            tb = Table.objects.select_related('hall').filter(
                id=int(tid), restaurant_id=restaurant.id, is_active=True).first()
        except (ValueError, ImportError):
            return None
        if tb is None:
            return None
        return {'id': tb.id, 'number': tb.number,
                'hall': tb.hall.name if tb.hall_id else ''}


class MenuSearchView(APIView):
    """
    GET /v1/menu/{slug}/search/?q=osh&lang=uz
    ⚡ pg_trgm — xato yozilgan so'z ham topiladi ("palov" → "Osh (Palov)")
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    MIN_SIM = 0.2
    LIMIT = 40

    def get(self, request, slug):
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)
        q = (request.GET.get('q') or '').strip()[:60]

        if len(q) < 2:
            return Response({'query': q, 'count': 0, 'dishes': []})

        base = Dish.objects.filter(restaurant_id=restaurant.id,
                                   category__is_active=True)

        # 1-bosqich: aniq moslik (ICONTAINS) — tez va aniq
        exact = base.filter(
            Q(name_uz__icontains=q) | Q(name_ru__icontains=q) |
            Q(name_en__icontains=q) | Q(ingredients_uz__icontains=q)
        ).prefetch_related('modifiers').select_related('category')[:self.LIMIT]
        exact = list(exact)

        # 2-bosqich: trigram (xato yozuv) — aniq moslik kam bo'lsa
        if len(exact) < 5:
            try:
                found_ids = [d.id for d in exact]
                fuzzy = (base.exclude(id__in=found_ids)
                         .annotate(sim=Greatest(
                             TrigramSimilarity('name_uz', q),
                             TrigramSimilarity('name_ru', q),
                             TrigramSimilarity('name_en', q),
                             output_field=FloatField()))
                         .filter(sim__gt=self.MIN_SIM)
                         .order_by('-sim')
                         .prefetch_related('modifiers')
                         .select_related('category')[:self.LIMIT - len(exact)])
                exact += list(fuzzy)
            except Exception as e:
                log.warning(f'[search] trigram xato: {e}')

        data = DishOutSerializer(exact, many=True, context={'lang': lang}).data
        return Response({'query': q, 'count': len(data), 'dishes': data})


class DishDetailView(APIView):
    """
    GET /v1/dish/{id}/?lang=uz
    ⚡ Taom modali uchun — to'liq ma'lumot + 3D + o'xshash taomlar.
    Restoran slug'i berilmagani uchun dish orqali topiladi, lekin
    faol restoran tekshiriladi.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    def get(self, request, pk):
        dish = (Dish.objects
                .select_related('restaurant', 'category')
                .prefetch_related('modifiers')
                .filter(pk=pk).first())
        if dish is None:
            from django.http import Http404
            raise Http404('Taom topilmadi')
        if not dish.restaurant.is_active:
            raise RestaurantInactive()

        lang = pick_lang(request, dish.restaurant)
        ctx = {'lang': lang}
        data = DishOutSerializer(dish, context=ctx).data

        data['ingredients'] = t(dish, 'ingredients', lang)
        data['category_name'] = t(dish.category, 'name', lang)

        # 3D ma'lumot (FAZA 5 da to'ldiriladi)
        data['ar'] = self._ar(dish)

        # O'xshash taomlar (bir kategoriya, 6 ta)
        similar = (Dish.objects
                   .filter(restaurant_id=dish.restaurant_id,
                           category_id=dish.category_id, is_available=True)
                   .exclude(pk=dish.pk)
                   .prefetch_related('modifiers')
                   .order_by('-sold_count')[:6])
        data['similar'] = DishOutSerializer(similar, many=True, context=ctx).data

        # Upsell tavsiyalari (bu taom bilan birga tavsiya etiladigan)
        try:
            from apps.menu.models import UpsellRule
            rules = (UpsellRule.objects
                     .filter(restaurant_id=dish.restaurant_id, is_active=True, trigger_dishes=dish)
                     .select_related('suggest_dish'))
            upsells = []
            for r in rules:
                if r.suggest_dish and r.suggest_dish.is_available:
                    upsells.append({
                        'rule_id': r.id,
                        'dish': DishOutSerializer(r.suggest_dish, context=ctx).data,
                        'text': t(r, 'text', lang),
                        'discount_pct': float(r.discount_pct or 0),
                    })
            data['upsell'] = upsells
        except Exception:
            data['upsell'] = []

        return Response(data)

    @staticmethod
    def _ar(dish):
        if not dish.has_3d:
            return None
        try:
            from apps.ar3d.models import DishModel3D
            m = DishModel3D.objects.filter(dish=dish, status='ready').first()
        except ImportError:
            return None
        if m is None:
            return None
        return {
            'glb': m.glb.url if m.glb else None,
            'usdz': m.usdz.url if m.usdz else None,
            'poster': m.poster.url if m.poster else None,
            'real_size_cm': float(m.real_size_cm),
        }


class MenuFilterView(APIView):
    """
    GET /v1/menu/{slug}/filter/?diet=halal,vegan&no_allergens=nuts&max_price=60000
    ⚡ Keshlanmaydi (kombinatsiya cheksiz) — lekin GIN indeks tez.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [GuestThrottle]

    def get(self, request, slug):
        from apps.menu.filters import apply_menu_filters, filter_options
        restaurant = get_restaurant(slug)
        lang = pick_lang(request, restaurant)

        qs = (Dish.objects.filter(restaurant_id=restaurant.id,
                                  category__is_active=True)
              .select_related('category').prefetch_related('modifiers'))
        qs = apply_menu_filters(qs, request.GET)[:200]

        return Response({
            'count': len(qs),
            'dishes': DishOutSerializer(qs, many=True, context={'lang': lang}).data,
            'options': filter_options(lang),
        })
