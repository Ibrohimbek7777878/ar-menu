"""Internetdan rasm topish testlari uchun umumiy yordamchilar: soxta tashqi javoblar va "tarmoqqa chiqmaslik" kafolati.

Hech bir test haqiqiy tarmoqqa chiqmasligi shart: `NoNetworkMixin` soket ochishni va `requests.get`ni taqiqlaydi
(test o'zi kerakli joyni mock qiladi — shunda unutilgan mock tarmoqqa chiqish o'rniga darrov yiqiladi)."""
import io
from unittest import mock

from PIL import Image


def jpeg_bytes(size=(800, 600), color=(200, 60, 40)):
    buf = io.BytesIO()
    Image.new('RGB', size, color).save(buf, 'JPEG')
    return buf.getvalue()


def png_bytes(size=(64, 64)):
    buf = io.BytesIO()
    Image.new('RGB', size, (10, 120, 200)).save(buf, 'PNG')
    return buf.getvalue()


def ov_item(n=1, **overrides):
    """Openverse `results[]` elementi (haqiqiy javob maydonlari)."""
    item = {
        'id': f'20c5a1b2-0000-4000-8000-{n:012d}',
        'title': f'Plov {n}',
        'url': f'https://live.staticflickr.com/65535/{n}_abc_b.jpg',
        'thumbnail': f'https://api.openverse.org/v1/images/20c5a1b2-0000-4000-8000-{n:012d}/thumb/',
        'creator': 'Boonlong1',
        'license': 'by', 'license_version': '2.0', 'license_url': 'https://creativecommons.org/licenses/by/2.0/',
        'foreign_landing_url': f'https://www.flickr.com/photos/boonlong1/{n}',
        'source': 'flickr', 'filetype': 'jpg', 'width': 1024, 'height': 768,
    }
    item.update(overrides)
    return item


def openverse_payload(*items):
    return {'result_count': len(items), 'page_count': 1, 'page_size': 20, 'page': 1, 'results': list(items)}


def cm_page(n=1, license_name='CC BY-SA 4.0', width=2000, height=1500, mime='image/jpeg', **overrides):
    """Commons `query.pages[]` elementi (formatversion=2)."""
    meta = {
        'LicenseShortName': {'value': license_name},
        'LicenseUrl': {'value': 'https://creativecommons.org/licenses/by-sa/4.0'},
        'Artist': {'value': '<a href="//commons.wikimedia.org/wiki/User:Ali" title="User:Ali">Ali&nbsp;Valiyev</a>'},
        'ObjectName': {'value': f'Plov in Tashkent {n}'},
    }
    meta.update(overrides.pop('meta', {}))
    info = {
        'url': f'https://upload.wikimedia.org/wikipedia/commons/a/ab/Plov_{n}.jpg',
        'descriptionurl': f'https://commons.wikimedia.org/wiki/File:Plov_{n}.jpg',
        'thumburl': f'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Plov_{n}.jpg/500px-Plov_{n}.jpg',
        'thumbwidth': 500, 'thumbheight': 375,
        'width': width, 'height': height, 'size': 800_000, 'mime': mime,
        'extmetadata': meta,
    }
    info.update(overrides.pop('info', {}))
    page = {'pageid': 1000 + n, 'ns': 6, 'title': f'File:Plov {n}.jpg', 'index': n, 'imageinfo': [info]}
    page.update(overrides)
    return page


def commons_payload(*pages):
    return {'batchcomplete': True, 'query': {'pages': list(pages)}}


class FakeResponse:
    """`requests.get(..., stream=True)` javobi o'rnida."""

    def __init__(self, payload=None, status_code=200, body=None):
        import json
        self.status_code = status_code
        self._body = body if body is not None else json.dumps(payload).encode('utf-8')
        self.closed = False

    def iter_content(self, chunk_size=1):
        for start in range(0, len(self._body), chunk_size):
            yield self._body[start:start + chunk_size]

    def close(self):
        self.closed = True


class NoNetworkMixin:
    """Ulangan soket yoki mock qilinmagan `requests.get` — darrov AssertionError."""

    def setUp(self):
        super().setUp()
        guards = [
            mock.patch('socket.create_connection', side_effect=AssertionError('testda tarmoqqa chiqish taqiqlangan')),
            mock.patch('socket.getaddrinfo', side_effect=AssertionError('testda DNS so\'rovi taqiqlangan')),
            mock.patch('requests.get', side_effect=AssertionError('testda requests.get mock qilinmagan')),
            mock.patch('requests.sessions.Session.request', side_effect=AssertionError('testda requests mock qilinmagan')),
        ]
        for guard in guards:
            guard.start()
            self.addCleanup(guard.stop)
