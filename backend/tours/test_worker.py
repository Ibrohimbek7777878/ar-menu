"""Sayr ishchisi (`run_tour_worker`): haqiqiy ffmpeg bilan variantlar, xato holatlari, navbat (olish, qotib qolish), `run_workers` ulanishi."""
import json
import os
import shutil
import subprocess
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.utils import timezone

from tours import media, pipeline, storage
from tours.models import Tour
from tours.testkit import TourTestCase, needs_ffmpeg, video_file


def probe(path, entries='stream=codec_type,width,height,avg_frame_rate'):
    out = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_entries', entries, path],
                         check=True, capture_output=True).stdout
    return json.loads(out)


def keyframes(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-skip_frame', 'nokey', '-select_streams', 'v', '-show_entries', 'frame=pts_time',
                          '-of', 'csv=p=0', path], check=True, capture_output=True).stdout
    return len([line for line in out.decode().splitlines() if line.strip()])


def frames(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames',
                          '-of', 'csv=p=0', path], check=True, capture_output=True).stdout
    return int(out.decode().strip())


@needs_ffmpeg
class VariantTests(TourTestCase):

    def process(self, path, **kw):
        tour = self.create_tour()
        self.assertEqual(self.upload(tour['id'], path, **kw).status_code, 202)
        self.assertIn('tour_ready=1', self.run_worker())
        row = Tour.objects.get(pk=tour['id'])
        self.assertEqual(row.status, 'ready', row.error)
        return row, storage.abs_path(storage.dir_of(row))

    def test_all_variants_are_made_and_the_tour_becomes_ready(self):
        row, folder = self.process(video_file(seconds=3))
        self.assertEqual(sorted(row.variants), ['low', 'play', 'poster', 'scrub'])
        for key, rel in row.variants.items():
            self.assertTrue(rel.startswith(f'tours/shop_{self.A.shop.pk}/{row.media_uuid}/'), rel)
            self.assertTrue(os.path.getsize(storage.abs_path(rel)) > 0, key)
        self.assertEqual(row.variants_size, sum(os.path.getsize(os.path.join(folder, f)) for f in
                                                ('scrub.mp4', 'play.mp4', 'low.mp4', 'poster.jpg')))
        self.assertEqual((row.error, row.processing_claimed_at), ('', None))
        self.assertAlmostEqual(row.duration_s, 3.0, delta=0.2)
        self.assertEqual((row.width, row.height), (320, 240))
        self.assertTrue(os.path.isfile(storage.abs_path(row.source.name)), 'asl fayl saqlanadi')

    def test_gop_audio_and_poster_per_variant(self):
        row, folder = self.process(video_file(seconds=4, fps=15))
        scrub, play, low = (os.path.join(folder, f'{n}.mp4') for n in ('scrub', 'play', 'low'))
        self.assertGreaterEqual(keyframes(scrub), frames(scrub) // 6)             # har 6-kadr kalit
        self.assertLessEqual(keyframes(play), 2)                                    # GOP 48 (60 kadr)
        self.assertGreaterEqual(keyframes(low), frames(low) // 12)                  # GOP 12
        self.assertLessEqual(keyframes(low), frames(low) // 12 + 1)
        kinds = lambda p: {s['codec_type'] for s in probe(p)['streams']}             # noqa: E731
        self.assertEqual(kinds(scrub), {'video'})
        self.assertEqual(kinds(low), {'video'})
        self.assertEqual(kinds(play), {'video'})                                     # maxfiylik: tovush saqlanmaydi
        poster = probe(os.path.join(folder, 'poster.jpg'))['streams'][0]
        self.assertEqual((poster['width'], poster['height']), (320, 240))
        with open(os.path.join(folder, 'poster.jpg'), 'rb') as handle:
            self.assertEqual(handle.read(3), b'\xff\xd8\xff')
        for path in (scrub, play, low):                                              # faststart: moov boshida
            with open(path, 'rb') as handle:
                head = handle.read(4096)
            self.assertLess(head.find(b'moov'), head.find(b'mdat') if b'mdat' in head else 10 ** 9)

    def test_audio_less_source_is_fine(self):
        row, folder = self.process(video_file('mute', audio=False))
        self.assertEqual({s['codec_type'] for s in probe(os.path.join(folder, 'play.mp4'))['streams']}, {'video'})

    def test_phone_portrait_is_scaled_to_720_wide_with_even_sizes(self):
        row, folder = self.process(video_file('phone', size='1080x1920', seconds=1, fps=10))
        for name, width in (('scrub', 720), ('play', 720), ('low', 480)):
            stream = probe(os.path.join(folder, f'{name}.mp4'))['streams'][0]
            self.assertEqual(stream['width'], width, name)
            self.assertLessEqual(abs(stream['height'] - width * 16 / 9), 1.0, name)
            self.assertEqual(stream['height'] % 2, 0, name)
        self.assertEqual((row.width, row.height), (720, 1280))

    def test_small_source_is_not_upscaled_and_odd_sizes_become_even(self):
        row, folder = self.process(video_file('odd', size='322x242', seconds=1))
        stream = probe(os.path.join(folder, 'scrub.mp4'))['streams'][0]
        self.assertEqual((stream['width'] % 2, stream['height'] % 2), (0, 0))
        self.assertLessEqual(stream['width'], 322)

    def test_rotation_metadata_is_honoured(self):
        """Vertikal telefon videosi: fayl 360x640 + displaymatrix 90 gradus -> ko'rinadigan 640x360; chiqish shunga mos."""
        row, folder = self.process(video_file('rotated', size='360x640', rotation=90))
        stream = probe(os.path.join(folder, 'scrub.mp4'))['streams'][0]
        self.assertEqual((stream['width'], stream['height']), (640, 360))
        self.assertEqual((row.width, row.height), (640, 360))

    def test_high_frame_rate_is_capped_to_30(self):
        row, folder = self.process(video_file('fps60', fps=60, seconds=1))
        rate = probe(os.path.join(folder, 'scrub.mp4'))['streams'][0]['avg_frame_rate']
        num, den = (int(x) for x in rate.split('/'))
        self.assertLessEqual(num / den, 30.5)

    def test_subprocess_calls_are_lists_with_timeout_nice_and_two_threads(self):
        seen = []
        real = subprocess.run

        def spy(args, **kwargs):
            seen.append((args, kwargs))
            return real(args, **kwargs)

        path = video_file(seconds=1)                                                # (subprocess.run global: avval yaratamiz)
        with mock.patch('tours.media.subprocess.run', side_effect=spy):
            self.process(path)
        self.assertGreaterEqual(len(seen), 5)                                       # 2 ffprobe + 4 ffmpeg (poster ham)
        for args, kwargs in seen:
            self.assertIsInstance(args, list)
            self.assertFalse(kwargs.get('shell', False))
            self.assertGreater(kwargs['timeout'], 0)
            self.assertEqual(kwargs['stdin'], subprocess.DEVNULL)
            self.assertNotIn('PATH=', ' '.join(map(str, args)))
        encodes = [args for args, _ in seen if 'libx264' in args]
        self.assertEqual(len(encodes), 3)
        for args in encodes:
            self.assertEqual(args[args.index('-threads') + 1], '2')
            self.assertIn('-protocol_whitelist', args)
        nice = shutil.which('nice')
        if nice:
            self.assertTrue(all(args[:3] == [nice, '-n', '10'] for args in encodes), encodes[0][:4])


@needs_ffmpeg
class FailureTests(TourTestCase):

    def uploaded(self):
        tour = self.create_tour()
        self.assertEqual(self.upload(tour['id']).status_code, 202)
        return Tour.objects.get(pk=tour['id'])

    def test_corrupt_source_becomes_failed_with_a_human_message_only(self):
        row = self.uploaded()
        path = storage.abs_path(row.source.name)
        with open(path, 'r+b') as handle:
            handle.truncate(2000)
        self.assertIn('tour_failed=1', self.run_worker())
        row.refresh_from_db()
        self.assertEqual(row.status, 'failed')
        self.assertTrue(row.error)
        for leak in ('ffmpeg', 'ffprobe', 'moov', 'Invalid data', path, 'stderr', '/'):
            self.assertNotIn(leak, row.error)
        self.assertIsNone(row.processing_claimed_at)
        self.assertEqual(row.variants, {})
        self.assertFalse(os.path.exists(os.path.join(os.path.dirname(path), 'scrub.mp4')))

    def test_missing_source_file_becomes_failed(self):
        row = self.uploaded()
        os.unlink(storage.abs_path(row.source.name))
        self.run_worker()
        row.refresh_from_db()
        self.assertEqual(row.status, 'failed')
        self.assertIn('qayta yuklang', row.error)

    def test_encoder_failure_cleans_partial_variants_and_hides_stderr(self):
        row = self.uploaded()
        folder = os.path.dirname(storage.abs_path(row.source.name))
        calls = {'n': 0}
        real = media.run

        def flaky(args, timeout, **kw):
            if args[0] != 'ffprobe' and 'play.mp4' in args[-1]:
                raise media.MediaFailure("Videoni qayta ishlab bo'lmadi", 'Error while decoding stream #0:0: Invalid data /srv/secret/path')
            calls['n'] += 1
            return real(args, timeout, **kw)

        with mock.patch('tours.media.run', side_effect=flaky):
            self.run_worker()
        row.refresh_from_db()
        self.assertEqual(row.status, 'failed')
        self.assertNotIn('secret', row.error)
        self.assertNotIn('Invalid data', row.error)
        self.assertEqual([f for f in os.listdir(folder) if f != os.path.basename(row.source.name)], [])

    def test_timeout_is_reported_without_details(self):
        row = self.uploaded()
        real = subprocess.run

        def slow(args, **kwargs):
            if any(str(a).endswith('scrub.mp4') for a in args):
                raise subprocess.TimeoutExpired(args, kwargs['timeout'])
            return real(args, **kwargs)

        with mock.patch('tours.media.subprocess.run', side_effect=slow):
            self.run_worker()
        row.refresh_from_db()
        self.assertEqual(row.status, 'failed')
        self.assertIn('vaqti tugadi', row.error)

    def test_missing_ffmpeg_binary_is_a_clear_failure(self):
        row = self.uploaded()
        with mock.patch('tours.media.subprocess.run', side_effect=FileNotFoundError('ffmpeg')):
            self.run_worker()
        row.refresh_from_db()
        self.assertEqual(row.status, 'failed')
        self.assertIn('ffmpeg', row.error)

    def test_failed_tour_frees_the_processing_slot_and_can_be_retried_by_uploading_again(self):
        row = self.uploaded()
        os.unlink(storage.abs_path(row.source.name))
        self.run_worker()
        other = self.create_tour(title='Boshqa')
        self.assertEqual(self.upload(other['id']).status_code, 202)           # slot bo'sh
        self.run_worker()
        self.assertEqual(self.upload(row.pk).status_code, 202)                # xatoli sayrga qayta yuklash mumkin
        self.assertEqual(Tour.objects.get(pk=row.pk).status, 'processing')

    def test_archived_tour_still_finishes_but_stays_archived(self):
        row = self.uploaded()
        self.admin('delete', f'{row.pk}/')
        self.run_worker()
        row.refresh_from_db()
        self.assertEqual((row.status, row.is_archived), ('ready', True))


class QueueTests(TourTestCase):
    """Navbat mantig'i ffmpeg'siz: bazadagi holatlar bilan."""

    def queued(self, tenant=None, **extra):
        tenant = tenant or self.A
        tour = Tour.objects.create(shop=tenant.shop, title='Q', status=Tour.PROCESSING, processing_started_at=timezone.now(), **extra)
        tour.source.name = f'tours/shop_{tenant.shop.pk}/{tour.media_uuid}/source.mp4'
        tour.save(update_fields=['source'])
        return tour

    def test_claim_is_exclusive_and_counts_attempts(self):
        tour = self.queued()
        first = pipeline.claim_next_video()
        self.assertEqual(first.pk, tour.pk)
        self.assertIsNone(pipeline.claim_next_video())
        tour.refresh_from_db()
        self.assertEqual((tour.attempts, tour.status), (1, 'processing'))
        self.assertIsNotNone(tour.processing_claimed_at)

    def test_only_processing_tours_with_a_source_are_claimed(self):
        Tour.objects.create(shop=self.A.shop, title='draft')
        Tour.objects.create(shop=self.B.shop, title='ready', status=Tour.READY)
        Tour.objects.create(shop=self.A.shop, title='nosource', status=Tour.PROCESSING)
        self.assertIsNone(pipeline.claim_next_video())

    def test_oldest_job_goes_first_across_tenants(self):
        newer = self.queued(self.A)
        older = self.queued(self.B)
        Tour.objects.filter(pk=older.pk).update(processing_started_at=timezone.now() - timedelta(minutes=5))
        self.assertEqual(pipeline.claim_next_video().pk, older.pk)
        self.assertEqual(pipeline.claim_next_video().pk, newer.pk)

    def test_stale_claimed_job_is_requeued_then_failed_after_max_attempts(self):
        tour = self.queued()
        pipeline.claim_next_video()
        old = timezone.now() - timedelta(hours=3)
        Tour.objects.filter(pk=tour.pk).update(processing_claimed_at=old)
        self.assertEqual(pipeline.recover_stale_jobs(), 1)
        tour.refresh_from_db()
        self.assertEqual((tour.status, tour.processing_claimed_at), ('processing', None))
        self.assertEqual(pipeline.claim_next_video().pk, tour.pk)              # 2-urinish
        Tour.objects.filter(pk=tour.pk).update(processing_claimed_at=old)
        self.assertEqual(pipeline.recover_stale_jobs(), 1)
        tour.refresh_from_db()
        self.assertEqual(tour.status, 'failed')
        self.assertIn('qayta yuklang', tour.error)
        self.assertIsNone(pipeline.claim_next_video())

    def test_fresh_claim_is_not_touched_by_recovery(self):
        tour = self.queued()
        pipeline.claim_next_video()
        self.assertEqual(pipeline.recover_stale_jobs(), 0)
        tour.refresh_from_db()
        self.assertIsNotNone(tour.processing_claimed_at)

    @needs_ffmpeg
    def test_run_workers_command_drains_the_tours_queue(self):
        tour = self.create_tour()
        self.upload(tour['id'])
        out = StringIO()
        call_command('run_workers', '--once', '--only', 'tours', stdout=out)
        self.assertIn('tours: tour_ready=1', out.getvalue())
        self.assertEqual(Tour.objects.get(pk=tour['id']).status, 'ready')

    def test_empty_queue_is_a_quiet_noop(self):
        self.assertIn("bo'sh", self.run_worker())
        out = StringIO()
        call_command('run_workers', '--once', '--only', 'tours', stdout=out)
        self.assertIn("tours: bo'sh", out.getvalue())

    def test_tours_worker_is_registered_with_run_workers(self):
        from web.management.commands.run_workers import WORKERS
        self.assertIn('tours', WORKERS)
