"""
Bildirishnoma navbati holati va qo'lda qayta yuborish (TZ: R3-1).

    python manage.py outbox_status                  # to'plangan, xato bergan hodisalar
    python manage.py outbox_status --retry-failed   # oxirgi 24 soatdagi xatolarni qayta navbatga qo'yadi
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import OutboxEvent
from notifications.outbox import outbox_stats


class Command(BaseCommand):
    help = "Outbox navbati holati"

    def add_arguments(self, parser):
        parser.add_argument('--retry-failed', action='store_true', help="So'nggi 24 soatdagi 'failed' hodisalarni qayta navbatga qo'yish")

    def handle(self, *args, **opts):
        stats = outbox_stats()
        self.stdout.write(
            f"Kutilmoqda: {stats['pending']}, jarayonda: {stats['processing']}, xato: {stats['failed']}, "
            f"eng eskisi: {stats['oldest_pending_seconds'] if stats['oldest_pending_seconds'] is not None else '-'} s"
        )
        for event in OutboxEvent.objects.filter(status='failed').order_by('-created_at')[:10]:
            self.stdout.write(f"  ✗ #{event.pk} {event.event_type} ({event.retry_count}x): {event.error_message[:120]}")
        if opts['retry_failed']:
            count = OutboxEvent.objects.filter(status='failed', created_at__gte=timezone.now() - timedelta(hours=24)).update(
                status='pending', retry_count=0, next_attempt_at=timezone.now(), locked_at=None)
            self.stdout.write(self.style.SUCCESS(f"{count} ta hodisa qayta navbatga qo'yildi"))
