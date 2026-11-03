"""
TenantMiddleware (TZ_MULTITENANT Bosqich 0): `Host = <mijoz>.PLATFORM_DOMAIN` -> `request.tenant_shop`.

| Host                                              | Natija                                                                              |
|---------------------------------------------------|-------------------------------------------------------------------------------------|
| PLATFORM_DOMAIN bo'sh / host boshqa domen          | HECH NARSA O'ZGARMAYDI (localhost, 127.0.0.1, CI, demo): `tenant_shop=None`, asosiy restoran |
| apex, www.<d>, app.<d>                            | platforma hosti: `tenant_shop=None`, `is_platform_host=True`                         |
| <mijoz>.<d>, faol do'kon                          | `request.tenant_shop` = Shop, `request.tenant = {'shop_id', 'subdomain'}`             |
| <mijoz>.<d>, `status='suspended'`                 | 503 "Bu restoran hozir faol emas" sahifasi                                           |
| noma'lum / yaroqsiz / band yorliq, a.b.<d>        | 404 sahifa                                                                           |

Xavfsizlik: host `request.get_host()` orqali olinadi — ALLOWED_HOSTS tekshiruvi ustida; `X-Forwarded-Host` FAQAT
`USE_X_FORWARDED_HOST=True` bo'lsa e'tiborga olinadi (Django standart xatti-harakati). Port e'tiborga olinmaydi.
Media/statik/sog'liq yo'llari tenantga bog'lanmaydi (ular umumiy; rasm yo'llari tenantga xos emas — media hozircha umumiy).

Joriy tenant contextvar'da turadi (`shops.tenancy.current_tenant()`), `finally` va `request_finished` bilan tozalanadi:
istisno bilan tugagan so'rovdan tenant boshqa so'rovga o'tib qolmaydi.
"""
from django.http import HttpResponse
from django.template.loader import render_to_string

from shops import tenancy

# Tenantga bog'lanmaydigan yo'llar (SellerTenantMiddleware.SKIP_PREFIXES bilan bir xil + sog'liq)
EXEMPT_PREFIXES = ('/media/', '/assets/', '/static/', '/health/', '/favicon.ico')

# Tenant hostida butunlay yopiladigan yo'llar: platforma admin paneli faqat platforma hostida
TENANT_BLOCKED_PREFIXES = ('/djangoadmin/',)


def _lookup_tenant(label):
    """(shop_id, status) yoki None. Jarayon keshi (TTL, standart 5 s) — noma'lum subdomenlarga bazani urib bo'lmasin."""
    from backend.runtime_cache import cached_shop_value
    from shops.models import Shop

    def _resolve():
        row = Shop.objects.filter(subdomain=label).values_list('pk', 'status').first()
        return tuple(row) if row else None

    return cached_shop_value(('tenant-host', label), 'lookup', _resolve)


def _page(template, context, status):
    """Sahifa so'rovsiz (kontekst protsessorlarsiz) chiziladi: bu sahifalar sessiya/savatga bog'liq emas va middleware
    zanjirining boshida ishlaydi (so'rovda `session` bo'lmasligi mumkin)."""
    return HttpResponse(render_to_string(template, context), status=status, content_type='text/html; charset=utf-8')


def _unavailable(request, status, code, title, line_uz, line_ru, line_en):
    return _page('tenant/unavailable.html', {
        'err_code': code, 'err_title': title, 'line_uz': line_uz, 'line_ru': line_ru, 'line_en': line_en,
    }, status)


def tenant_not_found(request):
    return _page('ar_guest/404.html', {}, 404)


def tenant_suspended(request):
    response = _unavailable(
        request, 503, '503', "Bu restoran hozir faol emas",
        "Bu restoran vaqtincha to'xtatilgan. Iltimos, keyinroq urinib ko'ring.",
        "Этот ресторан временно не активен. Пожалуйста, попробуйте позже.",
        "This restaurant is currently not active. Please try again later.")
    response['Retry-After'] = '3600'
    return response


class TenantMiddleware:
    """Yangi uslubdagi middleware: contextvar'ni `try/finally` bilan tozalash kafolati uchun."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant_shop = None
        request.tenant = None
        request.is_platform_host = False
        request.host_kind = tenancy.HOST_LEGACY

        if not tenancy.tenancy_enabled() or request.path.startswith(EXEMPT_PREFIXES):
            return self.get_response(request)

        host = request.get_host()              # ALLOWED_HOSTS tekshiruvi (+ USE_X_FORWARDED_HOST bo'lsa xavfsiz sarlavha)
        kind, label = tenancy.classify_host(host)
        request.host_kind = kind

        if kind == tenancy.HOST_LEGACY:
            return self.get_response(request)
        if kind == tenancy.HOST_PLATFORM:
            request.is_platform_host = True
            token = tenancy.set_current_host_kind(tenancy.HOST_PLATFORM)
            try:
                return self.get_response(request)
            finally:
                tenancy.reset_current_host_kind(token)
        if kind == tenancy.HOST_INVALID:
            return tenant_not_found(request)

        found = _lookup_tenant(label)
        if found is None:
            return tenant_not_found(request)
        shop_id, status = found
        if status != 'active':
            return tenant_suspended(request)
        if request.path.startswith(TENANT_BLOCKED_PREFIXES):
            return tenant_not_found(request)

        from shops.models import Shop
        shop = Shop.objects.filter(pk=shop_id, subdomain=label).first()
        if shop is None:                       # kesh eskirgan (o'chirilgan/qayta nomlangan): 404
            return tenant_not_found(request)
        if shop.status != 'active':
            return tenant_suspended(request)

        request.tenant_shop = shop
        request.tenant = {'shop_id': shop.pk, 'subdomain': shop.subdomain}
        token = tenancy.set_current_tenant(shop)
        try:
            return self.get_response(request)
        finally:
            tenancy.reset_current_tenant(token)


def connect_tenant_signals():
    from django.core.signals import request_finished
    request_finished.connect(tenancy.clear_current_tenant, dispatch_uid='tenant_clear_on_request_finished')
