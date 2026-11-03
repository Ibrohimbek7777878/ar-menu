"""Vaqtincha rasm ombori: egalik, muddat, bir martalik, yo'l o'tish, EXIF, katta piksel, buzuq fayllar."""
import io
import json
import os
import re
import shutil
import struct
import tempfile
import time
import warnings
import zlib
from pathlib import Path
from unittest import mock

from django.test import SimpleTestCase, override_settings
from PIL import Image

from products.menu_import import image_tokens as tokens
from products.menu_import.image_tokens import TempImageError


def make_image(size=(300, 200), fmt='JPEG', mode='RGB', color=(200, 40, 40), **save_kwargs):
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, fmt, **save_kwargs)
    return buffer.getvalue()


def fake_png_header(width, height):
    """Faqat sarlavhasi bor PNG: Pillow o'lchamni o'qiydi, piksellar yo'q (xotira sarflamasdan katta rasmni taqlid qiladi)."""
    def chunk(kind, body):
        crc = zlib.crc32(kind + body) & 0xFFFFFFFF
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', crc)
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IEND', b'')


class TempImageBase(SimpleTestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp(prefix='b1b_media_')
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        self.dir = Path(self.media) / 'import_tmp'
        override = override_settings(MEDIA_ROOT=self.media, MENU_IMPORT_TMP_DIR=str(self.dir))
        override.enable()
        self.addCleanup(override.disable)

    def age(self, token, seconds):
        for suffix in ('.jpg', '.json'):
            path = self.dir / f'{token}{suffix}'
            old = time.time() - seconds
            os.utime(path, (old, old))


class StoreTests(TempImageBase):
    def test_store_returns_strict_token_and_writes_a_clean_jpeg(self):
        token = tokens.store_temp_image(make_image((3000, 2000), 'PNG', mode='RGB'), 7, credit='Boonlong1 · CC BY',
                                        source_url='https://commons.wikimedia.org/wiki/File:Plov.jpg', real_photo=False)
        self.assertRegex(token, r'^[A-Za-z0-9_-]{32}$')
        self.assertTrue((self.dir / f'{token}.jpg').is_file())
        meta = json.loads((self.dir / f'{token}.json').read_text())
        self.assertEqual((meta['shop_id'], meta['real_photo'], meta['credit']), (7, False, 'Boonlong1 · CC BY'))
        with Image.open(self.dir / f'{token}.jpg') as stored:
            self.assertEqual(stored.format, 'JPEG')
            self.assertEqual(stored.mode, 'RGB')
            self.assertEqual(max(stored.size), 1600)
            self.assertEqual(stored.size, (1600, 1067))

    def test_tokens_are_unique(self):
        image = make_image()
        self.assertEqual(len({tokens.store_temp_image(image, 1) for _ in range(20)}), 20)

    def test_max_side_can_be_raised_for_ocr(self):
        big = make_image((4000, 3000), 'JPEG')
        with Image.open(io.BytesIO(tokens.normalize_image(big))) as default:
            self.assertEqual(default.size, (1600, 1200))
        with Image.open(io.BytesIO(tokens.normalize_image(big, max_side=2800))) as wide:
            self.assertEqual(wide.size, (2800, 2100))

    def test_small_images_are_not_enlarged(self):
        token = tokens.store_temp_image(make_image((300, 200)), 1)
        with Image.open(self.dir / f'{token}.jpg') as stored:
            self.assertEqual(stored.size, (300, 200))

    def test_exif_orientation_is_applied_and_all_metadata_is_dropped(self):
        exif = Image.Exif()
        exif[0x0112] = 6   # Orientation: 90 gradusga burilgan
        exif[0x010F] = 'SecretPhoneMaker'
        exif[0x0131] = 'GPSLeakApp'
        image = make_image((200, 100), 'JPEG', exif=exif.tobytes())
        with Image.open(io.BytesIO(image)) as source:
            self.assertEqual(source.getexif().get(0x0112), 6)
        token = tokens.store_temp_image(image, 1)
        raw = (self.dir / f'{token}.jpg').read_bytes()
        with Image.open(io.BytesIO(raw)) as stored:
            self.assertEqual(stored.size, (100, 200))   # burilish qo'llandi
            self.assertEqual(dict(stored.getexif()), {})
            self.assertNotIn('icc_profile', stored.info)
        self.assertNotIn(b'SecretPhoneMaker', raw)
        self.assertNotIn(b'GPSLeakApp', raw)

    def test_transparent_png_and_palette_images_become_rgb_on_white(self):
        token = tokens.store_temp_image(make_image((40, 40), 'PNG', mode='RGBA', color=(255, 0, 0, 0)), 1)
        with Image.open(self.dir / f'{token}.jpg') as stored:
            self.assertEqual(stored.mode, 'RGB')
            r, g, b = stored.getpixel((20, 20))
            self.assertGreater(min(r, g, b), 240)   # shaffof joy oq bo'ldi, qora emas
        buffer = io.BytesIO()
        Image.new('P', (30, 30), 3).save(buffer, 'PNG')
        tokens.store_temp_image(buffer.getvalue(), 1)

    def test_webp_is_accepted(self):
        self.assertTrue(tokens.store_temp_image(make_image((50, 50), 'WEBP'), 1))

    def test_rejects_non_images_with_clear_error(self):
        cases = {
            b'': 'empty',
            b'hello world': 'not_image',
            b'<html><script>alert(1)</script></html>': 'not_image',
            b'%PDF-1.4\n1 0 obj\n': 'not_image',
            b'\xff\xd8\xff\xe0' + b'\x00' * 50: 'not_image',            # JPEG sarlavhasi, tanasi yo'q
            make_image((10, 10), 'GIF', mode='P', color=1): 'unsupported_format',
            make_image((10, 10), 'BMP'): 'unsupported_format',
        }
        for data, code in cases.items():
            with self.assertRaises(TempImageError, msg=data[:20]) as ctx:
                tokens.store_temp_image(data, 1)
            self.assertEqual(ctx.exception.code, code, data[:20])
            self.assertTrue(ctx.exception.message)

    def test_truncated_jpeg_is_rejected(self):
        image = make_image((800, 600), 'JPEG')
        with self.assertRaises(TempImageError) as ctx:
            tokens.store_temp_image(image[:len(image) // 2], 1)
        self.assertEqual(ctx.exception.code, 'not_image')

    def test_input_larger_than_10_mb_is_rejected(self):
        with self.assertRaises(TempImageError) as ctx:
            tokens.store_temp_image(b'\xff\xd8' + b'\x00' * (10 * 1024 * 1024), 1)
        self.assertEqual(ctx.exception.code, 'too_large')

    def test_huge_pixel_counts_are_rejected_before_decoding(self):
        for width, height in ((10000, 10000), (20000, 20000), (40001, 1000)):   # 100 Mpx, 400 Mpx (Pillow bomb), 40 Mpx+
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', Image.DecompressionBombWarning)   # Pillow 89 Mpx dan keyin ogohlantiradi
                with self.assertRaises(TempImageError, msg=(width, height)) as ctx:
                    tokens.store_temp_image(fake_png_header(width, height), 1)
            self.assertEqual(ctx.exception.code, 'too_many_pixels')
        self.assertFalse(self.dir.exists() and list(self.dir.iterdir()))

    def test_invalid_shop_id(self):
        for bad in (None, 0, -3, 'abc', True):
            with self.assertRaises(ValueError):
                tokens.store_temp_image(make_image(), bad)

    def test_credit_and_source_url_are_sanitised(self):
        token = tokens.store_temp_image(make_image(), 1, credit='A\x00B‮C' + 'x' * 400, source_url='javascript:alert(1)')
        info = tokens.peek_temp_image(token, 1)
        self.assertEqual(info['source_url'], '')
        self.assertEqual(len(info['credit']), 255)
        self.assertNotIn('\x00', info['credit'])
        self.assertNotIn('‮', info['credit'])
        ok = tokens.store_temp_image(make_image(), 1, source_url='https://openverse.org/image/abc?x=1')
        self.assertEqual(tokens.peek_temp_image(ok, 1)['source_url'], 'https://openverse.org/image/abc?x=1')
        too_long = tokens.store_temp_image(make_image(), 1, source_url='https://a.example/' + 'p' * 600)
        self.assertEqual(tokens.peek_temp_image(too_long, 1)['source_url'], '')


class OwnershipTests(TempImageBase):
    def test_peek_returns_info_only_to_the_owner(self):
        token = tokens.store_temp_image(make_image(), 5, credit='Rassom · CC BY', source_url='https://x.example/a', real_photo=False)
        info = tokens.peek_temp_image(token, 5)
        self.assertEqual(set(info), {'path', 'credit', 'source_url', 'real_photo'})
        self.assertEqual((info['credit'], info['source_url'], info['real_photo']), ('Rassom · CC BY', 'https://x.example/a', False))
        self.assertTrue(Path(info['path']).is_file())
        self.assertIsNone(tokens.peek_temp_image(token, 6))
        self.assertIsNone(tokens.peek_temp_image(token, None))
        self.assertIsNone(tokens.peek_temp_image(token, True))
        self.assertTrue(tokens.peek_temp_image(token, 5))   # peek iste'mol qilmaydi

    def test_other_shop_cannot_consume_and_does_not_destroy_it(self):
        token = tokens.store_temp_image(make_image(), 5)
        self.assertIsNone(tokens.consume_temp_image(token, 6))
        self.assertTrue((self.dir / f'{token}.jpg').is_file())
        self.assertIsNotNone(tokens.consume_temp_image(token, 5))

    def test_real_photo_flag_roundtrip(self):
        upload = tokens.store_temp_image(make_image(), 1)
        web = tokens.store_temp_image(make_image(), 1, real_photo=False)
        self.assertTrue(tokens.peek_temp_image(upload, 1)['real_photo'])
        self.assertFalse(tokens.peek_temp_image(web, 1)['real_photo'])


class PathTraversalTests(TempImageBase):
    def test_garbage_and_traversal_tokens_are_refused(self):
        outside = Path(self.media)
        (outside / 'secret.jpg').write_bytes(make_image())
        (outside / 'secret.json').write_text(json.dumps({'shop_id': 1, 'created_at': time.time()}))
        good = tokens.store_temp_image(make_image(), 1)
        bad_tokens = [
            None, '', 123, b'x' * 32, [], '../secret', '..%2fsecret', '../../etc/passwd', 'secret',
            good + '/..', good[:-1] + '/', good + '\x00', good + '\n', good[:-1], good + 'a', ' ' + good,
            good.replace(good[0], '.', 1), good[:10] + '/' + good[11:], 'a' * 31 + 'é', '/' + 'a' * 31,
            os.path.join('..', good),
        ]
        for bad in bad_tokens:
            self.assertIsNone(tokens.peek_temp_image(bad, 1), repr(bad))
            self.assertIsNone(tokens.consume_temp_image(bad, 1), repr(bad))
        self.assertTrue((outside / 'secret.jpg').is_file())   # tashqaridagi fayl tegilmadi
        self.assertTrue(tokens.peek_temp_image(good, 1))

    def test_a_valid_looking_token_that_does_not_exist_is_none(self):
        self.assertIsNone(tokens.peek_temp_image('A' * 32, 1))
        self.assertIsNone(tokens.consume_temp_image('A' * 32, 1))

    def test_dots_are_not_token_characters(self):
        # token faqat [A-Za-z0-9_-]: nuqta bo'lmagani uchun ".." bilan boshqa katalogga "sakrash" mumkin emas
        self.assertIsNone(tokens.peek_temp_image('..' + 'a' * 30, 1))

    def test_corrupt_or_foreign_meta_is_none(self):
        token = tokens.store_temp_image(make_image(), 1)
        meta = self.dir / f'{token}.json'
        for content in (b'not json', b'[]', b'{}', b'{"shop_id": "1", "created_at": 1}', b'{"shop_id": true, "created_at": 1}', b'\xff\xfe',
                        json.dumps({'shop_id': 1, 'created_at': 'yesterday'}).encode(), b'{' + b' ' * 70000 + b'}'):
            meta.write_bytes(content)
            self.assertIsNone(tokens.peek_temp_image(token, 1), content[:30])
        meta.unlink()
        self.assertIsNone(tokens.peek_temp_image(token, 1))


class ConsumeTests(TempImageBase):
    def test_consume_is_one_time_and_removes_the_files(self):
        token = tokens.store_temp_image(make_image((640, 480)), 3, credit='C', real_photo=False)
        got = tokens.consume_temp_image(token, 3)
        self.assertEqual((got['credit'], got['real_photo'], got['content_type']), ('C', False, 'image/jpeg'))
        self.assertTrue(got['bytes'].startswith(b'\xff\xd8'))
        with Image.open(io.BytesIO(got['bytes'])) as result:
            self.assertEqual(result.size, (640, 480))
        self.assertIsNone(tokens.consume_temp_image(token, 3))
        self.assertIsNone(tokens.peek_temp_image(token, 3))
        self.assertEqual(sorted(os.listdir(self.dir)), [])

    def test_only_one_of_two_racing_consumers_wins(self):
        token = tokens.store_temp_image(make_image(), 3)
        real_replace = os.replace
        results = []
        fired = []

        def racing_replace(src, dst):
            if str(src).endswith('.jpg') and not fired:
                fired.append(True)
                results.append(tokens.consume_temp_image(token, 3))   # raqib aynan shu orada o'tib ketdi
            return real_replace(src, dst)

        with mock.patch.object(tokens.os, 'replace', racing_replace):
            second = tokens.consume_temp_image(token, 3)
        self.assertIsNotNone(results[0])
        self.assertIsNone(second)


class ExpiryTests(TempImageBase):
    def test_token_expires_after_two_hours(self):
        token = tokens.store_temp_image(make_image(), 1)
        now = time.time()
        with mock.patch.object(tokens.time, 'time', return_value=now + tokens.TTL_SECONDS - 60):
            self.assertIsNotNone(tokens.peek_temp_image(token, 1))
        with mock.patch.object(tokens.time, 'time', return_value=now + tokens.TTL_SECONDS + 60):
            self.assertIsNone(tokens.consume_temp_image(token, 1))
        self.assertEqual(os.listdir(self.dir), [])   # muddati o'tgan fayllar o'zi tozalandi

    def test_cleanup_removes_only_old_own_files(self):
        old = tokens.store_temp_image(make_image(), 1)
        fresh = tokens.store_temp_image(make_image(), 1)
        self.age(old, tokens.TTL_SECONDS + 100)
        (self.dir / 'notes.txt').write_text('mening faylim')
        stale_foreign = self.dir / 'readme.jpg'
        stale_foreign.write_bytes(b'x')
        os.utime(stale_foreign, (1, 1))
        leftover = self.dir / ('B' * 32 + '.deadbeef.claim')
        leftover.write_bytes(b'x')
        os.utime(leftover, (1, 1))
        removed = tokens.cleanup_expired()
        self.assertEqual(removed, 3)   # old.jpg, old.json, yarim qolgan .claim
        self.assertFalse((self.dir / f'{old}.jpg').exists())
        self.assertTrue((self.dir / f'{fresh}.jpg').exists())
        self.assertTrue((self.dir / 'notes.txt').exists())
        self.assertTrue(stale_foreign.exists())   # bizniki emas -> tegilmaydi

    def test_cleanup_is_bounded(self):
        made = [tokens.store_temp_image(make_image((10, 10)), 1) for _ in range(8)]
        for token in made:
            self.age(token, tokens.TTL_SECONDS + 100)
        self.assertEqual(tokens.cleanup_expired(limit=5), 5)
        self.assertEqual(len(os.listdir(self.dir)), 16 - 5)
        self.assertEqual(tokens.CLEANUP_DELETE_LIMIT, 50)

    def test_store_runs_the_cleanup(self):
        old = tokens.store_temp_image(make_image(), 1)
        self.age(old, tokens.TTL_SECONDS + 100)
        new = tokens.store_temp_image(make_image(), 1)
        self.assertFalse((self.dir / f'{old}.jpg').exists())
        self.assertTrue((self.dir / f'{new}.jpg').exists())

    def test_cleanup_without_directory_is_a_noop(self):
        self.assertEqual(tokens.cleanup_expired(), 0)

    def test_cleanup_failure_never_breaks_store(self):
        with mock.patch.object(tokens.os, 'scandir', side_effect=PermissionError('yo\'q')):
            self.assertTrue(tokens.store_temp_image(make_image(), 1))


class StorageFailureTests(TempImageBase):
    def test_unwritable_store_gives_a_clear_error_and_leaves_no_files(self):
        with mock.patch.object(tokens, '_atomic_write', side_effect=OSError('disk to\'la')):
            with self.assertRaises(TempImageError) as ctx:
                tokens.store_temp_image(make_image(), 1)
        self.assertEqual(ctx.exception.code, 'storage')
        self.assertEqual(os.listdir(self.dir) if self.dir.exists() else [], [])

    def test_token_regex_matches_what_secrets_generates(self):
        import secrets
        for _ in range(200):
            self.assertTrue(re.fullmatch(tokens.TOKEN_RE, secrets.token_urlsafe(24)))
