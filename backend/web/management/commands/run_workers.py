"""
Barcha fon ishchilarini bitta buyruq bilan ishga tushirish (TZ: R3-7).

  • outbox — Telegram va boshqa bildirishnomalarni navbatdan yuboradi (so'rov Telegram tezligiga bog'liq emas);
  • 3d     — taom rasmidan 3D model yasaydi.

Redis/Celery shart emas: navbat bazada. Har ishchi alohida oqimda, shuning uchun sekin 3D vazifa
bildirishnomalarni kechiktirmaydi.

    python manage.py run_workers              # doimiy (server bilan birga)
    python manage.py run_workers --once       # ikkala navbatni bir marta bo'shatib chiqadi
    python manage.py run_workers --only outbox
"""
import signal
import threading
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections


def drain_outbox_once():
    from notifications.outbox import process_outbox_batch
    counts = process_outbox_batch()
    return counts, sum(counts.values())


def drain_3d_once():
    from ar3d.pipeline import claim_next_job, process_job
    job = claim_next_job()
    if not job:
        return {}, 0
    ok = process_job(job)
    return {'3d_ok' if ok else '3d_failed': 1}, 1


WORKERS = {'outbox': drain_outbox_once, '3d': drain_3d_once}


class Command(BaseCommand):
    help = "Fon ishchilari: bildirishnoma navbati (outbox) va taom 3D generatsiyasi"

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help="Navbatlarni bo'shatib, chiqib ketish")
        parser.add_argument('--interval', type=float, default=2.0, help="Navbat bo'sh bo'lganda kutish (soniya)")
        parser.add_argument('--only', choices=sorted(WORKERS), help="Faqat bitta ishchini ishga tushirish")

    def handle(self, *args, **opts):
        names = [opts['only']] if opts['only'] else sorted(WORKERS)
        if opts['once']:
            for name in names:
                totals = {}
                for _ in range(1000):                       # cheksiz aylanmaslik uchun chegara (qayta urinishlar kutadi)
                    counts, did = WORKERS[name]()
                    for key, value in counts.items():
                        totals[key] = totals.get(key, 0) + value
                    # Qayta urinishga qoldirilgan hodisa yana "kutilmoqda" bo'ladi: aylanib qolmaslik uchun to'xtaymiz
                    if not did or counts.get('retry') or counts.get('failed'):
                        break
                shown = ', '.join(f'{k}={v}' for k, v in totals.items() if v) or "bo'sh"
                self.stdout.write(f"{name}: {shown}")
            return

        from ar3d.pipeline import recover_stale_jobs
        from notifications.outbox import recover_stale_events
        recovered = recover_stale_jobs() + recover_stale_events()
        if recovered:
            self.stdout.write(self.style.WARNING(f"{recovered} ta to'xtab qolgan vazifa qayta navbatga qo'yildi"))

        stop = threading.Event()
        signal.signal(signal.SIGTERM, lambda *_: stop.set())
        signal.signal(signal.SIGINT, lambda *_: stop.set())

        def loop(name):
            work = WORKERS[name]
            while not stop.is_set():
                close_old_connections()
                try:
                    counts, did = work()
                except Exception as exc:                      # ishchi hech qachon yiqilmasin
                    self.stderr.write(f"[{name}] xato: {exc}")
                    counts, did = {}, 0
                if did:
                    self.stdout.write(f"[{name}] {counts}")
                    continue
                stop.wait(opts['interval'])

        threads = [threading.Thread(target=loop, args=(name,), name=f'worker-{name}', daemon=True) for name in names]
        for thread in threads:
            thread.start()
        self.stdout.write(self.style.SUCCESS(f"Ishchilar ishga tushdi: {', '.join(names)} (to'xtatish: Ctrl+C)"))
        while not stop.is_set():
            time.sleep(0.5)
        for thread in threads:
            thread.join(timeout=15)
        self.stdout.write("Ishchilar to'xtatildi")
