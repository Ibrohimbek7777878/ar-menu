"""SSRF-xavfsiz rasm yuklash (products/menu_import/image_fetch.py). HAMMA tarmoq amali mock: soket ochilmaydi, DNS so'ralmaydi."""
import http.client
from unittest import mock

from django.test import SimpleTestCase, override_settings

from products.image_test_utils import NoNetworkMixin, jpeg_bytes
from products.menu_import import image_fetch as fetch

PUBLIC_IP = '151.101.1.1'
OK_URL = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Plov_1.jpg'


def addrinfo(*ips):
    return [(10 if ':' in ip else 2, 1, 6, '', (ip, 443)) for ip in ips]


class FakeConnResponse:
    def __init__(self, status=200, headers=None, body=b'', chunk=64 * 1024):
        self.status = status
        self._headers = {k.lower(): v for k, v in (headers or {}).items()}
        self._body = body
        self._pos = 0
        self.bytes_served = 0
        self._chunk = chunk

    def getheader(self, name, default=None):
        return self._headers.get(name.lower(), default)

    def read(self, amt=None):
        size = min(amt or len(self._body), self._chunk)
        piece = self._body[self._pos:self._pos + size]
        self._pos += len(piece)
        self.bytes_served += len(piece)
        return piece


class FakeConnection:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.requests = []
        self.closed = False

    def request(self, method, target, headers=None):
        if self.error:
            raise self.error
        self.requests.append((method, target, headers or {}))

    def getresponse(self):
        return self.response

    def close(self):
        self.closed = True


