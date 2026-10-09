import pytest
from unittest.mock import patch
from decimal import Decimal
from django.utils import timezone
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.menu.models import Dish, UpsellRule
from apps.tables.models import FloorPlan
from apps.guest.models import Guest
from apps.loyalty.models import LoyaltyProgram, Bonus
from core.models_job import Job
from apps.orders.handlers import handle as notify_handle


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestAuditFixesTier3:
    """F-015, F-016, F-017, F-018, F-019 testlari"""

    def test_notify_handler_resolves_group_and_broadcasts(self, restaurant):
        """F-015: Notify handler order_id orqali guruhni aniqlaydi va WS yuboradi"""
        order = Order.objects.create(
            restaurant=restaurant,
            number=77,
            status='ready',
            total=Decimal('60000'),
        )
        job = Job.objects.create(
            queue='notify',
            type='waiter_order_ready',
            payload={'order_id': order.id},
            status='running'
        )

        with patch('core.ws.ws_send') as mock_ws:
            res = notify_handle(job)
            assert res['notified'] is True
            assert res['group'] == f'rest_{restaurant.id}_waiters'
            mock_ws.assert_called_once()
            args = mock_ws.call_args[0]
            assert args[0] == f'rest_{restaurant.id}_waiters'
            assert args[1] == 'waiter_order_ready'
            assert str(args[2]['number']) == '77'

    def test_notify_handler_telegram_integration(self, restaurant, settings):
        """F-016: Restaurant.telegram_chat_id va settings mavjud bo'lsa Telegram yuboriladi"""
        restaurant.telegram_chat_id = "987654321"
        restaurant.save()
        settings.TELEGRAM_BOT_TOKEN = "TEST_TELEGRAM_TOKEN_123"

        order = Order.objects.create(
            restaurant=restaurant,
            number=88,
            status='new',
            total=Decimal('120000'),
        )
        job = Job.objects.create(
            queue='notify',
            type='waiter_new_order',
            payload={'order_id': order.id},
            status='running'
        )

        with patch('apps.orders.handlers._send_telegram') as mock_tg:
            res = notify_handle(job)
            assert res['notified'] is True
            mock_tg.assert_called_once()
            token, chat_id, text = mock_tg.call_args[0]
            assert token == "TEST_TELEGRAM_TOKEN_123"
            assert chat_id == "987654321"
            assert "#88" in text

    def test_birthday_bonus_duplicate_safe_and_program_integrated(self, restaurant):
        """F-017: Birthday bonus 2 marta ishga tushganda ham faqat 1 marta beriladi"""
        today = timezone.localdate()
        # 1995 yilda tug'ilgan (lekin bugungi oy/kun)
        bday = today.replace(year=1995)
        guest = Guest.objects.create(
            restaurant=restaurant,
            name="Temur",
            birthday=bday,
            bonus=Decimal('0'),
        )
        LoyaltyProgram.objects.create(
            restaurant=restaurant,
            is_active=True,
            birthday_bonus=Decimal('35000'),
            birthday_valid_days=10,
        )

        # 1-ishga tushirish: bonus berilishi kerak
        call_command('birthday_bonus')
        guest.refresh_from_db()
        assert guest.bonus == Decimal('35000')
        assert Bonus.objects.filter(guest=guest, kind='birthday').count() == 1

        # 2-ishga tushirish (takroriy): dublikat berilmasligi kerak!
        call_command('birthday_bonus')
        guest.refresh_from_db()
        assert guest.bonus == Decimal('35000')
        assert Bonus.objects.filter(guest=guest, kind='birthday').count() == 1

    def test_upsell_accept_increments_counter(self, client, restaurant, dish, dish2):
        """F-018: POST /v1/menu/upsell/accept/ accepted_count ni F() orqali xatosiz oshiradi"""
        rule = UpsellRule.objects.create(
            restaurant=restaurant,
            suggest_dish=dish2,
            text_uz="Salat qo'shing",
            discount_pct=Decimal('10.00'),
            is_active=True,
        )
        rule.trigger_dishes.add(dish)

        # 1-marta accept
        res1 = client.post('/v1/menu/upsell/accept/', {'rule_id': rule.id}, format='json')
        assert res1.status_code == 200
        rule.refresh_from_db()
        assert rule.accepted_count == 1

        # 2-marta accept
        res2 = client.post('/v1/menu/upsell/accept/', {'rule_id': rule.id}, format='json')
        assert res2.status_code == 200
        rule.refresh_from_db()
        assert rule.accepted_count == 2

    def test_dish_detail_includes_upsell(self, client, restaurant, dish, dish2):
        """F-018: GET /v1/dish/<id>/ javobida upsell tavsiyalari qaytadi"""
        rule = UpsellRule.objects.create(
            restaurant=restaurant,
            suggest_dish=dish2,
            text_uz="Choy va salat",
            discount_pct=Decimal('5.00'),
            is_active=True,
        )
        rule.trigger_dishes.add(dish)

        res = client.get(f'/v1/dish/{dish.id}/')
        assert res.status_code == 200
        assert 'upsell' in res.data
        assert len(res.data['upsell']) == 1
        assert res.data['upsell'][0]['rule_id'] == rule.id
        assert res.data['upsell'][0]['dish']['id'] == dish2.id

    def test_floorplan_patch_save_plan(self, client, restaurant, admin_token):
        """F-019: PATCH /v1/admin/floorplans/<id>/ zal rejasini saqlaydi va version oshadi"""
        plan = FloorPlan.objects.create(
            restaurant=restaurant,
            name_uz="Asosiy zal",
            floor=1,
            plan_json={'tables': []},
            version=1,
        )

        client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        res = client.patch(
            f'/v1/admin/floorplans/{plan.id}/',
            {'plan_json': {'tables': []}},
            format='json'
        )
        assert res.status_code == 200
        plan.refresh_from_db()
        assert plan.version == 2
