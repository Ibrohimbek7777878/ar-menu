import logging
import os
import signal
import tempfile
import time
import traceback

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

log = logging.getLogger('ar3d.worker')

POLL_SEC = 5
STALE_MIN = 20


class Command(BaseCommand):
    help = '⚡ 3D model generatsiya worker (armenu-model3d.service)'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Bitta job bajarib chiqadi (test uchun)')
        parser.add_argument('--job-id', type=int, help='Aniq job')

    def handle(self, *a, **o):
        self._stop = False
        signal.signal(signal.SIGTERM, lambda *_: setattr(self, '_stop', True))
        signal.signal(signal.SIGINT, lambda *_: setattr(self, '_stop', True))
        self.stdout.write(self.style.SUCCESS('⚙️  model3d worker ishga tushdi'))
        if o.get('job_id'):
            from apps.ar3d.models import Model3DJob
            try:
                self._process(Model3DJob.objects.get(id=o['job_id']))
            except Model3DJob.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Job {o["job_id"]} topilmadi'))
            return
        while not self._stop:
            try:
                self._requeue_stale()
                job = self._claim()
                if job is None:
                    if o.get('once'):
                        break
                    time.sleep(POLL_SEC)
                    continue
                self._process(job)
                if o.get('once'):
                    break
            except Exception:
                log.error(f'[worker] halqa xatosi:\n{traceback.format_exc()}')
                time.sleep(POLL_SEC)
            finally:
                try:
                    connection.close()
                except Exception:
                    pass
        self.stdout.write(self.style.WARNING('⏹  worker to\'xtadi'))

    def _requeue_stale(self):
        from apps.ar3d.models import Model3DJob
        cutoff = timezone.now() - timezone.timedelta(minutes=STALE_MIN)
        n = Model3DJob.objects.filter(status='running', heartbeat_at__lt=cutoff).update(status='queued', stage='library', progress=0)
        if n:
            log.warning(f'[worker] {n} ta osilgan job qayta navbatga qo\'yildi')

    def _claim(self):
        from apps.ar3d.models import Model3DJob
        with transaction.atomic():
            job = (Model3DJob.objects.select_for_update(skip_locked=True).filter(status='queued').order_by('created_at').first())
            if job is None:
                return None
            job.status = 'running'
            job.attempts += 1
            job.started_at = timezone.now()
            job.heartbeat_at = timezone.now()
            job.save(update_fields=['status', 'attempts', 'started_at', 'heartbeat_at', 'updated_at'])
        return job

    def _process(self, job):
        from apps.ar3d.models import DishModel3D
        from apps.ar3d.services import library, generate, optimize, usdz, poster, storage
        try:
            from core.ws import ws_send, g_admin
            has_ws = True
        except ImportError:
            has_ws = False
        t0 = time.time()
        dish = job.dish
        log.info(f'[worker] ▶ Job#{job.id} "{dish.name_uz}" ({job.real_size_cm} sm, urinish {job.attempts})')
        m3d, _ = DishModel3D.objects.get_or_create(dish=dish, defaults={'restaurant_id': job.restaurant_id})
        m3d.status = 'processing'
        m3d.progress = 5
        m3d.real_size_cm = job.real_size_cm
        m3d.error_msg = ''
        m3d.save()
        job.model = m3d
        job.save(update_fields=['model'])
        tmpdir = tempfile.mkdtemp(prefix=f'armenu_job{job.id}_')
        try:
            job.set_stage('library', progress=10)
            if job.prefer_library:
                try:
                    lib, conf, method = library.find_best(dish)
                    if lib:
                        library.copy_from_library(dish, lib, real_size_cm=job.real_size_cm)
                        return self._done(job, provider='library', cost=0.0, extra={'library_key': lib.key, 'confidence': conf, 'method': method}, t0=t0)
                except Exception as e:
                    log.warning(f'[worker] library check xato: {e}')
            images = generate.prepare_images(job.images or [])
            if not images:
                raise ValueError('Rasm yo\'q — AI generatsiya mumkin emas')
            gen = generate.generate_3d(images, dish.name_uz, job=job)
            job.provider = gen['provider']
            job.cost_usd = gen['cost_usd']
            job.save(update_fields=['provider', 'cost_usd'])
            raw_glb = gen['glb_path']
            glb_out = os.path.join(tmpdir, f'dish_{dish.id}.glb')
            opt = optimize.optimize_glb(raw_glb, glb_out, float(job.real_size_cm), job=job)
            expected_m = float(job.real_size_cm) / 100.0
            try:
                if not optimize.verify_scale(glb_out, expected_m):
                    raise ValueError(f'⛔ O\'LCHAM NAZORATI O\'TMADI: kutilgan {expected_m} m.')
            except Exception as e:
                if 'O\'LCHAM' in str(e):
                    raise
                log.warning(f'[worker] verify_scale xato: {e}')
            usdz_out = os.path.join(tmpdir, f'dish_{dish.id}.usdz')
            u = usdz.glb_to_usdz(glb_out, usdz_out, job=job)
            poster_out = os.path.join(tmpdir, f'dish_{dish.id}.webp')
            pr = poster.render_poster(glb_out, poster_out, job=job)
            if not pr.get('ok') and gen.get('thumbnail'):
                try:
                    pr = poster.poster_from_url(gen['thumbnail'], poster_out)
                except Exception:
                    pass
            glb_url = storage.upload(glb_out, 'ar/glb', dish.id, job=job)
            usdz_url = storage.upload(usdz_out, 'ar/usdz', dish.id) if u.get('ok') else ''
            poster_url = storage.upload(poster_out, 'ar/poster', dish.id) if pr.get('ok') else ''
            m3d.glb_url = glb_url
            m3d.usdz_url = usdz_url
            m3d.poster_url = poster_url
            m3d.glb_bytes = opt.get('bytes', 0)
            m3d.usdz_bytes = u.get('bytes', 0)
            m3d.poly_count = opt.get('triangles', 0)
            m3d.real_size_cm = job.real_size_cm
            m3d.status = 'ready'
            m3d.source = 'ai'
            m3d.progress = 100
            m3d.ready_at = timezone.now()
            m3d.save()
            # add to library (optional)
            try:
                if hasattr(library, 'add_to_library'):
                    library.add_to_library(dish, m3d, job=job)
            except Exception as e:
                log.warning(f'[worker] add_to_library xato: {e}')
            self._done(job, provider=gen['provider'], cost=gen['cost_usd'], extra={'glb_bytes': opt.get('bytes', 0), 'usdz_ok': u.get('ok', False), 'triangles': opt.get('triangles', 0)}, t0=t0)
            if os.path.exists(raw_glb):
                try:
                    os.unlink(raw_glb)
                except Exception:
                    pass
        except Exception as e:
            self._fail(job, m3d, e)
        finally:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
            try:
                connection.close()
            except Exception:
                pass

    def _done(self, job, provider, cost, extra, t0):
        took = int(time.time() - t0)
        job.status = 'done'
        job.stage = 'done'
        job.progress = 100
        job.provider = provider
        job.cost_usd = cost
        job.finished_at = timezone.now()
        job.result = dict(extra, took_sec=took)
        job.save()
        log.info(f'[worker] ✅ Job#{job.id} tugadi — {provider}, ${cost}, {took}s')
        try:
            from core.ws import ws_send, g_admin
            ws_send(g_admin(job.restaurant_id), 'model3d.ready', {'job_id': job.id, 'dish_id': job.dish_id, 'dish_name': job.dish.name_uz, 'provider': provider, 'cost_usd': float(cost), 'took_sec': took, **extra})
        except Exception:
            pass
        try:
            from core.queue import enqueue
            enqueue('notify', 'model3d_ready', job_id=job.id, dish_id=job.dish_id)
        except Exception:
            pass

    def _fail(self, job, m3d, exc):
        import traceback
        msg = f'{type(exc).__name__}: {exc}'
        log.error(f'[worker] ⛔ Job#{job.id} xato: {msg}\n{traceback.format_exc()}')
        if job.attempts < job.max_attempts:
            job.status = 'queued'
            job.stage = 'library'
            job.progress = 0
            job.error = msg[:2000]
            job.save()
            log.info(f'[worker] Job#{job.id} qayta navbatda ({job.attempts}/{job.max_attempts})')
            return
        job.status = 'failed'
        job.error = msg[:2000]
        job.finished_at = timezone.now()
        job.save()
        try:
            m3d.status = 'failed'
            m3d.error_msg = msg[:500]
            m3d.progress = 0
            m3d.save()
        except Exception:
            pass
        try:
            from core.ws import ws_send, g_admin
            ws_send(g_admin(job.restaurant_id), 'model3d.failed', {'job_id': job.id, 'dish_id': job.dish_id, 'dish_name': job.dish.name_uz, 'error': msg[:300]})
        except Exception:
            pass
