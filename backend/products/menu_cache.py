"""
Mehmon menyusi keshlash va avto-invalitatsiya tizimi (TZ 0.7).
- Kesh kaliti: menu:<prefix>:<shop_id>:<version>
- TTL: 30 soniya
- Invalitatsiya: Product, Category, Product3DModel post_save/post_delete signallarida avtomatik.
"""
from typing import Any, Callable
import time
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete

MENU_CACHE_TIMEOUT = 30  # 30 soniya


def get_menu_version(shop_id: Any = None) -> int:
    val = cache.get(f"menu_version:{shop_id or 'all'}")
    v = int(val) if val is not None else 1
    if shop_id:
        g = cache.get("menu_version:all")
        if g is not None:
            v += int(g)
    return v


def bump_menu_version(shop_id: Any = None):
    """Menyu versiyasini oshirish orqali barcha bog'liq kesh kalitlarini darhol eskirgan qilish."""
    key = f"menu_version:{shop_id or 'all'}"
    val = cache.get(key)
    new_val = (int(val) + 1) if val is not None else 2
    cache.set(key, new_val, timeout=86400 * 30)


def get_menu_etag(shop_id: Any = None) -> str:
    """ETag generatsiyasi: versiya va shop_id asosida shartli kesh (304) uchun."""
    v = get_menu_version(shop_id)
    return f'W/"menu-v{v}-s{shop_id or "all"}"'


def is_etag_matched(request: Any, shop_id: Any = None) -> bool:
    """Client yuborgan If-None-Match sarlavhasi joriy ETag bilan mosligini tekshiradi."""
    if_none_match = getattr(request, 'META', {}).get('HTTP_IF_NONE_MATCH')
    if not if_none_match:
        return False
    current_etag = get_menu_etag(shop_id)
    candidate = if_none_match.strip()
    return candidate == current_etag or candidate.strip('W/') == current_etag.strip('W/')


def apply_menu_cache_headers(response: Any, shop_id: Any = None, max_age: int = MENU_CACHE_TIMEOUT) -> Any:
    """Javobga ETag, Cache-Control va X-Menu-Version sarlavhalarini qo'yadi."""
    response['ETag'] = get_menu_etag(shop_id)
    response['Cache-Control'] = f'public, max-age={max_age}, must-revalidate'
    response['X-Menu-Version'] = str(get_menu_version(shop_id))
    return response


def get_cached_menu(shop_id: Any, prefix: str, builder: Callable[[], Any]) -> Any:
    """
    Berilgan shop_id va prefiks bo'yicha menyu ma'lumotlarini 30s keshlaydi.
    Kesh kaliti: menu:<prefix>:<shop_id>:<version>
    """
    version = get_menu_version(shop_id)
    cache_key = f"menu:{prefix}:{shop_id or 'default'}:{version}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    fresh_data = builder()
    cache.set(cache_key, fresh_data, timeout=MENU_CACHE_TIMEOUT)
    return fresh_data


def _on_product_change(sender, instance, **kwargs):
    bump_menu_version(getattr(instance, 'shop_id', None))


def _on_category_change(sender, instance, **kwargs):
    bump_menu_version(None)


def _on_3dmodel_change(sender, instance, **kwargs):
    product = getattr(instance, 'product', None)
    shop_id = getattr(product, 'shop_id', None) if product else None
    bump_menu_version(shop_id)


def connect_menu_signals():
    from products.models import Product
    from categories.models import Category
    post_save.connect(_on_product_change, sender=Product, dispatch_uid='menu_cache_prod_save')
    post_delete.connect(_on_product_change, sender=Product, dispatch_uid='menu_cache_prod_del')

    post_save.connect(_on_category_change, sender=Category, dispatch_uid='menu_cache_cat_save')
    post_delete.connect(_on_category_change, sender=Category, dispatch_uid='menu_cache_cat_del')

    try:
        from ar3d.models import Product3DModel
        post_save.connect(_on_3dmodel_change, sender=Product3DModel, dispatch_uid='menu_cache_3d_save')
        post_delete.connect(_on_3dmodel_change, sender=Product3DModel, dispatch_uid='menu_cache_3d_del')
    except Exception:
        pass


connect_menu_signals()
