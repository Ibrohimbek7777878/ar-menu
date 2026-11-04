"""
Sayr testlari uchun umumiy yordamchilar (test fayli emas). Haqiqiy kichik videolar ffmpeg (`lavfi testsrc`) bilan yasaladi va
jarayon davomida bir marta keshlanadi; media papkasi vaqtinchalik (haqiqiy `media/` ga yozilmaydi).
"""
import atexit
import json
import os
import shutil
import subprocess
import tempfile
import unittest

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings

from shops.test_tenant_kit import make_tenant, tenant_settings
from tours.models import Tour

TEST_MEDIA = tempfile.mkdtemp(prefix='tours_media_')      # umumiy ildiz; har test o'z ichki papkasini oladi
TEST_TMP = tempfile.mkdtemp(prefix='tours_tmp_')
_VIDEOS = tempfile.mkdtemp(prefix='tours_videos_')
for _path in (TEST_MEDIA, TEST_TMP, _VIDEOS):
    atexit.register(shutil.rmtree, _path, True)

HAVE_FFMPEG = bool(shutil.which('ffmpeg') and shutil.which('ffprobe'))
needs_ffmpeg = unittest.skipUnless(HAVE_FFMPEG, 'ffmpeg/ffprobe o\'rnatilmagan')
ADMIN = '/api/restaurant/admin/v1/tours/'
GUEST = '/api/restaurant/guest/tour/'
_cache = {}


def _run(args):
    subprocess.run(args, check=True, stdin=subprocess.DEVNULL, capture_output=True, timeout=120)


def video_file(name='plain', *, seconds=2, size='320x240', codec='libx264', audio=True, ext='mp4', rotation=0, fps=15):
    """Haqiqiy kichik video fayl yo'li (keshlanadi). `rotation=90` - displaymatrix (telefon vertikal videosi)."""
    key = (name, seconds, size, codec, audio, ext, rotation, fps)
    if key in _cache:
        return _cache[key]
    path = os.path.join(_VIDEOS, f'{len(_cache)}.{ext}')
    cmd = ['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'testsrc=size={size}:rate={fps}:duration={seconds}']
    if audio:
        cmd += ['-f', 'lavfi', '-i', f'sine=frequency=440:duration={seconds}']
    cmd += ['-c:v', codec, '-pix_fmt', 'yuv420p']
    if codec == 'libvpx-vp9':
        cmd += ['-b:v', '200k', '-deadline', 'realtime', '-cpu-used', '8']
    if audio:
        cmd += ['-c:a', 'libopus' if ext == 'webm' else 'aac', '-shortest']
    plain = path if not rotation else path + '.plain.' + ext
    _run([*cmd, plain])
    if rotation:
        _run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-display_rotation', str(rotation), '-i', plain, '-c', 'copy', path])
    _cache[key] = path
    return path


def upload_of(path, name='video.mp4', content_type='video/mp4'):
    with open(path, 'rb') as handle:
        return SimpleUploadedFile(name, handle.read(), content_type=content_type)


def host_of(tenant):
    return {'HTTP_HOST': tenant.host}


def login(user):
    client = Client()
    client.force_login(user)
    return client


@tenant_settings(TOUR_TMP_DIR=TEST_TMP)
class TourTestCase(TestCase):
    """Ikki tenant (alfa, bravo) va ularning egalari/ofitsiantlari; media papkasi vaqtinchalik."""

    @classmethod
    def setUpTestData(cls):
        cls.A = make_tenant('alfa', 'ALFA')
        cls.B = make_tenant('bravo', 'BRAVO')

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        # Har testga alohida media papkasi: bazadagi id'lar testlar orasida takrorlanadi, fayllar aralashib ketmasin
        self.media_root = tempfile.mkdtemp(dir=TEST_MEDIA)
        self.enterContext(override_settings(MEDIA_ROOT=self.media_root))

    # ── so'rovlar ──
    def call(self, user, method, path, data=None, tenant=None, **extra):
        client = login(user) if user is not None else Client()
        kwargs = {'HTTP_HOST': (tenant or self.A).host, **extra}
        if isinstance(data, (str, bytes)):                       # tayyor (xom) tana
            kwargs.update(data=data, content_type=extra.pop('content_type', 'application/json'))
            kwargs.update(extra)
        elif method in ('post', 'put', 'patch', 'delete') and data is not None and 'content_type' not in extra:
            kwargs.update(data=json.dumps(data), content_type='application/json')
        elif data is not None:
            kwargs['data'] = data
        return getattr(client, method)(path, **kwargs)

    def admin(self, method, suffix='', data=None, tenant=None, user=None, **extra):
        tenant = tenant or self.A
        return self.call(user or tenant.owner, method, ADMIN + suffix, data, tenant, **extra)

    def create_tour(self, tenant=None, title='Asosiy zal', **extra):
        resp = self.admin('post', '', {'title': title, **extra}, tenant=tenant)
        self.assertEqual(resp.status_code, 201, resp.content)
        return resp.json()

    def upload(self, tour_id, path=None, tenant=None, name='video.mp4', user=None):
        tenant = tenant or self.A
        client = login(user or tenant.owner)
        return client.post(f'{ADMIN}{tour_id}/video/', {'video': upload_of(path or video_file(), name)}, HTTP_HOST=tenant.host)

    def run_worker(self):
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('run_tour_worker', '--once', stdout=out)
        return out.getvalue()

    def ready_tour(self, tenant=None, title='Tayyor', hall=None, duration=20.0, status=Tour.READY):
        """Tayyor (variantli) sayr - ffmpegsiz: ma'lumotlar bazasida to'g'ridan-to'g'ri."""
        tenant = tenant or self.A
        tour = Tour.objects.create(shop=tenant.shop, hall=hall, title=title, status=status, duration_s=duration, width=720, height=1280)
        rel = f'tours/shop_{tenant.shop.pk}/{tour.media_uuid}'
        tour.variants = {key: f'{rel}/{key}.{"jpg" if key == "poster" else "mp4"}' for key in ('scrub', 'play', 'low', 'poster')}
        tour.save(update_fields=['variants'])
        return tour


__all__ = ['TourTestCase', 'video_file', 'upload_of', 'needs_ffmpeg', 'override_settings', 'ADMIN', 'GUEST', 'host_of', 'login']
