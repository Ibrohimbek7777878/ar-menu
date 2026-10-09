"""Birthday bonus — bugun tug'ilgan mijozlarga bonus yozish"""
import logging
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.guest.models import Guest
from apps.loyalty.models import LoyaltyProgram, Bonus

log = logging.getLogger('loyalty.birthday')


class Command(BaseCommand):
    help = "🎂 Bugun tug'ilgan mijozlarga bonus yozish (cron: 0 8 * * *)"

    def handle(self, *a, **o):
        today = timezone.localdate()
        year = today.year

        # 1. Bugun tug'ilgan kuni bo'lgan mijozlar (oy va kun mos)
        guests = Guest.objects.filter(
            birthday__month=today.month,
            birthday__day=today.day,
        ).select_related('restaurant')

        count = 0
        skipped = 0

        # Kesh loyalty dasturlari
        loyalty_programs = {
            lp.restaurant_id: lp
            for lp in LoyaltyProgram.objects.filter(is_active=True)
        }

        for g in guests:
            lp = loyalty_programs.get(g.restaurant_id)
            if not lp:
                continue

            bonus_amount = lp.birthday_bonus
            if not bonus_amount or bonus_amount <= Decimal('0'):
                continue

            # 2. Dublikat himoyasi: Bu yil allaqachon tug'ilgan kun bonusi berilganmi?
            already_given = Bonus.objects.filter(
                guest=g,
                kind='birthday',
                created_at__year=year
            ).exists()

            if already_given:
                skipped += 1
                continue

            with transaction.atomic():
                g.bonus = (g.bonus or Decimal('0')) + bonus_amount
                g.save(update_fields=['bonus', 'updated_at'])

                expires_at = timezone.now() + timedelta(days=lp.birthday_valid_days)

                Bonus.objects.create(
                    restaurant_id=g.restaurant_id,
                    guest=g,
                    kind='birthday',
                    amount=bonus_amount,
                    balance_after=g.bonus,
                    expires_at=expires_at,
                    comment=f"Tug'ilgan kun bonusi ({year})"
                )

            log.info(f'[birthday] Guest#{g.id} ({g.name}) — +{bonus_amount} bonus (balans: {g.bonus})')
            count += 1

        self.stdout.write(self.style.SUCCESS(
            f'🎂 {count} ta mijozga tug\'ilgan kun bonusi yozildi ({skipped} ta dublikat o\'tkazib yuborildi)'
        ))
