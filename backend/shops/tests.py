from django.test import TestCase
from shops.models import Shop, STORE_CLUSTERS, STORE_TYPE_CHOICES
from django.contrib.auth import get_user_model

User = get_user_model()

class ShopClusterTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cluster_owner', password='password123')

    def test_all_clusters_and_store_types(self):
        # Verify 28 store types exist
        self.assertEqual(len(STORE_TYPE_CHOICES), 28)
        self.assertEqual(len(STORE_CLUSTERS), 5)

        # Test retail cluster shop
        shop_retail = Shop.objects.create(name='Kiyim Boutique', owner=self.user, store_type='clothing', latitude=40.4897, longitude=68.7842)
        self.assertEqual(shop_retail.get_cluster(), 'retail')
        self.assertEqual(shop_retail.get_cluster_display(), 'Chakana Savdo & Moda')

        # Test food cluster shop
        shop_food = Shop.objects.create(name='Milliy Taomlar Oshxonasi', owner=self.user, store_type='restaurant', latitude=40.4897, longitude=68.7842)
        self.assertEqual(shop_food.get_cluster(), 'food')
        self.assertEqual(shop_food.get_cluster_icon(), '🍔')

        # Test tech cluster shop
        shop_tech = Shop.objects.create(name='Gadget Arena', owner=self.user, store_type='electronics', latitude=40.4897, longitude=68.7842)
        self.assertEqual(shop_tech.get_cluster(), 'tech_hardware')
        self.assertEqual(shop_tech.get_cluster_icon(), '📱')


class TemplateSlugFitsColumnsTests(TestCase):
    """SQLite uzunlikni tekshirmaydi, PostgreSQL esa DataError beradi: do'kon sahifasi shablon slug'ini sig'dira olishi kerak."""

    def test_page_template_column_holds_any_template_slug(self):
        from shops.models import ShopPage, ShopTemplate
        slug_len = ShopTemplate._meta.get_field('slug').max_length
        self.assertGreaterEqual(ShopPage._meta.get_field('template').max_length, slug_len)

    def test_generated_custom_slug_fits_the_slug_column(self):
        # views: <asos (<=60)>-custom-<user pk>-<4 raqam>; user pk 10 xonagacha deb olinadi
        longest = 60 + len('-custom-') + 10 + len('-9999')
        from shops.models import ShopTemplate
        self.assertLessEqual(longest, ShopTemplate._meta.get_field('slug').max_length)
