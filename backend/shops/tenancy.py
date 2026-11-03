"""
Multi-tenant ASOS (TZ_MULTITENANT_BRON_BREND_VIDEO_TUR, Bosqich 0): bitta umumiy server, har mijoz `mijoz.PLATFORM_DOMAIN`.

Bu modul Django ORM'ga bog'liq emas (faqat sozlamalar va satrlar): subdomen qoidalari, host tasnifi (legacy / platforma /
tenant) va joriy so'rov tenanti (contextvar). Shuning uchun uni middleware'dan ham, migratsiyadan ham, modeldan ham xavfsiz
import qilish mumkin.

Asosiy qoida: `PLATFORM_DOMAIN` bo'sh yoki host unga tegishli bo'lmasa (127.0.0.1, localhost, CI, demo) — HECH QANDAY
o'zgarish: avvalgi "asosiy restoran" xatti-harakati.
"""
import contextlib
import contextvars
import re

from django.conf import settings
from django.core.exceptions import ValidationError

# DNS yorlig'i: 3..40 belgi, kichik lotin harf/raqam/defis, chetida defis yo'q (`[a-z0-9-]{3,40}`)
SUBDOMAIN_RE = re.compile(r'^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$')

# Platformaning o'zi yoki infratuzilma ishlatadigan yorliqlar: mijozga berilmaydi. Ro'yxat kodda; qo'shimchasi
# `settings.TENANT_RESERVED_SUBDOMAINS` (env) orqali kengaytiriladi (o'chirib bo'lmaydi: pastki chegara).
RESERVED_SUBDOMAINS = frozenset({
    'www', 'app', 'admin', 'api', 'static', 'media', 'platform', 'mail', 'ftp', 'ns1', 'ns2', 'cdn', 'help', 'support',
    'dashboard', 'ra', 'seller', 'shop', 'test', 'demo', 'staging', 'stage', 'dev', 'beta', 'status', 'blog', 'docs',
    'smtp', 'imap', 'pop', 'mx', 'webmail', 'root', 'localhost', 'login', 'register', 'signup', 'account', 'accounts',
    'billing', 'pay', 'payments', 'auth', 'sso', 'oauth', 'assets', 'files', 'img', 'images', 'video', 'bot', 'tma',
    'kds', 'waiter', 'menu', 'guest', 'internal', 'monitor', 'grafana', 'sentry', 'git', 'ci', 'vpn', 'ssh',
})

RESERVED = RESERVED_SUBDOMAINS      # qisqa nom (TZ)

# Platforma hosti: apex va shu ikki yorliq (tenantsiz, platforma admini uchun)
PLATFORM_LABELS = frozenset({'www', 'app'})

HOST_LEGACY = 'legacy'        # PLATFORM_DOMAIN yo'q yoki host unga tegishli emas: avvalgi xatti-harakat
HOST_PLATFORM = 'platform'    # apex / www / app
HOST_TENANT = 'tenant'        # <label>.PLATFORM_DOMAIN (label hali bazada tekshirilmagan)
HOST_INVALID = 'invalid'      # PLATFORM_DOMAIN ostida, lekin tenant bo'la olmaydigan nom (ko'p darajali, noto'g'ri belgi)


def reserved_subdomains():
    extra = getattr(settings, 'TENANT_RESERVED_SUBDOMAINS', None) or ()
    return RESERVED_SUBDOMAINS | {str(x).strip().lower() for x in extra if str(x).strip()}


def normalize_subdomain(value):
    """Kichik harfga keltirilgan, bo'shliqsiz subdomen. Bo'sh qiymat — None (unique maydonda bo'sh satr emas, NULL turadi)."""
    text = str(value or '').strip().lower()
    return text or None


def slug_to_subdomain(slug):
    """Mavjud `slug`dan subdomen nomzodi: '_' va bo'shliq -> '-', ruxsat etilmagan belgilar olib tashlanadi. Yaroqsiz bo'lsa None."""
    text = re.sub(r'[\s_]+', '-', str(slug or '').strip().lower())
    text = re.sub(r'[^a-z0-9-]', '', text)
    text = re.sub(r'-{2,}', '-', text).strip('-')[:40].strip('-')
    return text if subdomain_problem(text) is None else None


def subdomain_problem(value):
    """Yaroqsizlik sababi (o'zbekcha matn) yoki None (yaroqli). Bazadagi bandlik bu yerda tekshirilmaydi."""
    value = normalize_subdomain(value)
    if not value:
        return "Subdomen kiritilishi shart"
    if not SUBDOMAIN_RE.match(value):
        return ("Subdomen 3–40 belgi bo'lib, faqat kichik lotin harf, raqam va defisdan iborat bo'lishi kerak "
                "(chetida defis bo'lmaydi)")
    if value.startswith('xn--') or value[2:4] == '--':
        return "Subdomen 'xn--' yoki '--' bilan boshlanmasligi kerak (xalqaro nomlar taqiqlangan)"
    if value in reserved_subdomains():
        return f"'{value}' band so'z: platforma uchun ajratilgan"
    return None


def validate_subdomain(value):
    """Django validator: noto'g'ri bo'lsa ValidationError."""
    problem = subdomain_problem(value)
    if problem:
        raise ValidationError(problem, code='invalid_subdomain')
    return normalize_subdomain(value)


def is_valid_subdomain(value):
    return subdomain_problem(value) is None


