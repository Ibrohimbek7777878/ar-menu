from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase

from categories.models import Category
from orders.application.services import RestaurantOrderService
from products.menu_cache import get_menu_version, bump_menu_version, get_cached_menu
from products.models import Product
from shops.models import Shop

AdminUser = get_user_model()


class MenuCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = AdminUser.objects.create_user(
            username='cache_owner', password='password123', role='shop_owner', is_approved=True
        )
        self.shop = Shop.objects.create(
            name='Kesh Restoran', slug='kesh-restoran', owner=self.owner, address='Guliston',
            latitude=40.49, longitude=68.78, is_open=True, phone='+998901234567'
        )
        self.owner.shop = self.shop
        self.owner.save(update_fields=['shop'])

        self.category = Category.objects.create(name='Desertlar', sort_order=1)
        self.product = Product.objects.create(
            shop=self.shop, name='Muzqaymoq', slug='muzqaymoq', price=Decimal('15000'),
            category=self.category, is_available=True
        )

    def test_version_bump_and_invalidation(self):
        """TZ 0.7: bump_menu_version versiyani oshiradi."""
        v1 = get_menu_version(self.shop.id)
        bump_menu_version(self.shop.id)
        v2 = get_menu_version(self.shop.id)
        self.assertGreater(v2, v1)

    def test_product_save_auto_bumps_menu_version(self):
        """TZ 0.7: Taom narxi yoki holati o'zgarganda signal orqali kesh darhol yangilanadi."""
        v1 = get_menu_version(self.shop.id)
        self.product.price = Decimal('18000')
        self.product.save()
        v2 = get_menu_version(self.shop.id)
        self.assertGreater(v2, v1, "Product saqlanganda shop menu versiyasi oshishi shart")

    def test_category_save_auto_bumps_menu_version(self):
        """TZ 0.7: Kategoriya o'zgarganda ham versiya oshiriladi."""
        v1 = get_menu_version(self.shop.id)
        self.category.name = 'Yangi Desertlar'
        self.category.save()
        v2 = get_menu_version(self.shop.id)
        self.assertGreater(v2, v1, "Kategoriya saqlanganda menu versiyasi oshishi shart")

    def test_get_restaurant_menu_uses_cache_and_invalidates_instantly(self):
        """TZ 0.7: RestaurantOrderService.get_restaurant_menu keshlanadi va taom o'zgarganda yangi ma'lumot beradi."""
        # 1-marta chaqiruv: kesh hosil bo'ladi
        data1 = RestaurantOrderService.get_restaurant_menu()
        products1 = data1.get('products', [])
        p1 = next((p for p in products1 if p['id'] == self.product.id), None)
        self.assertIsNotNone(p1)
        self.assertEqual(p1['price'], 15000.0)

        # Taom narxini o'zgartiramiz
        self.product.price = Decimal('22000')
        self.product.save()

        # 2-marta chaqiruv: signal keshni yangilaganligi sababli darhol yangi narx (22000) chiqadi
        data2 = RestaurantOrderService.get_restaurant_menu()
        products2 = data2.get('products', [])
        p2 = next((p for p in products2 if p['id'] == self.product.id), None)
        self.assertIsNotNone(p2)
        self.assertEqual(p2['price'], 22000.0, "Taom narxi o'zgargach kesh darhol yangilanmadi")
