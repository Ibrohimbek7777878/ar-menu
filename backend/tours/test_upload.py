"""
Video yuklash xavfsizligi va chegaralari: haqiqiy tekshiruv (ffprobe, kengaytma/Content-Type'ga ishonmaslik), hajm/uzunlik/o'lcham,
kodek, tenant kvotasi, bitta `processing`, fayl yo'lida foydalanuvchi nomi yo'qligi. `UploadValidationMiddleware` bilan birga ishlaydi
(testlar uni chetlab o'tmaydi).
"""
import os
import shutil
import tempfile
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from django.test import override_settings

from tours import limits, media, services, storage
from tours.errors import TourError
from tours.models import Tour
from tours.testkit import ADMIN, TourTestCase, login, needs_ffmpeg, upload_of, video_file


def tour_dirs(shop):
    root = os.path.join(str(settings.MEDIA_ROOT), 'tours', f'shop_{shop.pk}')
    return sorted(os.listdir(root)) if os.path.isdir(root) else []


def post_raw(case, tour_id, content, name='video.mp4', tenant=None, field='video', user=None):
    tenant = tenant or case.A
    client = login(user or tenant.owner)
    return client.post(f'{ADMIN}{tour_id}/video/', {field: SimpleUploadedFile(name, content)}, HTTP_HOST=tenant.host)


@needs_ffmpeg
class AcceptedUploadTests(TourTestCase):

    def test_real_mp4_is_accepted_and_goes_to_processing(self):
        tour = self.create_tour()
        resp = self.upload(tour['id'])
        self.assertEqual(resp.status_code, 202, resp.content)
        data = resp.json()
        self.assertEqual((data['status'], data['status_label']), ('processing', 'Qayta ishlanmoqda'))
        self.assertEqual((data['width'], data['height'], data['duration_s']), (320, 240, 2.0))
        self.assertEqual(data['variants'], {})
        row = Tour.objects.get(pk=tour['id'])
        self.assertRegex(row.source.name, rf'^tours/shop_{self.A.shop.pk}/[0-9a-f-]{{36}}/source\.mp4$')
        self.assertTrue(os.path.isfile(storage.abs_path(row.source.name)))
        self.assertEqual(row.source_size, os.path.getsize(storage.abs_path(row.source.name)))
        self.assertIsNone(row.processing_claimed_at)

    def test_user_supplied_file_name_never_reaches_the_path(self):
        tour = self.create_tour()
        resp = self.upload(tour['id'], name='../../../etc/passwd evil;rm -rf.mp4')
        self.assertEqual(resp.status_code, 202, resp.content)
        row = Tour.objects.get(pk=tour['id'])
        self.assertNotIn('passwd', row.source.name)
        self.assertNotIn('evil', row.source.name)
        self.assertTrue(row.source.name.endswith('/source.mp4'))

    def test_extension_comes_from_the_real_container(self):
        tour = self.create_tour()
        mov = video_file('mov', ext='mov')
        resp = self.upload(tour['id'], mov, name='kino.mov')
        self.assertEqual(resp.status_code, 202, resp.content)
        self.assertTrue(Tour.objects.get(pk=tour['id']).source.name.endswith('/source.mov'))

    def test_vp9_webm_is_accepted(self):
        try:
            path = video_file('vp9', codec='libvpx-vp9', ext='webm')
        except Exception:                               # noqa: BLE001 — libvpx-vp9 yo'q ffmpeg
            self.skipTest('libvpx-vp9 mavjud emas')
        tour = self.create_tour()
        resp = self.upload(tour['id'], path, name='x.webm')
        self.assertEqual(resp.status_code, 202, resp.content)
        self.assertTrue(Tour.objects.get(pk=tour['id']).source.name.endswith('/source.webm'))

    def test_vertical_phone_video_dimensions_follow_the_rotation_metadata(self):
        path = video_file('rot', size='360x640', rotation=90)         # fayldagi o'lcham 360x640, ko'rinadigani 640x360
        tour = self.create_tour()
        data = self.upload(tour['id'], path).json()
        self.assertEqual((data['width'], data['height']), (640, 360))

    def test_large_upload_is_streamed_from_a_temp_file_not_read_into_memory(self):
        """5 MB dan katta fayl Django'da diskdagi vaqtinchalik fayl bo'ladi; xizmat uni ffprobe'ga yo'li bilan beradi (read() yo'q)."""
        src = video_file()
        big = os.path.join(tempfile.mkdtemp(prefix='tours_big_'), 'big.mp4')
        self.addCleanup(shutil.rmtree, os.path.dirname(big), True)
        shutil.copy(src, big)
        with open(big, 'ab') as handle:                     # `free` qutisi: MP4 da yaroqli, ffprobe e'tiborsiz qoldiradi
            handle.write((6 * 1024 * 1024).to_bytes(4, 'big') + b'free' + b'\x00' * (6 * 1024 * 1024 - 8))
        seen = {}
        original = media.probe_video

        def spy(path):
            seen['path'] = path
            return original(path)

        tour = self.create_tour()
        with mock.patch('tours.services.media.probe_video', side_effect=spy):
            resp = self.upload(tour['id'], big)
        self.assertEqual(resp.status_code, 202, resp.content)
        self.assertGreater(Tour.objects.get(pk=tour['id']).source_size, 6 * 1024 * 1024)
        self.assertNotIn(str(settings.MEDIA_ROOT), seen['path'])           # tekshiruv MEDIA'dan tashqarida (ochiq berilmaydigan joyda)
        self.assertEqual(os.listdir(limits.tmp_dir()) if os.path.isdir(limits.tmp_dir()) else [], [])

    def test_small_uploads_leave_no_temp_files(self):
        tour = self.create_tour()
        self.assertEqual(self.upload(tour['id']).status_code, 202)
        self.assertEqual(os.listdir(limits.tmp_dir()) if os.path.isdir(limits.tmp_dir()) else [], [])


