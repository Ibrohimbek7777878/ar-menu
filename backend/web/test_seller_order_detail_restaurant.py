"""
`/seller/orders/<pk>/` restoran URLConf'ida 500 bermasligi (TZ §11).

Sabab: `templates/seller/order_detail.html` holat formasi va "ro'yxatga qaytish" havolasi `{% url 'admin_order_status' %}` va
`{% url 'admin_orders' %}` nomlarini teskari qidiradi. Bu nomlar faqat `web/urls.py` (default) va `urls_market.py` da bor;
`urls_restaurant.py` da yo'q edi, natijada `NoReverseMatch` -> 500.

Tuzatish: nomlar FAQAT `urls_restaurant.py` ga ulanadi (market/studio URLConf'lari o'zgarmaydi). `admin_order_status` eski
umumiy ko'rinishga (`views.admin_order_status`: faqat `@login_required`, do'kon tekshiruvisiz, holat mashinasisiz) EMAS,
do'konga bog'langan, holat mashinasi (`transition_order`) orqali ishlaydigan yangi sotuvchi ko'rinishiga ulanadi.
"""
from decimal import Decimal

from django.test import Client, TestCase, override_settings
from django.urls import reverse

from accounts.models import AdminUser
from orders.models import Order, OrderStatusHistory
from shops.models import Shop

RESTO = dict(ROOT_URLCONF='backend.urls_restaurant', ALLOWED_HOSTS=['testserver', 'localhost'])


def make_owner_shop(tag):
    owner = AdminUser.objects.create_user(username=f'od-owner-{tag}', password='Parol-OD-123', role='shop_owner',
                                          is_approved=True)
    shop = Shop.objects.create(name=f'Resto {tag}', slug=f'od-resto-{tag}', owner=owner, is_open=True,
                               latitude=40.49, longitude=68.78)
    owner.shop = shop
    owner.save(update_fields=['shop'])
    return owner, shop


def make_order(shop, number, status='pending'):
    return Order.objects.create(shop=shop, order_number=number, customer_name='Mehmon', customer_phone_1='+998901112233',
                                total_amount=Decimal('50000'), final_amount=Decimal('50000'), status=status)


@override_settings(**RESTO)
class SellerOrderDetailRestaurantTests(TestCase):
    def setUp(self):
        self.owner_a, self.shop_a = make_owner_shop('a')
        self.owner_b, self.shop_b = make_owner_shop('b')
        self.order_a = make_order(self.shop_a, 'OD-A-1')
        self.order_b = make_order(self.shop_b, 'OD-B-1')

    def login(self, user):
        client = Client()
        client.force_login(user)
        return client

    # ── 1. sahifa 500 emas ───────────────────────────────────────────────────
    def test_detail_page_renders_for_the_shop_owner(self):
        res = self.login(self.owner_a).get(f'/seller/orders/{self.order_a.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, self.order_a.order_number)

    def test_status_form_points_to_the_shop_scoped_status_view(self):
        res = self.login(self.owner_a).get(f'/seller/orders/{self.order_a.pk}/')
        self.assertContains(res, f'action="{reverse("admin_order_status", args=[self.order_a.pk])}"')

    def test_other_shops_order_is_404_not_500(self):
        res = self.login(self.owner_a).get(f'/seller/orders/{self.order_b.pk}/')
        self.assertEqual(res.status_code, 404)

    def test_anonymous_is_redirected_to_login_not_500(self):
        res = Client().get(f'/seller/orders/{self.order_a.pk}/')
        self.assertEqual(res.status_code, 302)

    # ── 2. ulangan nomlar xavfsiz ko'rinishga ketadi ──────────────────────────────
    def test_status_change_goes_through_the_state_machine_and_writes_history(self):
        url = reverse('admin_order_status', args=[self.order_a.pk])
        res = self.login(self.owner_a).post(url, {'status': 'confirmed'})
        self.assertRedirects(res, f'/seller/orders/{self.order_a.pk}/', fetch_redirect_response=False)
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'confirmed')
        self.assertIsNotNone(self.order_a.confirmed_at)
        self.assertTrue(OrderStatusHistory.objects.filter(order=self.order_a, status='confirmed',
                                                          changed_by=self.owner_a).exists())

    def test_illegal_transition_is_refused_with_a_message(self):
        url = reverse('admin_order_status', args=[self.order_a.pk])
        client = self.login(self.owner_a)
        res = client.post(url, {'status': 'delivered'}, follow=True)         # pending -> delivered: holat mashinasida yo'q
        self.assertEqual(res.status_code, 200)
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'pending')
        self.assertFalse(OrderStatusHistory.objects.filter(order=self.order_a).exists())
        self.assertTrue([str(m) for m in res.context['messages']])

    def test_unknown_status_is_refused(self):
        url = reverse('admin_order_status', args=[self.order_a.pk])
        self.login(self.owner_a).post(url, {'status': 'hacked'})
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'pending')

    def test_cannot_change_another_shops_order(self):
        url = reverse('admin_order_status', args=[self.order_b.pk])
        res = self.login(self.owner_a).post(url, {'status': 'confirmed'})
        self.assertEqual(res.status_code, 404)
        self.order_b.refresh_from_db()
        self.assertEqual(self.order_b.status, 'pending')

    def test_status_view_is_post_only(self):
        url = reverse('admin_order_status', args=[self.order_a.pk])
        self.assertEqual(self.login(self.owner_a).get(url).status_code, 405)

    def test_waiter_cannot_change_status_here(self):
        waiter = AdminUser.objects.create_user(username='od-waiter', password='Parol-OD-123', role='waiter',
                                               is_approved=True, shop=self.shop_a)
        url = reverse('admin_order_status', args=[self.order_a.pk])
        res = self.login(waiter).post(url, {'status': 'confirmed'})
        self.assertEqual(res.status_code, 302)
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'pending')

    def test_anonymous_cannot_change_status(self):
        url = reverse('admin_order_status', args=[self.order_a.pk])
        res = Client().post(url, {'status': 'confirmed'})
        self.assertEqual(res.status_code, 302)
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, 'pending')

    def test_back_link_name_resolves_in_restaurant_urlconf(self):
        from django.urls import resolve
        self.assertEqual(reverse('admin_orders'), '/seller/orders/')
        # /seller/orders/ ni baribir sotuvchi ro'yxati hal qiladi (nom ro'yxatdan keyin turadi, resolver_match o'zgarmaydi)
        self.assertEqual(resolve('/seller/orders/').url_name, 'seller_orders_web')
        res = self.login(self.owner_a).get('/seller/orders/')
        self.assertEqual(res.status_code, 200)


# ── 3. boshqa mahsulot URLConf'lari o'zgarmagan ──────────────────────────────────
class OtherProductUrlconfsUnchangedTests(TestCase):
    def test_market_and_default_keep_their_own_status_route(self):
        pk = 7
        self.assertEqual(reverse('admin_order_status', args=[pk], urlconf='backend.urls_market'),
                         f'/admin/orders/{pk}/status/')
        self.assertEqual(reverse('admin_order_status', args=[pk], urlconf='backend.urls'),
                         f'/admin/orders/{pk}/status/')

    def test_market_still_maps_the_name_to_the_legacy_view(self):
        from django.urls import resolve
        from web import views
        self.assertIs(resolve('/admin/orders/7/status/', urlconf='backend.urls_market').func, views.admin_order_status)
