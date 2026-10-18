"""
Taom rasmi → 3D fon ishchisi (Redis/Celery'siz, navbat bazada).
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (4-qadam)

Ishlatish:
    python manage.py run_3d_worker            # doimiy ishlaydi (server bilan birga)
    python manage.py run_3d_worker --once     # navbatni bir marta bo'shatib chiqadi
"""
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from ar3d.pipeline import claim_next_job, process_job, recover_stale_jobs


class Command(BaseCommand):
    help = "Taom rasmlaridan 3D model yasovchi fon ishchisi"

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help="Navbatni bo'shatib, chiqib ketish")
        parser.add_argument('--interval', type=float, default=3.0, help="Navbat bo'sh bo'lganda kutish (soniya)")

    def handle(self, *args, **opts):
        recovered = recover_stale_jobs()
        if recovered:
            self.stdout.write(self.style.WARNING(f"{recovered} ta to'xtab qolgan vazifa qayta navbatga qo'yildi"))
        self.stdout.write(self.style.SUCCESS("3D ishchi ishga tushdi (to'xtatish: Ctrl+C)"))
        try:
            while True:
                close_old_connections()
                job = claim_next_job()
                if job:
                    ok = process_job(job)
                    name = job.product.name
                    if ok:
                        self.stdout.write(self.style.SUCCESS(f"✓ {name}: 3D tayyor"))
                    else:
                        self.stdout.write(self.style.ERROR(f"✗ {name}: {job.error_msg}"))
                    continue
                if opts['once']:
                    break
                time.sleep(opts['interval'])
        except KeyboardInterrupt:
            self.stdout.write("3D ishchi to'xtatildi")
