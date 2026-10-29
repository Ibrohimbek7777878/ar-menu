"""
Ommaviy REST ViewSet'lar (banner, aksiya, sharh, sozlama, jurnal) yozish ruxsatlari.
Avval Banner/Promotion/Review `AllowAny ModelViewSet` edi: anonim so'rov aksiya (chegirma) yaratishi, banner/sharhni
o'zgartirishi yoki o'chirishi mumkin edi; AppSetting va NotificationLog'ni esa istalgan kirgan foydalanuvchi
(mijoz ham) o'qir/o'zgartirardi. Endi: o'qish (banner, aksiya, sharh) ochiq, mijoz sharh yoza oladi;
qolgan yozish va ichki sozlama/jurnal — faqat platforma admini.
"""
from datetime import timedelta
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from accounts.models import AdminUser
from notifications.models import AppSetting, Banner, NotificationLog, Promotion


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class PublicViewSetPermissionTests(APITestCase):
    BASE = '/api/v1/notifications/'

    def setUp(self):
        self.platform = AdminUser.objects.create_superuser(username='np-super', password='Super-Np-123', email='n@n.uz')
        self.owner = AdminUser.objects.create_user(username='np-owner', password='Owner-Np-123', role='shop_owner',
                                                   is_approved=True)
        now = timezone.now()
        self.promo = Promotion.objects.create(
            name='Aksiya', type='percent', value=Decimal('10'), min_order=Decimal('0'),
            start_date=now - timedelta(days=1), end_date=now + timedelta(days=1), is_active=True)
        self.banner = Banner.objects.create(title='Banner', image='b.png', is_active=True)
        self.setting = AppSetting.objects.create(key='np_secret_key', value='maxfiy')
        NotificationLog.objects.create(type='telegram', recipient='123456', message='Maxfiy xabar', success=True)

    def test_public_reads_stay_open(self):
        client = APIClient()
        self.assertEqual(client.get(f'{self.BASE}banners/').status_code, 200)
        self.assertEqual(client.get(f'{self.BASE}promotions/').status_code, 200)
        self.assertEqual(client.get(f'{self.BASE}promotions/active/').status_code, 200)
        self.assertEqual(client.get(f'{self.BASE}reviews/').status_code, 200)

    def test_anonymous_cannot_modify_or_delete_promotions_and_banners(self):
        client = APIClient()
        self.assertIn(client.delete(f'{self.BASE}promotions/{self.promo.id}/').status_code, (401, 403))
        self.assertIn(client.patch(f'{self.BASE}promotions/{self.promo.id}/', {'value': '99'}, format='json').status_code, (401, 403))
        self.assertIn(client.delete(f'{self.BASE}banners/{self.banner.id}/').status_code, (401, 403))
        self.assertIn(client.patch(f'{self.BASE}banners/{self.banner.id}/', {'title': 'Buzildi'}, format='json').status_code, (401, 403))
        self.assertIn(client.post(f'{self.BASE}promotions/', {
            'name': 'Soxta', 'type': 'percent', 'value': '99', 'min_order': '0',
            'start_date': (timezone.now()).isoformat(), 'end_date': (timezone.now() + timedelta(days=9)).isoformat(),
            'is_active': True}, format='json').status_code, (401, 403))
        self.assertTrue(Promotion.objects.filter(pk=self.promo.pk, value=Decimal('10')).exists())
        self.assertTrue(Banner.objects.filter(pk=self.banner.pk, title='Banner').exists())
        self.assertFalse(Promotion.objects.filter(name='Soxta').exists())

    def test_shop_owner_cannot_modify_global_promotions(self):
        client = APIClient()
        client.force_authenticate(self.owner)
        self.assertEqual(client.delete(f'{self.BASE}promotions/{self.promo.id}/').status_code, 403)
        self.assertTrue(Promotion.objects.filter(pk=self.promo.pk).exists())

    def test_platform_admin_can_manage(self):
        client = APIClient()
        client.force_authenticate(self.platform)
        res = client.patch(f'{self.BASE}promotions/{self.promo.id}/', {'value': '15'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)

    def test_internal_settings_and_logs_are_platform_only(self):
        for who in (None, self.owner):
            client = APIClient()
            if who:
                client.force_authenticate(who)
            for path in ('settings/', 'logs/'):
                res = client.get(f'{self.BASE}{path}')
                self.assertIn(res.status_code, (401, 403), (who, path))
            res = client.patch(f'{self.BASE}settings/{self.setting.id}/', {'value': 'buzildi'}, format='json')
            self.assertIn(res.status_code, (401, 403), who)
        self.setting.refresh_from_db()
        self.assertEqual(self.setting.value, 'maxfiy')
        client = APIClient()
        client.force_authenticate(self.platform)
        self.assertEqual(client.get(f'{self.BASE}settings/').status_code, 200)
        self.assertEqual(client.get(f'{self.BASE}logs/').status_code, 200)
