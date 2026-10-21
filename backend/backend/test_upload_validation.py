"""
Fayl yuklash tekshiruvi testlari (TZ: R1-6).
"""
import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, SimpleTestCase, TestCase, override_settings
from PIL import Image

from backend.upload_validation import validate_uploaded_file


def make_image(fmt='PNG', size=(8, 8), name=None):
    buf = io.BytesIO()
    Image.new('RGB', size, (200, 30, 30)).save(buf, fmt)
    ext = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp'}[fmt]
    return SimpleUploadedFile(name or f'pic.{ext}', buf.getvalue())


GLB = b'glTF' + b'\x02\x00\x00\x00' + b'\x00' * 32


class ValidateUploadedFileTests(SimpleTestCase):

    def test_real_images_are_accepted(self):
        for fmt in ('PNG', 'JPEG', 'WEBP'):
            self.assertEqual(validate_uploaded_file(make_image(fmt)), '', fmt)

    def test_dangerous_extensions_are_rejected(self):
        for name in ('x.svg', 'x.html', 'x.js', 'x.php', 'x.exe', 'x.sh', 'x.py', 'noext'):
            err = validate_uploaded_file(SimpleUploadedFile(name, b'<script>alert(1)</script>'))
            self.assertIn('ruxsat etilmaydi', err, name)

    def test_html_disguised_as_image_is_rejected(self):
        for name in ('a.jpg', 'a.png', 'a.webp'):
            err = validate_uploaded_file(SimpleUploadedFile(name, b'<html><script>alert(1)</script></html>'))
            self.assertIn('rasm emas', err, name)

    def test_extension_must_match_signature(self):
        png_as_jpg = make_image('PNG', name='fake.jpg')
        self.assertIn('rasm emas', validate_uploaded_file(png_as_jpg))

    def test_truncated_image_with_valid_header_is_rejected(self):
        good = make_image('PNG', size=(64, 64)).read()
        broken = SimpleUploadedFile('broken.png', good[:40])
        self.assertIn('buzilgan', validate_uploaded_file(broken))

    @override_settings(UPLOAD_MAX_IMAGE_MB=1)
    def test_oversized_image_is_rejected_before_parsing(self):
        data = make_image('PNG').read() + b'\x00' * (1024 * 1024 + 1)
        self.assertIn('1 MB', validate_uploaded_file(SimpleUploadedFile('big.png', data)))

    def test_decompression_bomb_dimensions_are_rejected(self):
        img = make_image('PNG', size=(7000, 7000))      # ~49M piksel, lekin PNG sifatida juda kichik
        self.assertIn("o'lchami", validate_uploaded_file(img))

    def test_glb_signature_and_size(self):
        self.assertEqual(validate_uploaded_file(SimpleUploadedFile('m.glb', GLB)), '')
        self.assertIn('GLB', validate_uploaded_file(SimpleUploadedFile('m.glb', b'<html>nope</html>')))
        with override_settings(UPLOAD_MAX_MODEL_MB=1):
            big = SimpleUploadedFile('m.glb', GLB + b'\x00' * (1024 * 1024))
            self.assertIn('1 MB', validate_uploaded_file(big))

    def test_usdz_is_a_zip(self):
        self.assertEqual(validate_uploaded_file(SimpleUploadedFile('m.usdz', b'PK\x03\x04' + b'\x00' * 20)), '')
        self.assertIn('USDZ', validate_uploaded_file(SimpleUploadedFile('m.usdz', b'not a zip')))

    def test_video_signature_and_size(self):
        mp4 = SimpleUploadedFile('v.mp4', b'\x00\x00\x00\x18ftypmp42' + b'\x00' * 20)
        self.assertEqual(validate_uploaded_file(mp4), '')
        self.assertIn('video emas', validate_uploaded_file(SimpleUploadedFile('v.mp4', b'<html>')))
        with override_settings(UPLOAD_MAX_VIDEO_MB=1):
            big = SimpleUploadedFile('v.mp4', b'\x00\x00\x00\x18ftypmp42' + b'\x00' * (1024 * 1024))
            self.assertIn('1 MB', validate_uploaded_file(big))

    def test_csv_must_be_text(self):
        self.assertEqual(validate_uploaded_file(SimpleUploadedFile('p.csv', 'nom,narx\nPlov,45000\n'.encode())), '')
        self.assertIn('CSV', validate_uploaded_file(SimpleUploadedFile('p.csv', b'MZ\x90\x00\x00\x03\x00')))

    def test_the_file_pointer_is_rewound_for_the_view(self):
        upload = make_image('PNG')
        validate_uploaded_file(upload)
        self.assertEqual(upload.tell(), 0)


class UploadMiddlewareIntegrationTests(TestCase):
    """Haqiqiy endpoint orqali: yomon fayl view'ga yetmasdan 400 qaytadi."""
    URL = '/3d-print/order/'

    def post(self, upload, **headers):
        return Client().post(self.URL, {'customer_name': 'Ali', 'customer_phone': '+998901112233', 'file': upload},
                             **headers)

    def test_malicious_file_is_rejected_with_json_error(self):
        evil = SimpleUploadedFile('evil.svg', b'<svg onload=alert(1)>')
        resp = self.post(evil, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('ruxsat etilmaydi', resp.json()['error'])

    def test_malicious_file_in_a_form_post_redirects_back(self):
        resp = self.post(SimpleUploadedFile('evil.html', b'<script>1</script>'), HTTP_REFERER='/somewhere/')
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp['Location'], '/somewhere/')

    def test_valid_request_reaches_the_view(self):
        resp = self.post(make_image('PNG'))
        self.assertNotEqual(resp.status_code, 400, resp.content[:300])

    def test_requests_without_files_are_untouched(self):
        resp = Client().post(self.URL, {'customer_name': 'Ali', 'customer_phone': '+998901112233'})
        self.assertNotEqual(resp.status_code, 400, resp.content[:300])
