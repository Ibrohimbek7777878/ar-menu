import pytest
from decimal import Decimal
from django.utils import timezone
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.analytics.models import AnalyticsEvent
from core.models_job import Job
from apps.analytics.handlers import handle as analytics_handle
from apps.fiscal.handlers import handle as fiscal_handle
from core.management.commands.run_worker import Command as WorkerCommand


@pytest.mark.django_db
class TestWorkerAndEvents:
    """F-012, F-013, F-014: AnalyticsEvent tenant, worker resilience, va fiscal handler testlari"""

    def test_analytics_handler_records_tenant(self, restaurant, dish):
        """F-012: Analytics handler job payload yoki orderdan restaurant_id ni olib event yaratadi"""
        order = Order.objects.create(
            restaurant=restaurant,
            number=101,
            status='new',
            total=Decimal('50000'),
        )
        job = Job.objects.create(
            queue='analytics',
            type='order_created',
            payload={'order_id': order.id, 'restaurant_id': restaurant.id},
            status='running'
        )

        res = analytics_handle(job)
        assert res['analytics_saved'] is True

        event = AnalyticsEvent.objects.filter(event_type='order_created').latest('id')
        assert event.restaurant_id == restaurant.id
        assert event.payload.get('order_id') == order.id

    def test_analytics_handler_resolves_tenant_from_order_if_omitted(self, restaurant):
        """F-012: Agar restaurant_id payload'da bo'lmasa, order_id orqali topiladi"""
        order = Order.objects.create(
            restaurant=restaurant,
            number=102,
            status='cooking',
            total=Decimal('35000'),
        )
        job = Job.objects.create(
            queue='analytics',
            type='order_status',
            payload={'order_id': order.id, 'status': 'cooking'},
            status='running'
        )

        res = analytics_handle(job)
        assert res['analytics_saved'] is True

        event = AnalyticsEvent.objects.filter(event_type='order_status').latest('id')
        assert event.restaurant_id == restaurant.id

    def test_fiscal_handler_populates_payment_fiscal_id(self, restaurant):
        """F-014: Fiscal handler paid buyurtma uchun Payment.fiscal_id ni to'ldiradi"""
        order = Order.objects.create(
            restaurant=restaurant,
            number=103,
            status='paid',
            total=Decimal('75000'),
        )
        payment = Payment.objects.create(
            restaurant=restaurant,
            order=order,
            provider='payme',
            status='paid',
            amount=Decimal('75000'),
        )

        job = Job.objects.create(
            queue='fiscal',
            type='order_fiscal_receipt',
            payload={'order_id': order.id, 'restaurant_id': restaurant.id},
            status='running'
        )

        res = fiscal_handle(job)
        assert res['fiscal_id'].startswith('DEMO-')

        payment.refresh_from_db()
        assert payment.fiscal_id == res['fiscal_id']

    def test_worker_sets_heartbeat_and_retries_on_error(self):
        """F-013: Worker heartbeat_at yozadi va xato berganda attempts oshirib retry qiladi"""
        cmd = WorkerCommand()
        job = Job.objects.create(
            queue='analytics',
            type='test_failing_job',
            payload={'test': True},
            status='queued',
            attempts=0,
            max_attempts=3
        )

        def failing_handler(j):
            raise ValueError("Test failure in worker")

        cmd._process_job('analytics', job.id, failing_handler)

        job.refresh_from_db()
        assert job.status == 'queued'
        assert job.attempts == 1
        assert job.heartbeat_at is not None
        assert "ValueError" in job.error

        # 3-urinishda failed bo'lishi
        cmd._process_job('analytics', job.id, failing_handler)
        cmd._process_job('analytics', job.id, failing_handler)

        job.refresh_from_db()
        assert job.status == 'failed'
        assert job.attempts == 3