class UrlValidationTests(SimpleTestCase):
    def assertRejected(self, url, code, status=400):
        with self.assertRaises(fetch.RemoteImageError) as ctx:
            fetch.parse_remote_url(url)
        self.assertEqual(ctx.exception.code, code, url)
        self.assertEqual(ctx.exception.status, status, url)
        self.assertTrue(ctx.exception.message)

    def test_valid_urls(self):
        self.assertEqual(fetch.parse_remote_url(OK_URL), ('upload.wikimedia.org', '/wikipedia/commons/a/ab/Plov_1.jpg'))
        self.assertEqual(fetch.parse_remote_url('https://UPLOAD.Wikimedia.org./x/y.jpg?a=1#frag')[1], '/x/y.jpg?a=1')
        self.assertEqual(fetch.parse_remote_url('https://live.staticflickr.com/65535/1_a_b.jpg')[0], 'live.staticflickr.com')
        self.assertEqual(fetch.parse_remote_url('https://farm66.staticflickr.com/1/2.jpg')[0], 'farm66.staticflickr.com')
        self.assertEqual(fetch.parse_remote_url('https://images.pexels.com/photos/1/p.jpeg')[0], 'images.pexels.com')
        self.assertEqual(fetch.parse_remote_url('https://upload.wikimedia.org:443/x.jpg')[0], 'upload.wikimedia.org')

    def test_non_https(self):
        for url in ('http://upload.wikimedia.org/x.jpg', 'ftp://upload.wikimedia.org/x.jpg', 'file:///etc/passwd',
                    'gopher://upload.wikimedia.org/', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//upload.wikimedia.org/x.jpg',
                    'upload.wikimedia.org/x.jpg'):
            with self.subTest(url=url):
                self.assertRejected(url, 'bad_scheme')

    def test_ip_literals_and_localhost(self):
        for url in ('https://127.0.0.1/x.jpg', 'https://10.0.0.5/x.jpg', 'https://169.254.169.254/latest/meta-data/',
                    'https://[::1]/x.jpg', 'https://[::ffff:127.0.0.1]/x.jpg', 'https://[fe80::1]/x.jpg', 'https://8.8.8.8/x.jpg'):
            with self.subTest(url=url):
                self.assertRejected(url, 'bad_host')
        for url in ('https://localhost/x.jpg', 'https://localhost./x.jpg', 'https://2130706433/x.jpg', 'https://0x7f.0.0.1/x.jpg',
                    'https://0177.0.0.1/x.jpg', 'https://127.1/x.jpg', 'https://intranet/x.jpg', 'https://metadata.google.internal/'):
            with self.subTest(url=url):
                self.assertRejected(url, 'host_not_allowed')

    def test_host_allowlist_tricks(self):
        for url in ('https://evil.example.com/x.jpg', 'https://upload.wikimedia.org.evil.com/x.jpg', 'https://evilwikimedia.org/x.jpg',
                    'https://wikimedia.org/x.jpg',            # apex `*.wikimedia.org` ga kirmaydi
                    'https://notstaticflickr.com/x.jpg', 'https://staticflickr.com/x.jpg', 'https://pexels.com/x.jpg',
                    'https://images.pexels.com.evil.com/x.jpg', 'https://cdn.pexels.com/x.jpg'):
            with self.subTest(url=url):
                self.assertRejected(url, 'host_not_allowed')

    def test_userinfo_ports_and_junk(self):
        for url in ('https://user:pw@upload.wikimedia.org/x.jpg', 'https://upload.wikimedia.org@evil.com/x.jpg',
                    'https://upload.wikimedia.org:8443/x.jpg', 'https://upload.wikimedia.org:80/x.jpg',
                    'https://upload.wikimedia.org:99999/x.jpg', 'https://upload.wikimedia.org:abc/x.jpg',
                    'https://upload.wikimedia.org/a b.jpg', 'https://upload.wikimedia.org/a\r\nHost: x', 'https://',
                    'https:///x.jpg', '', '   ', None, 123, ['https://upload.wikimedia.org/x.jpg'],
                    'https://upload.wikimedia.org/' + 'a' * 3000):
            with self.subTest(url=url):
                with self.assertRaises(fetch.RemoteImageError) as ctx:
                    fetch.parse_remote_url(url)
                self.assertEqual(ctx.exception.status, 400)

    def test_allowlist_is_configurable(self):
        with override_settings(MENU_IMAGE_ALLOWED_HOSTS=['cdn.example.org', '*.photos.example.org']):
            self.assertEqual(fetch.parse_remote_url('https://cdn.example.org/a.jpg')[0], 'cdn.example.org')
            self.assertEqual(fetch.parse_remote_url('https://eu.photos.example.org/a.jpg')[0], 'eu.photos.example.org')
            self.assertRejected(OK_URL, 'host_not_allowed')                 # standart ro'yxat almashtirildi
            self.assertRejected('https://photos.example.org/a.jpg', 'host_not_allowed')

    def test_default_allowlist_when_setting_missing_or_empty(self):
        with override_settings(MENU_IMAGE_ALLOWED_HOSTS=[]):
            self.assertEqual(fetch.parse_remote_url(OK_URL)[0], 'upload.wikimedia.org')

    def test_path_is_percent_encoded_safely(self):
        _, target = fetch.parse_remote_url('https://upload.wikimedia.org/wikipedia/commons/a/ab/Plöv%20(1).jpg')
        self.assertEqual(target, '/wikipedia/commons/a/ab/Pl%C3%B6v%20(1).jpg')


class IpClassificationTests(SimpleTestCase):
    def test_non_public_addresses(self):
        for ip in (
            '127.0.0.1', '127.255.255.254', '10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.255', '192.168.1.1',
            '169.254.169.254', '169.254.0.1', '0.0.0.0', '100.64.0.1', '100.127.255.255', '192.0.0.1', '192.0.2.1',
            '198.51.100.1', '203.0.113.1', '198.18.0.1', '224.0.0.1', '239.255.255.255', '240.0.0.1', '255.255.255.255',
            '::1', '::', 'fe80::1', 'fe80::1%eth0', 'fc00::1', 'fd12:3456::1', 'ff02::1', 'fec0::1',
            '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '::ffff:7f00:1',
            '64:ff9b::7f00:1', '64:ff9b::a00:1', '2002:7f00:1::', '2002:a00:1::', '2001:0:4136:e378:8000:63bf:3fff:fdd2',
            '2001:db8::1', 'not an ip', '', None, '999.1.1.1',
        ):
            with self.subTest(ip=ip):
                self.assertFalse(fetch.is_public_ip(ip))

    def test_public_addresses(self):
        for ip in ('93.184.216.34', '151.101.1.1', '8.8.8.8', '1.1.1.1', '2606:2800:220:1:248:1893:25c8:1946', '::ffff:8.8.8.8'):
            with self.subTest(ip=ip):
                self.assertTrue(fetch.is_public_ip(ip))


