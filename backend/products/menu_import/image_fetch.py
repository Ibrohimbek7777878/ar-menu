"""Internetdan topilgan rasmni serverga SSRF-xavfsiz yuklab olish (TZ_OMMAVIY_MENYU_KIRITISH, 6-band).

Qidiruv natijasidagi `full` manzilni brauzer emas, SERVER yuklaydi. Shuning uchun manzil ishonchsiz kirish hisoblanadi:
  * faqat `https`, faqat 443-port, login/parolli manzil va IP-manzil ("https://127.0.0.1/…") rad etiladi;
  * host `settings.MENU_IMAGE_ALLOWED_HOSTS` ro'yxatida bo'lishi shart (standart: Wikimedia, Flickr, Pexels);
  * host DNS orqali IP'larga hal qilinadi va BARCHASI ommaviy (global) bo'lishi shart: private, loopback, link-local, multicast,
    reserved, CGNAT, hujjat diapazonlari, IPv4-mapped IPv6 va NAT64/6to4/Teredo (ichiga IPv4 joylanadi) rad etiladi;
  * ulanish aynan tekshirilgan IP'ga qilinadi (DNS qayta so'ralmaydi): "DNS rebinding" hujumi ishlamaydi. TLS sertifikati va SNI esa
    asl host nomi bo'yicha tekshiriladi. Ulanishdan keyin peer IP yana bir bor tekshiriladi;
  * redirect qo'lda kuzatiladi (<= 3), HAR BIR qadamda yuqoridagi barcha tekshiruvlar qaytadan bajariladi;
  * javob oqim bilan o'qiladi: <= 6 MB (Content-Length ham, haqiqiy o'qilgan hajm ham), Content-Type faqat jpeg/png/webp,
    har bir tarmoq amali 10 s, umumiy muddat 20 s; HTTP proksi, cookie va avtorizatsiya sarlavhalari ishlatilmaydi.

Funksiya faqat xom baytlarni qaytaradi. Rasm haqiqiyligini tekshirish, kichraytirish, EXIF olib tashlash — `image_tokens.store_temp_image`.
`requests` ataylab ishlatilmaydi: u DNS'ni o'zi hal qiladi va IP'ni mahkamlashga imkon bermaydi.
"""
import http.client
import ipaddress
import socket
import ssl
import time
from urllib.parse import quote, urljoin, urlsplit

from django.conf import settings

USER_AGENT = 'GulistonMenu/1.0 (contact: admin)'
MAX_BYTES = 6 * 1024 * 1024
MAX_REDIRECTS = 3
SOCKET_TIMEOUT = 10          # har bir tarmoq amali (ulanish, o'qish) uchun
TOTAL_DEADLINE = 20          # bitta rasmni yuklashning umumiy muddati
MAX_URL_LENGTH = 2000
ALLOWED_CONTENT_TYPES = ('image/jpeg', 'image/png', 'image/webp')
DEFAULT_ALLOWED_HOSTS = (
    'upload.wikimedia.org',
    'commons.wikimedia.org',
    '*.wikimedia.org',
    'live.staticflickr.com',
    '*.staticflickr.com',
    'images.pexels.com',
)

# IPv6 ichiga IPv4 joylaydigan diapazonlar: ichki IPv4 (127.0.0.1, 10.x...) shu orqali yashirinishi mumkin
_EMBEDDED_V4_NETWORKS = tuple(ipaddress.ip_network(n) for n in ('64:ff9b::/96', '64:ff9b:1::/48', '2002::/16', '2001::/32'))


class RemoteImageError(Exception):
    """Yuklash rad etildi yoki amalga oshmadi. `message` — foydalanuvchiga ko'rsatiladigan o'zbekcha matn (ichki ma'lumotsiz)."""

    def __init__(self, message, code='fetch_failed', status=422):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


def allowed_hosts():
    configured = getattr(settings, 'MENU_IMAGE_ALLOWED_HOSTS', None) or DEFAULT_ALLOWED_HOSTS
    return tuple(str(h).strip().lower() for h in configured if str(h).strip())