# ── Host tasnifi ────────────────────────────────────────────────────────────────────────────────────────────

def platform_domain():
    """Sozlangan platforma domeni (kichik harf, nuqtasiz chetlar, portsiz) yoki ''."""
    raw = str(getattr(settings, 'PLATFORM_DOMAIN', '') or '').strip().lower()
    raw = re.sub(r'^[a-z]+://', '', raw).split('/')[0]
    if raw.count(':') == 1:                      # port ('lvh.me:8000'); IPv6 emas
        raw = raw.split(':', 1)[0]
    return raw.strip('.')


def tenancy_enabled():
    return bool(platform_domain())


def strip_port(host):
    """Portsiz, kichik harfli host nomi; oxiridagi nuqta ('alfa.domen.uz.') ham olib tashlanadi (tenantdan chetlab o'tish yo'q)."""
    host = str(host or '').strip().lower()
    if host.startswith('['):                     # IPv6 literal
        return host.split(']')[0] + ']'
    if host.count(':') == 1:
        name, port = host.split(':', 1)
        if port.isdigit() or not port:
            host = name
    return host.rstrip('.')


def classify_host(host):
    """
    Host (port bilan yoki portsiz) -> (tur, yorliq).
      ('legacy', None)      PLATFORM_DOMAIN yo'q yoki host boshqa domen (localhost, 127.0.0.1, CI, demo) — o'zgarishsiz
      ('platform', None)    apex / www.<d> / app.<d>
      ('tenant', 'mijoz')   mijoz.<d>  (yorliq kichik harfda; bazada bor-yo'qligi middleware'da tekshiriladi)
      ('invalid', '...')    <d> ostida, lekin tenant bo'la olmaydi (a.b.<d>, noto'g'ri belgi, band so'z)
    Faqat satrlar bilan ishlaydi (baza so'rovi yo'q): MultiProductHostPortMiddleware va legacy darvoza ham ishlatadi.
    """
    base = platform_domain()
    if not base:
        return HOST_LEGACY, None
    name = strip_port(host)
    if name == base:
        return HOST_PLATFORM, None
    suffix = '.' + base
    if not name.endswith(suffix):
        return HOST_LEGACY, None
    label = name[:-len(suffix)]
    if label in PLATFORM_LABELS:
        return HOST_PLATFORM, None
    if '.' in label or not SUBDOMAIN_RE.match(label) or label in reserved_subdomains():
        return HOST_INVALID, label
    return HOST_TENANT, label


def tenant_base_url(shop, scheme='https'):
    """`https://mijoz.PLATFORM_DOMAIN` (bot havolalari, QR uchun) yoki None: platforma sozlanmagan / do'konda subdomen yo'q."""
    base = platform_domain()
    sub = getattr(shop, 'subdomain', None) if shop is not None else None
    if not base or not sub:
        return None
    return f'{scheme}://{sub}.{base}'


# ── Joriy so'rov tenanti (contextvar) ───────────────────────────────────────────────────────────────────────
# TenantMiddleware so'rov boshida Shop nusxasini qo'yadi va oxirida (try/finally) tozalaydi. `get_restaurant_shop()`,
# `staff_shop()`, `get_choice()` va xodim tekshiruvi shu yerdan o'qiydi: so'rov obyektini hamma joyga uzatish shart emas.
# Nusxa FAQAT shu so'rovga tegishli (jarayon keshiga tushmaydi).
_current_tenant = contextvars.ContextVar('gulistan_current_tenant', default=None)


def current_tenant():
    """Joriy so'rovning tenant do'koni (Shop nusxasi) yoki None."""
    return _current_tenant.get()


def current_tenant_id():
    shop = _current_tenant.get()
    return getattr(shop, 'pk', None) if shop is not None else None


def set_current_tenant(shop):
    return _current_tenant.set(shop)


def reset_current_tenant(token):
    try:
        _current_tenant.reset(token)
    except (ValueError, LookupError):            # boshqa kontekstda tiklash: har holda tozalaymiz
        _current_tenant.set(None)


# Platforma hosti (apex/www/app) so'rovi ekanini bilish uchun: u yerda "asosiy restoran" taxmin qilinmaydi va faqat
# platforma admini (super_admin) kira oladi. Tenant va oddiy (legacy) hostlarda None.
_current_host_kind = contextvars.ContextVar('gulistan_current_host_kind', default=None)


def current_host_kind():
    return _current_host_kind.get()


def set_current_host_kind(kind):
    return _current_host_kind.set(kind)


def reset_current_host_kind(token):
    try:
        _current_host_kind.reset(token)
    except (ValueError, LookupError):
        _current_host_kind.set(None)


def on_platform_host():
    """Joriy so'rov platforma hostida (apex/www/app) kelganmi. PLATFORM_DOMAIN yo'q bo'lsa doim False."""
    return _current_host_kind.get() == HOST_PLATFORM


@contextlib.contextmanager
def use_tenant(shop):
    """Fon vazifalar va testlar uchun: `with use_tenant(shop): ...`"""
    token = set_current_tenant(shop)
    try:
        yield shop
    finally:
        reset_current_tenant(token)


def clear_current_tenant(**_kwargs):
    """`request_finished` signali uchun: istisno bilan tugagan so'rovdan tenant qolib ketmasin (boshqa tenantga oqish xavfi)."""
    _current_tenant.set(None)
    _current_host_kind.set(None)