class ResolveTests(NoNetworkMixin, SimpleTestCase):
    def resolve(self, *ips):
        with mock.patch('socket.getaddrinfo', return_value=addrinfo(*ips)):
            return fetch.resolve_public_ips('upload.wikimedia.org')

    def test_public(self):
        self.assertEqual(self.resolve(PUBLIC_IP, PUBLIC_IP, '2606:2800:220:1:248:1893:25c8:1946'),
                         [PUBLIC_IP, '2606:2800:220:1:248:1893:25c8:1946'])

    def test_any_private_address_blocks_the_host(self):
        for ips in (('127.0.0.1',), ('10.1.2.3',), ('192.168.0.9',), ('169.254.169.254',), ('::1',), ('fe80::1',),
                    ('::ffff:127.0.0.1',), (PUBLIC_IP, '10.0.0.1'), ('10.0.0.1', PUBLIC_IP), (PUBLIC_IP, '::1'), ('100.64.1.1',)):
            with self.subTest(ips=ips), self.assertRaises(fetch.RemoteImageError) as ctx:
                self.resolve(*ips)
            self.assertEqual((ctx.exception.code, ctx.exception.status), ('blocked_address', 400))
            for secret in ips:
                self.assertNotIn(secret, ctx.exception.message)         # ichki manzil javobga chiqmaydi

    def test_dns_failures(self):
        import socket
        for failure in (socket.gaierror(-2, 'Name or service not known'), OSError('boom'), UnicodeError('idna')):
            with mock.patch('socket.getaddrinfo', side_effect=failure), self.assertRaises(fetch.RemoteImageError) as ctx:
                fetch.resolve_public_ips('upload.wikimedia.org')
            self.assertEqual((ctx.exception.code, ctx.exception.status), ('unreachable', 503))
        with mock.patch('socket.getaddrinfo', return_value=[]), self.assertRaises(fetch.RemoteImageError):
            fetch.resolve_public_ips('upload.wikimedia.org')


class PinnedConnectionTests(NoNetworkMixin, SimpleTestCase):
    """DNS rebinding: ulanish nom bo'yicha emas, aynan tekshirilgan IP bo'yicha; TLS esa asl host nomi bilan."""

    def make(self, ips=(PUBLIC_IP,)):
        context = mock.Mock()
        tls_sock = mock.Mock()
        tls_sock.getpeername.return_value = (PUBLIC_IP, 443)
        context.wrap_socket.return_value = tls_sock
        return fetch._PinnedHTTPSConnection('upload.wikimedia.org', ips, context=context), context, tls_sock

    def test_connects_to_pinned_ip_not_hostname(self):
        conn, context, tls_sock = self.make()
        raw = mock.Mock()
        with mock.patch('socket.create_connection', return_value=raw) as create:
            conn.connect()
        create.assert_called_once_with((PUBLIC_IP, 443), timeout=fetch.SOCKET_TIMEOUT)
        context.wrap_socket.assert_called_once_with(raw, server_hostname='upload.wikimedia.org')
        self.assertIs(conn.sock, tls_sock)

    def test_peer_ip_is_rechecked(self):
        conn, context, tls_sock = self.make()
        tls_sock.getpeername.return_value = ('127.0.0.1', 443)
        with mock.patch('socket.create_connection', return_value=mock.Mock()), self.assertRaises(fetch.RemoteImageError) as ctx:
            conn.connect()
        self.assertEqual(ctx.exception.code, 'blocked_address')
        tls_sock.close.assert_called_once()
        self.assertIsNone(conn.sock)

    def test_falls_through_to_next_pinned_ip(self):
        conn, context, tls_sock = self.make(ips=('151.101.1.1', '151.101.65.1'))
        calls = []

        def create(address, timeout):
            calls.append(address[0])
            if address[0] == '151.101.1.1':
                raise OSError('refused')
            return mock.Mock()

        with mock.patch('socket.create_connection', side_effect=create):
            conn.connect()
        self.assertEqual(calls, ['151.101.1.1', '151.101.65.1'])

    def test_all_ips_fail(self):
        conn, _, _ = self.make(ips=('151.101.1.1',))
        with mock.patch('socket.create_connection', side_effect=OSError('refused')), self.assertRaises(OSError):
            conn.connect()

    def test_tls_context_verifies_certificates(self):
        import ssl
        context = fetch._tls_context()
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertGreaterEqual(context.minimum_version, ssl.TLSVersion.TLSv1_2)


