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

    def test_menu_etag_and_conditional_304(self):
        """TZ 0.7: ETag va 304 Not Modified shartli kesh tekshiruvi."""
        from django.test import Client
        c = Client()
        res = c.get('/api/v1/restaurant/menu/')
        self.assertEqual(res.status_code, 200)
        etag = res.headers.get('ETag')
        self.assertIsNotNone(etag)
        self.assertIn('max-age=30', res.headers.get('Cache-Control', ''))

        # Xuddi shu ETag bilan qayta so'ralganda 304 Not Modified qaytishi shart
        res304 = c.get('/api/v1/restaurant/menu/', HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(res304.status_code, 304)

    def test_menu_etag_changes_when_dish_updated(self):
        """TZ 0.7: Taom o'zgarganda ETag o'zgaradi va eski ETag bilan 200 qaytaradi."""
        from django.test import Client
        c = Client()
        res1 = c.get('/api/v1/restaurant/menu/')
        etag1 = res1.headers.get('ETag')

        # Narxni o'zgartiramiz
        self.product.price = Decimal('25000')
        self.product.save()

        # Eski ETag bilan so'rov yuborilganda kesh eskirgani uchun 200 va yangi ETag qaytadi
        res2 = c.get('/api/v1/restaurant/menu/', HTTP_IF_NONE_MATCH=etag1)
        self.assertEqual(res2.status_code, 200)
        etag2 = res2.headers.get('ETag')
        self.assertNotEqual(etag1, etag2)

    def test_stoplist_toggle_bumps_version(self):
        """TZ 0.7: Stop-list orqali taom to'xtatilganda kesh yangilanadi."""
        v1 = get_menu_version(self.shop.id)
        self.product.is_available = False
        self.product.save(update_fields=['is_available'])
        v2 = get_menu_version(self.shop.id)
        self.assertGreater(v2, v1)

