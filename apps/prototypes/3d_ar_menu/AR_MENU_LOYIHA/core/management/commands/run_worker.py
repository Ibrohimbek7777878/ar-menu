import importlib
import logging
import signal
import time
import traceback

from django.core.management.base import BaseCommand
from django.db import connection

from core.queue import QUEUES, dequeue

log = logging.getLogger('core.worker')

POLL_SEC = 3
STALE_SEC = 1200  # 20 min

# Har navbat uchun handler modul yo'li
HANDLER_MAP = {
    'model3d': 'apps.ar3d.handlers',
    'fiscal': 'apps.fiscal.handlers',
    'notify': 'apps.orders.handlers',
    'ai': 'apps.ai.handlers',
    'analytics': 'apps.analytics.handlers',
}


def _load_handler(queue_name):
    mod_path = HANDLER_MAP.get(queue_name)
    if not mod_path:
        return None
    try:
        mod = importlib.import_module(mod_path)
        return getattr(mod, 'handle', None)
    except (ImportError, AttributeError) as e:
        log.warning(f'[worker] {queue_name} handler topilmadi: {e}')
        return None


class Command(BaseCommand):
    help = '⚡ Generic worker: run_worker --queue=model3d|fiscal|notify|ai|analytics'

    def add_arguments(self, parser):
        parser.add_argument('--queue', '-q', required=True, choices=QUEUES, help='Navbat nomi')
        parser.add_argument('--once', action='store_true', help='Bitta job bajarib chiqadi')
        parser.add_argument('--poll', type=int, default=POLL_SEC, help='Poll interval (sekund)')

    def handle(self, *a, **o):
        queue = o['queue']
        self._stop = False
        signal.signal(signal.SIGTERM, lambda *_: setattr(self, '_stop', True))
        signal.signal(signal.SIGINT, lambda *_: setattr(self, '_stop', True))

        handler = _load_handler(queue)
        if handler is None:
            self.stdout.write(self.style.WARNING(
                f'⚠️  {queue} uchun handler yo\'q — faqat dequeue/done (stub)'
            ))
            handler = self._stub_handler

        self.stdout.write(self.style.SUCCESS(f'⚙️  worker [{queue}] ishga tushdi'))
        processed = 0
        last_stale_check = 0

        while not self._stop:
            try:
                now = time.time()
                if now - last_stale_check > 60:
                    self._requeue_stale_jobs(queue)
                    last_stale_check = now

                job_id = dequeue(queue, timeout=o['poll'])
                if job_id is None:
                    if o.get('once'):
                        break
                    continue
                self._process_job(queue, job_id, handler)
                processed += 1
                if o.get('once'):
                    break
            except Exception:
                log.error(f'[worker] halqa xatosi:\n{traceback.format_exc()}')
                time.sleep(o['poll'])
            finally:
                try:
                    connection.close()
                except Exception:
                    pass

        self.stdout.write(self.style.WARNING(f'⏹  worker [{queue}] to\'xtadi — {processed} ta job bajarildi'))

    def _requeue_stale_jobs(self, queue):
        from core.models_job import Job
        from django.utils import timezone
        from datetime import timedelta
        from core.queue import get_redis

        stale_cutoff = timezone.now() - timedelta(seconds=STALE_SEC)
        stale_jobs = Job.objects.filter(
            queue=queue,
            status='running',
            heartbeat_at__lt=stale_cutoff
        )
        r = get_redis()
        for job in stale_jobs:
            if job.attempts < getattr(job, 'max_attempts', 3):
                job.status = 'queued'
                job.error = f'Stale job requeued (last heartbeat: {job.heartbeat_at})'
                job.save(update_fields=['status', 'error', 'updated_at'])
                r.lpush(f'q:{queue}', str(job.id))
                log.warning(f'[worker] Stale job#{job.id} requeued to q:{queue}')
            else:
                job.status = 'failed'
                job.error = 'Max attempts exceeded after worker crash/timeout'
                job.save(update_fields=['status', 'error', 'updated_at'])
                log.error(f'[worker] Stale job#{job.id} marked failed')

    def _process_job(self, queue, job_id, handler):
        from core.models_job import Job
        from django.utils import timezone
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            log.warning(f'[worker] Job#{job_id} topilmadi, o\'tkazib yuborildi')
            return

        if job.status == 'done':
            return

        job.status = 'running'
        job.attempts += 1
        job.heartbeat_at = timezone.now()
        job.save(update_fields=['status', 'attempts', 'heartbeat_at', 'updated_at'])

        try:
            result = handler(job)
            job.status = 'done'
            job.result = result or {}
            job.save(update_fields=['status', 'result', 'updated_at'])
            log.info(f'[worker] ✅ Job#{job.id} ({queue}/{job.type}) tugadi')
        except Exception as e:
            msg = f'{type(e).__name__}: {e}'
            log.error(f'[worker] ⛔ Job#{job.id} xato: {msg}')
            if job.attempts < getattr(job, 'max_attempts', 3):
                job.status = 'queued'
                job.error = msg[:2000]
                job.save(update_fields=['status', 'error', 'updated_at'])
                log.info(f'[worker] Job#{job.id} qayta navbatda ({job.attempts}/{job.max_attempts})')
            else:
                job.status = 'failed'
                job.error = msg[:2000]
                job.save(update_fields=['status', 'error', 'updated_at'])

    @staticmethod
    def _stub_handler(job):
        log.info(f'[worker] stub: Job#{job.id} ({job.type}) — handler yo\'q, done')
        return {'stub': True}