def host_allowed(host, patterns=None):
    """Aniq host yoki `*.domen` (kamida bitta pastki domen) ro'yxatda bormi."""
    host = (host or '').strip().lower().rstrip('.')
    if not host:
        return False
    for pattern in (patterns if patterns is not None else allowed_hosts()):
        if pattern.startswith('*.'):
            suffix = pattern[1:]
            if host.endswith(suffix) and len(host) > len(suffix):
                return True
        elif host == pattern:
            return True
    return False


def is_public_ip(value):
    """IP internetdagi oddiy (global) manzilmi. Noto'g'ri qiymat — False."""
    try:
        ip = ipaddress.ip_address(str(value).split('%', 1)[0])
    except ValueError:
        return False
    if ip.version == 6:
        if ip.ipv4_mapped is not None:
            ip = ip.ipv4_mapped
        elif any(ip in net for net in _EMBEDDED_V4_NETWORKS):
            return False
        elif ip.is_site_local:
            return False
    return not (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified
    ) and ip.is_global


def parse_remote_url(url):
    """Manzilni tekshiradi → (host, ruxsat etilgan so'rov yo'li). Noto'g'ri bo'lsa RemoteImageError."""
    if not isinstance(url, str) or not url.strip() or len(url) > MAX_URL_LENGTH:
        raise RemoteImageError("Rasm manzili noto'g'ri.", 'bad_url', 400)
    text = url.strip()
    if any(ord(ch) < 33 or ord(ch) == 127 for ch in text):
        raise RemoteImageError("Rasm manzilida taqiqlangan belgilar bor.", 'bad_url', 400)
    try:
        parts = urlsplit(text)
        port = parts.port
    except ValueError:
        raise RemoteImageError("Rasm manzili noto'g'ri.", 'bad_url', 400) from None
    if parts.scheme.lower() != 'https':
        raise RemoteImageError("Rasm faqat xavfsiz (https) manzildan olinadi.", 'bad_scheme', 400)
    if parts.username is not None or parts.password is not None:
        raise RemoteImageError("Rasm manzilida login yoki parol bo'lishi mumkin emas.", 'bad_url', 400)
    if port not in (None, 443):
        raise RemoteImageError("Rasm manzilida nostandart port ishlatilgan.", 'bad_url', 400)
    host = (parts.hostname or '').lower().rstrip('.')
    if not host:
        raise RemoteImageError("Rasm manzili noto'g'ri.", 'bad_url', 400)
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise RemoteImageError("Rasm IP-manzildan emas, ruxsat etilgan sayt nomidan olinishi kerak.", 'bad_host', 400)
    if not host_allowed(host):
        raise RemoteImageError("Bu saytdan rasm olishga ruxsat berilmagan.", 'host_not_allowed', 400)
    path = quote(parts.path or '/', safe="/%:@!$&'()*+,;=~-._")
    query = quote(parts.query, safe="/%:@!$&'()*+,;=~-._?")
    return host, path + (f'?{query}' if query else '')


def resolve_public_ips(host):
    """Host → IP ro'yxati. Birorta ham manzil ommaviy bo'lmasa (yoki hal bo'lmasa) rad etiladi."""
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError):
        raise RemoteImageError("Rasm manbasi topilmadi (manzil hal bo'lmadi).", 'unreachable', 503) from None
    ips = []
    for info in infos:
        ip = info[4][0]
        if not is_public_ip(ip):
            raise RemoteImageError("Bu manzildan rasm olish xavfsizlik nuqtai nazaridan taqiqlangan.", 'blocked_address', 400)
        if ip not in ips:
            ips.append(ip)
    if not ips:
        raise RemoteImageError("Rasm manbasi topilmadi (manzil hal bo'lmadi).", 'unreachable', 503)
    return ips[:4]


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    """HTTPS ulanish, u DNS so'ramaydi: aynan tekshirilgan IP'larning biriga ulanadi, TLS esa asl host nomi bilan tekshiriladi."""

    def __init__(self, host, ips, timeout=SOCKET_TIMEOUT, context=None):
        super().__init__(host, 443, timeout=timeout, context=context or _tls_context())
        self._pinned_ips = list(ips)

    def connect(self):
        last_error = None
        for ip in self._pinned_ips:
            raw = None
            try:
                raw = socket.create_connection((ip, 443), timeout=self.timeout)
                sock = self._context.wrap_socket(raw, server_hostname=self.host)
                peer = sock.getpeername()[0]
                if not is_public_ip(peer):
                    sock.close()
                    raise RemoteImageError("Bu manzildan rasm olish xavfsizlik nuqtai nazaridan taqiqlangan.", 'blocked_address', 400)
                self.sock = sock
                return
            except RemoteImageError:
                raise
            except (OSError, ssl.SSLError) as exc:
                last_error = exc
                if raw is not None:
                    try:
                        raw.close()
                    except OSError:
                        pass
        raise last_error or OSError('connect failed')


