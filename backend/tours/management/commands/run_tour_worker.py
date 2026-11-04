"""
Video sayr ishchisi (TZ Bosqich 3-4): yuklangan videodan ffmpeg bilan yengil variantlar (scrub/play/low/poster) yasaydi va
AI takliflari so'rovlarini bajaradi. Navbat bazada (Redis/Celery shart emas).

    python manage.py run_tour_worker                  # doimiy (server bilan birga)
    python manage.py run_tour_worker --once           # navbatni bo'shatib, chiqib ketish
    python manage.py run_tour_worker --loop-sleep 5   # navbat bo'sh bo'lganda kutish (soniya)

`run_workers` (barcha ishchilar bitta buyruqda) ham shuni `tours` nomi bilan ishga tushiradi. SIGTERM/SIGINT: joriy vazifa
tugagach to'xtaydi (qotib qolsa - `TOUR_PROCESSING_TIMEOUT_S` dan keyin vazifa qayta navbatga qaytadi).
"""
import signal
import threading

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from tours import pipeline


class Command(BaseCommand):
    help = "Video sayr ishchisi: ffmpeg variantlar va AI takliflari"

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help="Navbatni bo'shatib, chiqib ketish")
        parser.add_argument('--loop-sleep', type=float, default=2.0, help="Navbat bo'sh bo'lganda kutish (soniya)")

    def handle(self, *args, **opts):
        pipeline.recover_stale_jobs()
        if opts['once']:
            totals = {}
            for _ in range(1000):                       # cheksiz aylanmaslik uchun chegara
                counts, did = pipeline.drain_once()
                for key, value in counts.items():
                    totals[key] = totals.get(key, 0) + value
                if not did:
                    break
            shown = ', '.join(f'{k}={v}' for k, v in totals.items()) or "bo'sh"
            self.stdout.write(f'tours: {shown}')
            return

        stop = threading.Event()
        if threading.current_thread() is threading.main_thread():
            signal.signal(signal.SIGTERM, lambda *_: stop.set())
            signal.signal(signal.SIGINT, lambda *_: stop.set())
        self.stdout.write(self.style.SUCCESS("Sayr ishchisi ishga tushdi (to'xtatish: Ctrl+C)"))
        while not stop.is_set():
            close_old_connections()
            try:
                counts, did = pipeline.drain_once()
            except Exception as exc:                    # ishchi hech qachon yiqilmasin
                self.stderr.write(f'[tours] xato: {type(exc).__name__}')
                counts, did = {}, 0
            if did:
                self.stdout.write(f'[tours] {counts}')
                continue
            stop.wait(max(0.2, opts['loop_sleep']))
        self.stdout.write("Sayr ishchisi to'xtatildi")
