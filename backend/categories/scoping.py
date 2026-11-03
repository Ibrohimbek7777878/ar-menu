"""
Menyu bo'limlarini restoran bo'yicha ajratish (TZ_MULTITENANT Bosqich 0, `Category.shop`).

Qoida:
  * tenant rejimida (`PLATFORM_DOMAIN` sozlangan): faqat `shop=<restoran>`; egasiz (`shop IS NULL`) bo'limlar HECH KIMGA ko'rinmaydi;
  * oddiy rejimda (localhost, demo, bitta-restoran serveri): restoranning o'zinikiga qo'shimcha ravishda egasiz ESKI bo'limlar
    avvalgidek ko'rinadi (`is_restaurant=True` yoki shu restoran taomida ishlatilgan) — mavjud testlar va serverlar o'zgarmaydi.
Barcha menyu/import/bo'lim yaratuvchilari shu yerdan foydalanadi.
"""
from django.db.models import Q

from categories.models import Category
from shops.tenancy import tenancy_enabled


def categories_for_shop(shop, queryset=None):
    """`shop` restoranining bo'limlari (faol-nofaol ajratilmaydi: chaqiruvchi o'zi filtrlaydi)."""
    qs = Category.objects.all() if queryset is None else queryset
    if shop is None:
        return qs.none()
    shop_id = getattr(shop, 'pk', shop)
    if tenancy_enabled():
        return qs.filter(shop_id=shop_id)
    return qs.filter(
        Q(shop_id=shop_id) | (Q(shop__isnull=True) & (Q(is_restaurant=True) | Q(products__shop_id=shop_id)))
    ).distinct()


def category_visible_to_shop(category, shop):
    """Bitta bo'lim shu restoranga ko'rinadimi (mahsulotga bog'lash, IDOR tekshiruvi)."""
    if category is None or shop is None:
        return False
    return categories_for_shop(shop).filter(pk=category.pk).exists()


def create_shop_category(shop, name, **extra):
    """Restoran uchun yangi bo'lim (`shop` majburiy: egasiz bo'lim yaratilmaydi)."""
    return Category.objects.create(shop=shop, name=name, **extra)