class RejectedUploadTests(TourTestCase):
    """Rad etilgan yuklash: javob 4xx, sayr o'zgarmaydi (qoralama), diskda yangi papka/yetim fayl qolmaydi."""

    def assertRejected(self, resp, status, code=None):
        self.assertEqual(resp.status_code, status, resp.content)
        if code:
            self.assertEqual(resp.json()['code'], code, resp.content)
        self.assertTrue(resp.json().get('error'))

    def setUp(self):
        super().setUp()
        self.tour = self.create_tour()
        self.before = tour_dirs(self.A.shop)

    def assertUntouched(self):
        row = Tour.objects.get(pk=self.tour['id'])
        self.assertEqual((row.status, row.source.name, row.source_size), ('draft', '', 0))
        self.assertEqual(tour_dirs(self.A.shop), self.before)

    def test_text_named_mp4_is_rejected_by_the_upload_middleware(self):
        resp = post_raw(self, self.tour['id'], b'bu video emas, oddiy matn' * 50)
        self.assertRejected(resp, 400)
        self.assertIn('video emas', resp.json()['error'])
        self.assertUntouched()

    def test_html_named_mp4_is_rejected(self):
        self.assertRejected(post_raw(self, self.tour['id'], b'<html><script>alert(1)</script></html>'), 400)
        self.assertUntouched()

    def test_disallowed_extension_is_rejected(self):
        for name in ('x.mkv', 'x.avi', 'x.php', 'x.svg', 'noext'):
            self.assertRejected(post_raw(self, self.tour['id'], b'\x00\x00\x00\x18ftypmp42' + b'\x00' * 64, name=name), 400)
        self.assertUntouched()

    @needs_ffmpeg
    def test_valid_signature_but_garbage_inside_is_rejected_by_ffprobe(self):
        """Middleware faqat imzoga qaraydi (`ftyp`); haqiqiy tekshiruv bizning ffprobe."""
        fake = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom' + os.urandom(4096)
        self.assertRejected(post_raw(self, self.tour['id'], fake), 400, 'invalid_video')
        self.assertUntouched()

    @needs_ffmpeg
    def test_truncated_real_video_is_rejected(self):
        with open(video_file(), 'rb') as handle:
            data = handle.read()
        resp = post_raw(self, self.tour['id'], data[:len(data) // 3])
        self.assertRejected(resp, 400, 'invalid_video')
        self.assertUntouched()

    @needs_ffmpeg
    def test_playlist_and_text_files_never_reach_ffprobe(self):
        """HLS/concat matni ffprobe'ning avtomatik aniqlashida "o'qiladigan" format: bizda imzo tekshiruvi va majburiy demuxer."""
        with mock.patch('tours.media.run') as run:
            for content in (b'#EXTM3U\n#EXTINF:1,\nhttp://169.254.169.254/latest/\n', b'ffconcat version 1.0\nfile /etc/passwd\n'):
                path = os.path.join(tempfile.mkdtemp(prefix='tours_pl_'), 'a.mp4')
                self.addCleanup(shutil.rmtree, os.path.dirname(path), True)
                open(path, 'wb').write(content)
                with self.assertRaises(TourError) as ctx:
                    media.probe_video(path)
                self.assertEqual(ctx.exception.code, 'invalid_video')
            run.assert_not_called()

    @needs_ffmpeg
    def test_probe_pins_the_demuxer_and_protocols(self):
        with mock.patch('tours.media.run', return_value=b'{}') as run:
            with self.assertRaises(TourError):
                media.probe_video(video_file())
        args = run.call_args[0][0]
        self.assertEqual(args[0], 'ffprobe')
        self.assertIn('-protocol_whitelist', args)
        self.assertEqual(args[args.index('-protocol_whitelist') + 1], 'file')
        self.assertEqual(args[args.index('-f') + 1], 'mov')
        self.assertIsInstance(args, list)

    @needs_ffmpeg
    def test_no_file_field(self):
        resp = post_raw(self, self.tour['id'], open(video_file(), 'rb').read(), field='file')
        self.assertRejected(resp, 400, 'no_file')
        resp = self.admin('post', f'{self.tour["id"]}/video/', {})
        self.assertRejected(resp, 400, 'no_file')

    @needs_ffmpeg
    @override_settings(TOUR_MAX_SOURCE_MB=0.001)
    def test_size_limit(self):
        self.assertRejected(self.upload(self.tour['id']), 413, 'too_large')
        self.assertUntouched()

    @needs_ffmpeg
    @override_settings(UPLOAD_MAX_VIDEO_MB=0.001)
    def test_the_upload_middleware_limit_applies_before_our_own(self):
        """`UPLOAD_MAX_VIDEO_MB` (standart 50) view'dan OLDIN ishlaydi: samarali chegara - ikkalasining kichigi (hisobotga qarang)."""
        resp = self.upload(self.tour['id'])
        self.assertRejected(resp, 400)
        self.assertIn('Video hajmi', resp.json()['error'])
        self.assertUntouched()

    @needs_ffmpeg
    @override_settings(TOUR_MAX_DURATION_S=1)
    def test_duration_limit(self):
        self.assertRejected(self.upload(self.tour['id']), 400, 'too_long')
        self.assertUntouched()

    @needs_ffmpeg
    @override_settings(TOUR_MAX_DIMENSION=200)
    def test_resolution_limit(self):
        self.assertRejected(self.upload(self.tour['id']), 400, 'too_big_resolution')
        self.assertUntouched()

    @needs_ffmpeg
    def test_codec_whitelist(self):
        path = video_file('mpeg4', codec='mpeg4', audio=False)
        self.assertRejected(self.upload(self.tour['id'], path), 400, 'unsupported_codec')
        self.assertUntouched()

    @needs_ffmpeg
    def test_audio_only_file_is_rejected(self):
        import subprocess
        path = os.path.join(tempfile.mkdtemp(prefix='tours_aud_'), 'a.mp4')
        self.addCleanup(shutil.rmtree, os.path.dirname(path), True)
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=duration=2', '-c:a', 'aac', path],
                       check=True, capture_output=True)
        self.assertRejected(self.upload(self.tour['id'], path), 400, 'invalid_video')
        self.assertUntouched()

    @needs_ffmpeg
    def test_foreign_and_unknown_tours_are_404(self):
        theirs = self.ready_tour(tenant=self.B)
        for tour_id in (theirs.pk, 99999999):
            self.assertRejected(self.upload(tour_id), 404, 'not_found')
        self.assertEqual(Tour.objects.get(pk=theirs.pk).status, Tour.READY)
        self.assertEqual(tour_dirs(self.B.shop), [])

    @needs_ffmpeg
    def test_anonymous_and_unprivileged_users_cannot_upload(self):
        from django.test import Client
        resp = Client().post(f'{ADMIN}{self.tour["id"]}/video/', {'video': upload_of(video_file())}, HTTP_HOST=self.A.host)
        self.assertIn(resp.status_code, (401, 403))
        resp = self.upload(self.tour['id'], user=self.A.waiter)
        self.assertEqual(resp.status_code, 403)
        self.assertUntouched()

    def test_storage_path_helper_refuses_traversal(self):
        for bad in ('../x', 'tours/../../etc/passwd', '/etc/passwd', 'media/../../x'):
            with self.assertRaises(ValueError, msg=bad):
                storage.abs_path(bad)

    def test_remove_dir_only_touches_tour_directories(self):
        outside = os.path.join(str(settings.MEDIA_ROOT), 'keep')
        os.makedirs(outside, exist_ok=True)
        for bad in ('keep', 'tours', 'tours/shop_1', '../keep', 'tours/shop_1/../../keep', ''):
            self.assertFalse(storage.remove_dir(bad), bad)
        self.assertTrue(os.path.isdir(outside))


@needs_ffmpeg
class QuotaAndConcurrencyTests(TourTestCase):

    @override_settings(TOUR_TENANT_QUOTA_MB=0.005)               # ~5 KB: kichik test videosi sig'maydi
    def test_quota_blocks_the_upload(self):
        tour = self.create_tour()
        resp = self.upload(tour['id'])
        self.assertEqual((resp.status_code, resp.json()['code']), (413, 'quota_exceeded'))
        self.assertEqual(Tour.objects.get(pk=tour['id']).status, 'draft')

    def test_archived_tours_files_still_count_toward_the_quota(self):
        size = os.path.getsize(video_file())
        old = self.ready_tour(title='Eski')
        Tour.objects.filter(pk=old.pk).update(source_size=size * 2, variants_size=0, is_archived=True)
        tour = self.create_tour()
        with override_settings(TOUR_TENANT_QUOTA_MB=(size * 2 + size // 2) / 1024 / 1024):
            resp = self.upload(tour['id'])
            self.assertEqual((resp.status_code, resp.json()['code']), (413, 'quota_exceeded'))
            # boshqa restoranning kvotasi alohida
            theirs = self.create_tour(tenant=self.B)
            self.assertEqual(self.upload(theirs['id'], tenant=self.B).status_code, 202)

    def test_replacing_the_video_of_a_tour_does_not_count_its_own_old_files_twice(self):
        size = os.path.getsize(video_file())
        tour = self.ready_tour()
        Tour.objects.filter(pk=tour.pk).update(source_size=size, variants_size=0)
        with override_settings(TOUR_TENANT_QUOTA_MB=(size * 1.5) / 1024 / 1024):
            self.assertEqual(self.upload(tour.pk).status_code, 202)

    def test_only_one_processing_tour_per_tenant(self):
        first, second = self.create_tour(), self.create_tour(title='Ikkinchi')
        self.assertEqual(self.upload(first['id']).status_code, 202)
        resp = self.upload(second['id'])
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'processing_busy'))
        resp = self.upload(first['id'])                                    # xuddi shu sayr hali qayta ishlanmoqda
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'processing_busy'))
        self.assertEqual(Tour.objects.get(pk=second['id']).status, 'draft')
        # boshqa restoran to'siqqa uchramaydi
        theirs = self.create_tour(tenant=self.B)
        self.assertEqual(self.upload(theirs['id'], tenant=self.B).status_code, 202)

    def test_database_guard_wins_a_race_and_cleans_the_new_file(self):
        """Ikki so'rov bir vaqtda oldindan tekshiruvdan o'tsa ham, bazadagi qisman noyob indeks ikkinchisini to'xtatadi."""
        first, second = self.create_tour(), self.create_tour(title='Ikkinchi')
        self.assertEqual(self.upload(first['id']).status_code, 202)
        before = tour_dirs(self.A.shop)
        with mock.patch.object(services, '_check_free'):                   # tekshiruvlar "o'tib ketdi" (poyga)
            resp = self.upload(second['id'])
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'processing_busy'))
        self.assertEqual(tour_dirs(self.A.shop), before)
        self.assertEqual(Tour.objects.filter(shop=self.A.shop, status=Tour.PROCESSING).count(), 1)

    def test_published_tour_video_cannot_be_replaced(self):
        tour = self.ready_tour()
        self.admin('post', f'{tour.pk}/publish/')
        resp = self.upload(tour.pk)
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'published'))

    def test_archived_tour_cannot_get_a_video(self):
        tour = self.create_tour()
        self.admin('delete', f'{tour["id"]}/')
        resp = self.upload(tour['id'])
        self.assertEqual((resp.status_code, resp.json()['code']), (409, 'archived'))

    def test_reupload_cleans_the_old_files_after_the_new_one_is_accepted(self):
        tour = self.create_tour()
        self.assertEqual(self.upload(tour['id']).status_code, 202)
        self.run_worker()
        row = Tour.objects.get(pk=tour['id'])
        self.assertEqual(row.status, 'ready')
        old_dir = storage.abs_path(storage.dir_of(row))
        self.assertTrue(os.path.isfile(os.path.join(old_dir, 'scrub.mp4')))
        row.ai_status, row.ai_suggestions = 'done', {'stops': [], 'hotspots': []}
        row.save(update_fields=['ai_status', 'ai_suggestions'])

        self.assertEqual(self.upload(tour['id']).status_code, 202)
        row = Tour.objects.get(pk=tour['id'])
        self.assertFalse(os.path.exists(old_dir), 'eski papka (manba + variantlar) tozalanishi kerak')
        self.assertTrue(os.path.isfile(storage.abs_path(row.source.name)))
        self.assertEqual((row.status, row.variants, row.variants_size, row.ai_status, row.ai_suggestions), ('processing', {}, 0, 'idle', None))
        self.assertEqual(len(tour_dirs(self.A.shop)), 1)                     # faqat yangi papka

    def test_rejected_reupload_keeps_the_old_files(self):
        tour = self.create_tour()
        self.upload(tour['id'])
        self.run_worker()
        row = Tour.objects.get(pk=tour['id'])
        old_dir = storage.abs_path(storage.dir_of(row))
        resp = post_raw(self, tour['id'], b'\x00\x00\x00\x18ftypmp42' + os.urandom(2048))
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(os.path.isfile(os.path.join(old_dir, 'play.mp4')))
        self.assertEqual(Tour.objects.get(pk=tour['id']).status, 'ready')
