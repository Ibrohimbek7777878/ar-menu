"""⚡ stop_until o'tgan taomlarni avtomatik qaytaradi. Cron: har 5 daqiqada."""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.menu.models import Dish
from core.ws import ws_send, g_admin, g_waiters


class Command(BaseCommand):
    help = 'stop_until muddati tugagan taomlarni menyuga qaytaradi'

    def handle(self, *args, **opts):
        qs = Dish.objects.filter(is_available=False,
                                 stop_until__isnull=False,
                                 stop_until__lte=timezone.now())
        n = 0
        for d in qs.iterator():
            d.is_available = True
            d.stop_until = None
            d.save(update_fields=['is_available', 'stop_until', 'updated_at'])
            payload = {'dish_id': d.pk, 'name': d.name_uz, 'available': True}
            ws_send(g_admin(d.restaurant_id), 'dish.resumed', payload)
            ws_send(g_waiters(d.restaurant_id), 'dish.resumed', payload)
            n += 1
        self.stdout.write(self.style.SUCCESS(f'{n} ta taom menyuga qaytdi'))