class FetchFlowTests(NoNetworkMixin, SimpleTestCase):
    def setUp(self):
        super().setUp()
        self.hosts = {}            # host -> IP ro'yxati (DNS)
        self.connections = []      # yaratilgan ulanishlar (host, ips)
        self.script = []           # har bir ulanish uchun javob

        def getaddrinfo(host, port, **kwargs):
            return addrinfo(*self.hosts.get(host, [PUBLIC_IP]))

        def new_connection(host, ips):
            self.connections.append((host, list(ips)))
            conn = self.script.pop(0)
            return conn

        for patcher in (mock.patch('socket.getaddrinfo', side_effect=getaddrinfo),
                        mock.patch.object(fetch, '_new_connection', side_effect=new_connection)):
            patcher.start()
            self.addCleanup(patcher.stop)

    def image(self, body=None, content_type='image/jpeg', status=200, headers=None, **kw):
        body = jpeg_bytes() if body is None else body
        merged = {'Content-Type': content_type, 'Content-Length': str(len(body))}
        merged.update(headers or {})
        return FakeConnection(FakeConnResponse(status, merged, body, **kw))

    def redirect(self, location, status=302):
        return FakeConnection(FakeConnResponse(status, {'Location': location}))

    def assertFails(self, code, status, url=OK_URL):
        with self.assertRaises(fetch.RemoteImageError) as ctx:
            fetch.fetch_remote_image(url)
        self.assertEqual((ctx.exception.code, ctx.exception.status), (code, status))
        return ctx.exception

    def test_success(self):
        data = jpeg_bytes()
        conn = self.image(data)
        self.script = [conn]
        self.assertEqual(fetch.fetch_remote_image(OK_URL), data)
        self.assertEqual(self.connections, [('upload.wikimedia.org', [PUBLIC_IP])])
        method, target, headers = conn.requests[0]
        self.assertEqual((method, target), ('GET', '/wikipedia/commons/a/ab/Plov_1.jpg'))
        self.assertEqual(headers['User-Agent'], 'GulistonMenu/1.0 (contact: admin)')
        self.assertEqual(headers['Accept-Encoding'], 'identity')
        self.assertNotIn('Cookie', headers)
        self.assertNotIn('Authorization', headers)
        self.assertTrue(conn.closed)

    def test_png_and_webp_are_accepted(self):
        for content_type in ('image/png', 'image/webp', 'IMAGE/JPEG; charset=binary'):
            self.script = [self.image(content_type=content_type)]
            self.assertTrue(fetch.fetch_remote_image(OK_URL))

    def test_wrong_content_type(self):
        for content_type in ('text/html', 'image/svg+xml', 'image/gif', 'application/octet-stream', 'application/json', ''):
            with self.subTest(content_type=content_type):
                self.script = [self.image(body=b'<html>', content_type=content_type)]
                self.assertFails('bad_content_type', 422)

    def test_encoded_body_is_refused(self):
        self.script = [self.image(headers={'Content-Encoding': 'gzip'})]
        self.assertFails('bad_content_encoding', 422)

    def test_declared_size_too_large_is_refused_before_reading(self):
        conn = self.image(body=b'x', headers={'Content-Length': str(fetch.MAX_BYTES + 1)})
        self.script = [conn]
        self.assertFails('too_large', 422)
        self.assertEqual(conn.response.bytes_served, 0)

    def test_undeclared_stream_is_cut_off_at_limit(self):
        body = b'\xff' * (fetch.MAX_BYTES * 3)
        conn = FakeConnection(FakeConnResponse(200, {'Content-Type': 'image/jpeg'}, body))      # Content-Length yo'q (chunked)
        self.script = [conn]
        self.assertFails('too_large', 422)
        self.assertLess(conn.response.bytes_served, fetch.MAX_BYTES + 128 * 1024)           # hammasi o'qilmadi

    def test_lying_content_length_cannot_exceed_limit(self):
        body = b'\xff' * (fetch.MAX_BYTES + 5000)
        self.script = [FakeConnection(FakeConnResponse(200, {'Content-Type': 'image/png', 'Content-Length': '100'}, body))]
        self.assertFails('too_large', 422)

    def test_exactly_at_limit_is_ok(self):
        body = b'\xff' * fetch.MAX_BYTES
        self.script = [self.image(body=body)]
        self.assertEqual(len(fetch.fetch_remote_image(OK_URL)), fetch.MAX_BYTES)

    def test_empty_body(self):
        self.script = [FakeConnection(FakeConnResponse(200, {'Content-Type': 'image/jpeg'}, b''))]
        self.assertFails('empty', 422)

    def test_http_statuses(self):
        for status, code, expected in ((404, 'not_found', 422), (403, 'not_found', 422), (410, 'not_found', 422),
                                       (429, 'source_busy', 503), (500, 'source_busy', 503), (503, 'source_busy', 503),
                                       (204, 'not_found', 422)):
            with self.subTest(status=status):
                self.script = [FakeConnection(FakeConnResponse(status, {}))]
                self.assertFails(code, expected)

    def test_connection_errors(self):
        import ssl
        for error in (OSError('refused'), TimeoutError('slow'), ssl.SSLCertVerificationError('bad cert'),
                      http.client.RemoteDisconnected('closed'), http.client.BadStatusLine('x')):
            with self.subTest(error=type(error).__name__):
                self.script = [FakeConnection(error=error)]
                self.assertFails('unreachable', 503)

    def test_slow_body_hits_deadline(self):
        self.script = [self.image()]
        with mock.patch.object(fetch.time, 'monotonic', side_effect=[0, 1000, 1000, 1000]):
            self.assertFails('timeout', 503)

    def test_redirect_is_followed_with_full_checks(self):
        data = jpeg_bytes()
        self.script = [self.redirect('https://live.staticflickr.com/65535/1_a_b.jpg'), self.image(data)]
        self.hosts = {'live.staticflickr.com': ['151.101.65.1']}
        self.assertEqual(fetch.fetch_remote_image(OK_URL), data)
        self.assertEqual([c[0] for c in self.connections], ['upload.wikimedia.org', 'live.staticflickr.com'])
        self.assertEqual(self.connections[1][1], ['151.101.65.1'])           # har qadamda o'z IP'si tekshirilib mahkamlandi

    def test_relative_redirect(self):
        self.script = [self.redirect('/wikipedia/commons/b/bc/Other.jpg', 301), self.image()]
        fetch.fetch_remote_image(OK_URL)
        self.assertEqual(self.script, [])

    def test_all_redirect_statuses(self):
        for status in (301, 302, 303, 307, 308):
            self.script = [self.redirect('https://upload.wikimedia.org/x.jpg', status), self.image()]
            self.assertTrue(fetch.fetch_remote_image(OK_URL))

    def test_redirect_to_internal_ip_literal_is_blocked(self):
        for target in ('https://127.0.0.1/admin', 'https://169.254.169.254/latest/meta-data/', 'https://[::1]/', 'https://10.0.0.5/x.jpg'):
            with self.subTest(target=target):
                self.connections.clear()
                self.script = [self.redirect(target), self.image()]
                self.assertFails('bad_host', 400)
                self.assertEqual(len(self.connections), 1)                    # ikkinchi ulanish umuman ochilmadi

    def test_redirect_to_http_or_other_scheme_is_blocked(self):
        for target in ('http://upload.wikimedia.org/x.jpg', 'ftp://upload.wikimedia.org/x', 'file:///etc/passwd', 'gopher://x/'):
            with self.subTest(target=target):
                self.connections.clear()
                self.script = [self.redirect(target), self.image()]
                self.assertFails('bad_scheme', 400)
                self.assertEqual(len(self.connections), 1)

    def test_redirect_to_unlisted_host_is_blocked(self):
        self.script = [self.redirect('https://evil.example.com/x.jpg'), self.image()]
        self.assertFails('host_not_allowed', 400)
        self.assertEqual(len(self.connections), 1)

    def test_redirect_to_allowed_name_resolving_to_private_ip_is_blocked(self):
        """Allowlistdagi nom, lekin DNS ichki manzilni qaytaradi (yoki ichki manzilga yo'naltirilgan)."""
        self.hosts = {'live.staticflickr.com': ['10.0.0.8']}
        self.script = [self.redirect('https://live.staticflickr.com/a.jpg'), self.image()]
        exc = self.assertFails('blocked_address', 400)
        self.assertNotIn('10.0.0.8', exc.message)
        self.assertEqual(len(self.connections), 1)

    def test_first_hop_resolving_to_private_ip_never_connects(self):
        for ips in (['127.0.0.1'], ['192.168.1.5'], ['169.254.169.254'], ['::1'], [PUBLIC_IP, '10.0.0.1'], ['::ffff:127.0.0.1']):
            with self.subTest(ips=ips):
                self.hosts = {'upload.wikimedia.org': ips}
                self.script = [self.image()]
                self.assertFails('blocked_address', 400)
                self.assertEqual(self.connections, [])

    def test_redirect_limit(self):
        self.script = [self.redirect(f'https://upload.wikimedia.org/{n}.jpg') for n in range(10)]
        self.assertFails('redirect_limit', 422)
        self.assertEqual(len(self.connections), fetch.MAX_REDIRECTS + 1)

    def test_three_redirects_are_allowed(self):
        self.script = [self.redirect('https://upload.wikimedia.org/1.jpg'), self.redirect('https://upload.wikimedia.org/2.jpg'),
                       self.redirect('https://upload.wikimedia.org/3.jpg'), self.image()]
        self.assertTrue(fetch.fetch_remote_image(OK_URL))

    def test_redirect_without_location(self):
        self.script = [FakeConnection(FakeConnResponse(302, {}))]
        self.assertFails('bad_redirect', 422)

    def test_every_connection_is_closed(self):
        conns = [self.redirect('https://upload.wikimedia.org/1.jpg'), self.image(body=b'<html>', content_type='text/html')]
        self.script = list(conns)
        self.assertFails('bad_content_type', 422)
        self.assertTrue(all(c.closed for c in conns))

    def test_invalid_url_never_resolves_or_connects(self):
        with mock.patch.object(fetch.socket, 'getaddrinfo') as dns:
            self.assertFails('bad_scheme', 400, url='http://upload.wikimedia.org/x.jpg')
            self.assertFails('bad_host', 400, url='https://127.0.0.1/x.jpg')
            self.assertFails('host_not_allowed', 400, url='https://evil.example.com/x.jpg')
        dns.assert_not_called()
        self.assertEqual(self.connections, [])