def _tls_context():
    context = ssl.create_default_context()      # sertifikat va host nomini tekshiradi
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    return context


def _new_connection(host, ips):
    return _PinnedHTTPSConnection(host, ips)


def _read_body(response, deadline):
    content_type = (response.getheader('Content-Type') or '').split(';', 1)[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise RemoteImageError("Manba rasm bermadi (faqat JPEG, PNG yoki WebP qabul qilinadi).", 'bad_content_type', 422)
    encoding = (response.getheader('Content-Encoding') or '').strip().lower()
    if encoding not in ('', 'identity'):
        raise RemoteImageError("Manba rasmni tushunarsiz shaklda yubordi.", 'bad_content_encoding', 422)
    declared = (response.getheader('Content-Length') or '').strip()
    if declared.isdigit() and int(declared) > MAX_BYTES:
        raise RemoteImageError("Rasm juda katta (6 MB dan oshmasligi kerak). Boshqa variantni tanlang.", 'too_large', 422)
    buffer = bytearray()
    while True:
        if time.monotonic() > deadline:
            raise RemoteImageError("Rasm manbasi juda sekin javob berdi. Qayta urinib ko'ring.", 'timeout', 503)
        try:
            chunk = response.read(64 * 1024)
        except (OSError, http.client.HTTPException):
            raise RemoteImageError("Rasm yuklanishi uzildi. Qayta urinib ko'ring.", 'unreachable', 503) from None
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > MAX_BYTES:
            raise RemoteImageError("Rasm juda katta (6 MB dan oshmasligi kerak). Boshqa variantni tanlang.", 'too_large', 422)
    if not buffer:
        raise RemoteImageError("Manba bo'sh javob berdi.", 'empty', 422)
    return bytes(buffer)


def fetch_remote_image(url):
    """`url` dagi rasmni xavfsiz yuklab, xom baytlarni qaytaradi. Har qanday muammoda RemoteImageError."""
    deadline = time.monotonic() + TOTAL_DEADLINE
    current = url
    for _hop in range(MAX_REDIRECTS + 1):
        host, target = parse_remote_url(current)
        ips = resolve_public_ips(host)
        connection = _new_connection(host, ips)
        try:
            try:
                connection.request('GET', target, headers={
                    'User-Agent': USER_AGENT,
                    'Accept': 'image/jpeg,image/png,image/webp',
                    'Accept-Encoding': 'identity',
                    'Connection': 'close',
                })
                response = connection.getresponse()
            except RemoteImageError:
                raise
            except (OSError, http.client.HTTPException, ssl.SSLError, UnicodeError):
                raise RemoteImageError("Rasm manbasiga ulanib bo'lmadi. Qayta urinib ko'ring.", 'unreachable', 503) from None
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader('Location')
                if not location:
                    raise RemoteImageError("Rasm manbasi noto'g'ri yo'naltirdi.", 'bad_redirect', 422)
                current = urljoin(current, location)
                continue
            if response.status == 200:
                return _read_body(response, deadline)
            if response.status in (429, 500, 502, 503, 504):
                raise RemoteImageError("Rasm manbasi hozir javob bermayapti. Birozdan so'ng urinib ko'ring.", 'source_busy', 503)
            raise RemoteImageError("Rasm manbada topilmadi yoki yuklab bo'lmaydi. Boshqa variantni tanlang.", 'not_found', 422)
        finally:
            connection.close()
    raise RemoteImageError("Rasm manbasi juda ko'p marta yo'naltirdi.", 'redirect_limit', 422)
