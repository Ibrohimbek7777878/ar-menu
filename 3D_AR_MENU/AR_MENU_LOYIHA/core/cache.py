from django.core.cache import cache
from django.db.models import F


def menu_key(slug, lang, version):
    return f'menu:{slug}:{lang}:v{version}'


def bump_menu_version(restaurant_id):
    """⚡ Menyu o'zgarganda chaqiriladi — barcha kesh kaliti eskiradi"""
    from apps.tenants.models import Restaurant
    Restaurant.objects.filter(id=restaurant_id).update(menu_version=F('menu_version') + 1)
    r = Restaurant.objects.only('slug').get(id=restaurant_id)
    cache.delete(f'rest:slug:{r.slug}')


def cached(key_fn, ttl=60):
    """Dekorator: natijani keshlaydi"""
    def deco(fn):
        def wrapper(*a, **kw):
            k = key_fn(*a, **kw)
            v = cache.get(k)
            if v is None:
                v = fn(*a, **kw)
                cache.set(k, v, ttl)
            return v
        return wrapper
    return deco
