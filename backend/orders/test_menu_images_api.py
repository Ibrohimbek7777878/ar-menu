"""Menyu uchun internetdan rasm topish API'lari: GET image-search/, POST image-search/pick/, GET image-search/preview/<token>/.

HAMMA tashqi manba mock; tokenlar haqiqiy `image_tokens` ombori orqali (vaqtinchalik MEDIA_ROOT)."""
import io
import json
import shutil
import tempfile
from unittest import mock

from django.core.cache import cache
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from accounts.models import AdminUser
from accounts.staff_admin import create_staff
from products.image_test_utils import NoNetworkMixin, cm_page, jpeg_bytes, ov_item
from products.menu_import import image_fetch, image_tokens
from products.menu_import import image_search as ims
from shops.models import Shop

SEARCH = '/api/restaurant/admin/v1/menu/image-search/'
PICK = SEARCH + 'pick/'
VIEWS = 'orders.interfaces.api.menu_images_views'


@override_settings(ROOT_URLCONF='backend.urls_restaurant')
class MenuImagesAPITests(NoNetworkMixin, TestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)
        media = tempfile.mkdtemp(prefix='menu-img-')
        self.addCleanup(shutil.rmtree, media, True)
        override = override_settings(MEDIA_ROOT=media)
        override.enable()
        self.addCleanup(override.disable)

        call_command('create_restaurant', name='Test Oshxona', slug='test-osh', owner='osh-ega', password='Osh-parol-123!',
                     tables=1, stdout=io.StringIO())
        call_command('create_restaurant', name='Begona Restoran', slug='begona-osh', owner='begona-ega', password='Begona-12345!',
                     tables=1, stdout=io.StringIO())
        self.shop = Shop.objects.get(slug='test-osh')
        self.owner = AdminUser.objects.get(username='osh-ega')
        self.foreign_owner = AdminUser.objects.get(username='begona-ega')
        self.waiter = create_staff(self.shop, 'test-waiter', 'waiter', password='Xodim-Parol-2026!')[0]
        self.manager = create_staff(self.shop, 'test-mgr', 'shop_manager', password='Xodim-Parol-2026!')[0]

        self.ov_items = [ims._parse_openverse_item(ov_item(1, creator='Boonlong1', license='by'))]
        self.cm_items = [ims._parse_commons_page(cm_page(1, license_name='CC0', meta={'Artist': {'value': 'Ali'}}))]
        for name, items in (('_search_openverse', self.ov_items), ('_search_wikimedia', self.cm_items)):
            patcher = mock.patch.object(ims, name, return_value=items)
            patcher.start()
            self.addCleanup(patcher.stop)

    def client_for(self, user=None):
        client = Client()
        if user:
            client.force_login(user)
        return client

    def search(self, user=None, q='Palov'):
        return self.client_for(user or self.owner).get(SEARCH, {'q': q})

    def pick(self, payload, user=None):
        return self.client_for(user or self.owner).post(PICK, data=json.dumps(payload), content_type='application/json')

    def first_result(self):
        return self.search().json()['results'][0]

    def pick_first(self, user=None, fetch_bytes=None):
        result = self.first_result()
        payload = {k: result[k] for k in ('id', 'full', 'title', 'creator', 'license', 'license_url', 'source_url')}
        with mock.patch(f'{VIEWS}.fetch_remote_image', return_value=fetch_bytes or jpeg_bytes()) as fetch:
            response = self.pick(payload, user)
        return response, fetch

    # ── GET image-search/ ──
    def test_permissions(self):
        self.assertIn(self.client_for().get(SEARCH, {'q': 'palov'}).status_code, (401, 403))
        self.assertEqual(self.search(self.waiter).status_code, 403)
        self.assertEqual(self.search(self.manager).status_code, 200)
        self.assertEqual(self.search(self.owner).status_code, 200)
        self.assertIn(self.client_for().post(PICK, data='{}', content_type='application/json').status_code, (401, 403))
        self.assertEqual(self.pick({'id': 'x'}, self.waiter).status_code, 403)

    def test_search_response_shape(self):
        response = self.search(q="Lag'mon")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['query_used'], 'lagman noodles')
        self.assertEqual(len(body['results']), 2)
        row = body['results'][0]
        self.assertEqual(set(row), {'id', 'thumb', 'full', 'title', 'creator', 'license', 'license_url', 'source', 'source_url'})
        self.assertIn(row['license'], ('cc0', 'pdm', 'by', 'by-sa'))
        self.assertEqual({r['source'] for r in body['results']}, {'openverse', 'wikimedia'})

    def test_search_validation_messages(self):
        for q in (None, '', ' ', 'a'):
            response = self.client_for(self.owner).get(SEARCH, {'q': q} if q is not None else {})
            self.assertEqual(response.status_code, 400, q)
            self.assertEqual(response.json()['code'], 'bad_query')
            self.assertIn('error', response.json())
        long = self.search(q='x' * 150)
        self.assertEqual(long.status_code, 400)

    def test_both_sources_down_is_503_with_clear_message(self):
        with mock.patch.object(ims, '_search_openverse', side_effect=ims._SourceError('x')), \
                mock.patch.object(ims, '_search_wikimedia', side_effect=ims._SourceError('y')):
            response = self.search(q='Somsa')
        self.assertEqual(response.status_code, 503)
        body = response.json()
        self.assertEqual(body['code'], 'search_unavailable')
        self.assertIn('rasm', body['error'])
        self.assertEqual(body['error'], body['detail'])

    def test_rate_limit_is_429_with_retry_after(self):
        with mock.patch.object(ims, 'SEARCH_RATE_LIMIT', 2):
            self.assertEqual(self.search(q='Somsa').status_code, 200)
            self.assertEqual(self.search(q='Manti').status_code, 200)
            response = self.search(q='Lagmon')
            self.assertEqual(response.status_code, 429)
            self.assertEqual(self.search(q='Manti').status_code, 200)                   # kesh hisoblanmaydi
            self.assertEqual(self.search(self.foreign_owner, q='Lagmon').status_code, 200)   # boshqa restoran
        self.assertEqual(response.json()['code'], 'rate_limited')
        self.assertTrue(int(response['Retry-After']) >= 1)

    # ── POST image-search/pick/ ──
    def test_pick_downloads_and_returns_token(self):
        response, fetch = self.pick_first()
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(set(body), {'image_token', 'preview_url', 'credit'})
        self.assertEqual(body['credit'], 'Boonlong1 · CC BY')
        fetch.assert_called_once_with('https://live.staticflickr.com/65535/1_abc_b.jpg')
        info = image_tokens.peek_temp_image(body['image_token'], self.shop.id)
        self.assertEqual((info['credit'], info['real_photo']), ('Boonlong1 · CC BY', False))
        self.assertEqual(info['source_url'], 'https://www.flickr.com/photos/boonlong1/1')
        self.assertTrue(body['preview_url'].endswith(f"/image-search/preview/{body['image_token']}/"))

    def test_pick_commons_result_credit_formats(self):
        results = self.search().json()['results']
        commons = next(r for r in results if r['source'] == 'wikimedia')
        with mock.patch(f'{VIEWS}.fetch_remote_image', return_value=jpeg_bytes()):
            body = self.pick({'id': commons['id'], 'full': commons['full']}).json()
        self.assertEqual(body['credit'], 'Ali · CC0')

    def test_pick_trusts_server_record_not_client_claims(self):
        result = self.first_result()
        forged = {'id': result['id'], 'full': result['full'], 'license': 'cc0', 'creator': 'Hech kim', 'license_url': 'https://evil/x',
                  'source_url': 'https://evil.example.com/', 'title': 'x', 'ortiqcha': 'maydon'}
        with mock.patch(f'{VIEWS}.fetch_remote_image', return_value=jpeg_bytes()):
            body = self.pick(forged).json()
        self.assertEqual(body['credit'], 'Boonlong1 · CC BY')                        # CC0 deb aldab bo'lmaydi
        info = image_tokens.peek_temp_image(body['image_token'], self.shop.id)
        self.assertEqual(info['source_url'], 'https://www.flickr.com/photos/boonlong1/1')

    def test_pick_rejects_other_url_than_the_found_one(self):
        result = self.first_result()
        with mock.patch(f'{VIEWS}.fetch_remote_image') as fetch:
            response = self.pick({'id': result['id'], 'full': 'https://127.0.0.1/secret.jpg'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['field'], 'full')
        fetch.assert_not_called()

    def test_pick_unknown_or_expired_result(self):
        for payload in ({'id': 'openverse:nope'}, {'id': 'wikimedia:999999'}):
            response = self.pick(payload)
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json()['code'], 'result_not_found')
        self.assertEqual(self.pick({}).status_code, 400)
        self.assertEqual(self.pick({'id': ''}).status_code, 400)
        self.assertEqual(self.pick({'id': ['x']}).status_code, 400)
        self.assertEqual(self.client_for(self.owner).post(PICK, data='[1]', content_type='application/json').status_code, 400)

    def test_pick_remote_errors_map_to_clear_statuses(self):
        result = self.first_result()
        payload = {'id': result['id'], 'full': result['full']}
        cases = (
            (image_fetch.RemoteImageError('Rasm juda katta (6 MB dan oshmasligi kerak).', 'too_large', 422), 422),
            (image_fetch.RemoteImageError('Rasm manbasi hozir javob bermayapti.', 'source_busy', 503), 503),
            (image_fetch.RemoteImageError('Bu manzildan rasm olish taqiqlangan.', 'blocked_address', 400), 400),
        )
        for error, status in cases:
            with self.subTest(code=error.code), mock.patch(f'{VIEWS}.fetch_remote_image', side_effect=error):
                response = self.pick(payload)
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.json()['code'], error.code)
                self.assertEqual(response.json()['error'], error.message)

    def test_pick_ssrf_is_blocked_even_if_server_record_is_poisoned(self):
        """Keshdagi yozuv buzilgan taqdirda ham haqiqiy `fetch_remote_image` ichki manzilga ulanmaydi."""
        result = self.first_result()
        for evil in ('https://127.0.0.1/x.jpg', 'http://upload.wikimedia.org/x.jpg', 'https://evil.example.com/x.jpg'):
            record = dict(ims.get_pick_record(result['id']), full=evil)
            cache.set(ims._pick_key(result['id']), record, 600)
            response = self.pick({'id': result['id']})
            self.assertEqual(response.status_code, 400, evil)
        record = dict(ims.get_pick_record(result['id']), full='https://upload.wikimedia.org/x.jpg')
        cache.set(ims._pick_key(result['id']), record, 600)
        with mock.patch('socket.getaddrinfo', return_value=[(2, 1, 6, '', ('10.0.0.7', 443))]):
            response = self.pick({'id': result['id']})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'blocked_address')
        self.assertNotIn('10.0.0.7', response.content.decode())

    def test_pick_non_image_bytes_is_422(self):
        response, _ = self.pick_first(fetch_bytes=b'<html>not an image</html>')
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()['code'], 'not_image')
        self.assertIn('error', response.json())

    def test_pick_rate_limit(self):
        result = self.first_result()
        with mock.patch.object(ims, 'PICK_RATE_LIMIT', 1), mock.patch(f'{VIEWS}.PICK_RATE_LIMIT', 1), \
                mock.patch(f'{VIEWS}.fetch_remote_image', return_value=jpeg_bytes()):
            self.assertEqual(self.pick({'id': result['id']}).status_code, 200)
            self.assertEqual(self.pick({'id': result['id']}).status_code, 429)

    # ── GET image-search/preview/<token>/ ──
    def test_preview_serves_image_only_to_own_shop(self):
        body = self.pick_first()[0].json()
        url = body['preview_url']
        response = self.client_for(self.owner).get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/jpeg')
        self.assertIn('private', response['Cache-Control'])
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response.content[:2], b'\xff\xd8')
        self.assertEqual(self.client_for(self.manager).get(url).status_code, 200)         # shu restoranning boshqaruvchisi
        # begona restoran admini: 404 (tokenning mavjudligi ham bilinmaydi)
        foreign = self.client_for(self.foreign_owner).get(url)
        self.assertEqual(foreign.status_code, 404)
        self.assertEqual(foreign.json()['code'], 'token_not_found')
        self.assertIn(self.client_for().get(url).status_code, (401, 403))
        self.assertEqual(self.client_for(self.waiter).get(url).status_code, 403)

    def test_preview_unknown_token_and_traversal(self):
        client = self.client_for(self.owner)
        self.assertEqual(client.get(SEARCH + 'preview/' + 'A' * 32 + '/').status_code, 404)
        self.assertEqual(client.get(SEARCH + 'preview/short/').status_code, 404)
        self.assertEqual(client.get(SEARCH + 'preview/..%2f..%2fetc%2fpasswd/').status_code, 404)
        self.assertEqual(client.get(SEARCH + 'preview/' + 'A' * 5000 + '/').status_code, 404)

    def test_preview_works_for_browser_image_requests(self):
        url = self.pick_first()[0].json()['preview_url']
        response = self.client_for(self.owner).get(url, HTTP_ACCEPT='image/avif,image/webp,image/apng,image/*,*/*;q=0.8')
        self.assertEqual(response.status_code, 200)
        response = self.client_for(self.owner).get(url, HTTP_ACCEPT='image/webp')
        self.assertEqual(response.status_code, 200)

    def test_preview_after_token_consumed_is_404(self):
        body = self.pick_first()[0].json()
        image_tokens.consume_temp_image(body['image_token'], self.shop.id)
        self.assertEqual(self.client_for(self.owner).get(body['preview_url']).status_code, 404)
