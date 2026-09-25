import re
import uuid
import logging
from django.core.cache import cache

log = logging.getLogger('core.middleware')
SLUG_RE = re.compile(r'^/m/([\w-]+)/')


class RequestIDMiddleware:
    """Har so'rovga noyob ID — log va trace uchun"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from core.logging import set_request_id, clear_request_id
        rid = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        request.request_id = rid
        set_request_id(rid)
        try:
            response = self.get_response(request)
            response['X-Request-ID'] = rid
            return response
        finally:
            clear_request_id()


class RequestLoggingMiddleware:
    """BARCHA so'rovlarni to'liq loglash — access.log + app.log
    Turlar: HTTP, WS, gRPC, DB, auth, xato — hammasini tutadi."""
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('django.request')
        self.access_logger = logging.getLogger('access')
        # Fallback if access logger not configured — use django.request
        if not self.access_logger.handlers:
            self.access_logger = self.logger

    def __call__(self, request):
        import time
        start = time.time()
        # So'rov tafsilotlari
        method = request.method
        path = request.get_full_path()
        ip = request.META.get('REMOTE_ADDR', '-')
        ua = request.META.get('HTTP_USER_AGENT', '-')[:120]
        rid = getattr(request, 'request_id', '-')
        tenant = getattr(request, 'restaurant_id', '-') or '-'
        user = getattr(request, 'user', None)
        user_str = str(getattr(user, 'phone', '') or getattr(user, 'username', '') or '-') if user and getattr(user, 'is_authenticated', False) else '-'

        # Body ni faqat POST/PUT/PATCH va kichik bo'lsa loglaymiz (max 2KB, maxfiy maydonlar maskalanadi)
        body_snippet = ''
        if method in ('POST', 'PUT', 'PATCH'):
            try:
                body = request.body[:2048].decode('utf-8', errors='ignore') if hasattr(request, 'body') else ''
                # Mask sensitive fields
                for sec in ('password', 'pin', 'token', 'secret', 'key', 'card'):
                    body = body.replace(sec, '***')
                body_snippet = body[:500].replace('\n', ' ')
            except Exception:
                body_snippet = '-'

        response = None
        exc = None
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            exc = e
            # Log exception with full traceback
            log = logging.getLogger('core')
            log.exception(f'[REQ-ERR] {method} {path} rid={rid} tenant={tenant} ip={ip} error={e}', extra={'request_id': rid})
            raise
        finally:
            duration = (time.time() - start) * 1000
            status = getattr(response, 'status_code', 500) if response else 500
            # Tenant va user ni YANGIDAN o'qish — TenantMiddleware ichkarida to'ldiradi
            tenant_after = getattr(request, 'restaurant_id', None) or tenant
            if tenant_after and tenant_after != '-':
                tenant = tenant_after
            # User ham auth dan keyin paydo bo'lishi mumkin
            try:
                user_after = getattr(request, 'user', None)
                if user_after and getattr(user_after, 'is_authenticated', False):
                    user_str = str(getattr(user_after, 'phone', '') or getattr(user_after, 'username', '') or user_str)
            except Exception:
                pass
            # Tanlash: 4xx-5xx ni error, 2xx-3xx ni info
            level = logging.WARNING if status >= 400 else logging.INFO
            msg = (
                f'{method} {path} -> {status} {duration:.0f}ms '
                f'rid={rid} tenant={tenant} user={user_str} ip={ip} ua="{ua}"'
            )
            if body_snippet:
                msg += f' body="{body_snippet[:200]}"'
            # access.log ga alohida — har so'rov yoziladi
            try:
                self.access_logger.log(level, msg)
            except Exception:
                pass
            # Shuningdek app.log ga ham — agar error bo'lsa
            if exc or status >= 500:
                logging.getLogger('core').error(msg)


class TenantMiddleware:
    """
    ⚡ Har so'rovda restaurant_id ni aniqlaydi.
    Multi-tenant xavfsizligining ASOSI.

    Aniqlash tartibi:
      1. Custom domen (menu.restoran.uz)
      2. URL slug (/m/registon/)
      3. QR token (/t/<uuid>)
      4. JWT ichidagi restaurant_id (xodim/admin)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.restaurant_id = None
        request.restaurant = None

        # 1. Custom domen
        from django.conf import settings
        host = request.get_host().split(':')[0]
        if host not in settings.PLATFORM_DOMAINS:
            r = self._by_domain(host)
            if r:
                self._set(request, r)

        # 2. URL slug
        if not request.restaurant_id:
            m = SLUG_RE.match(request.path)
            if m:
                r = self._by_slug(m.group(1))
                if r:
                    self._set(request, r)

        # 3. Query param ?r=slug
        if not request.restaurant_id:
            r_slug = request.GET.get('r')
            if r_slug:
                r = self._by_slug(r_slug)
                if r:
                    self._set(request, r)
                    if hasattr(request, 'session'):
                        request.session['active_restaurant_id'] = r.id

        # 4. Session or Cookie active_restaurant_id (multi-tenant admin switcher)
        if not request.restaurant_id and hasattr(request, 'session'):
            sess_rid = request.session.get('active_restaurant_id')
            if sess_rid:
                r = self._by_id(sess_rid)
                if r:
                    self._set(request, r)

        if not request.restaurant_id:
            cookie_rid = request.COOKIES.get('active_restaurant_id')
            if cookie_rid:
                r = self._by_id(cookie_rid)
                if r:
                    self._set(request, r)

        # 5. Header X-Restaurant-ID (for API/AJAX calls)
        if not request.restaurant_id:
            hdr_rid = request.headers.get('X-Restaurant-ID')
            if hdr_rid:
                r = self._by_id(hdr_rid)
                if r:
                    self._set(request, r)

        if hasattr(request, 'user') and request.user.is_authenticated:
            staff = getattr(request.user, 'staff_roles', None)
            if staff:
                if request.restaurant_id:
                    s = staff.filter(is_active=True, restaurant_id=request.restaurant_id).first()
                    if s:
                        request.staff = s
                if not getattr(request, 'staff', None):
                    s = staff.filter(is_active=True).select_related('restaurant').first()
                    if s and s.restaurant:
                        if not request.restaurant_id:
                            self._set(request, s.restaurant)
                        request.staff = s
            if not request.restaurant_id and request.user.is_superuser:
                from apps.tenants.models import Restaurant
                r = Restaurant.objects.filter(is_active=True).first()
                if r:
                    self._set(request, r)

        return self.get_response(request)

    @staticmethod
    def _by_id(rid):
        try:
            from apps.tenants.models import Restaurant
            return Restaurant.objects.filter(id=int(rid), is_active=True).first()
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _set(request, r):
        request.restaurant_id = r.id
        request.restaurant = r

    @staticmethod
    def _by_slug(slug):
        key = f'rest:slug:{slug}'
        try:
            r = cache.get(key)
        except Exception:
            r = None
        if r is None:
            from apps.tenants.models import Restaurant
            r = Restaurant.objects.filter(slug=slug, is_active=True).first()
            try:
                cache.set(key, r or False, 300)
            except Exception:
                pass
        return r or None

    @staticmethod
    def _by_domain(domain):
        key = f'rest:domain:{domain}'
        try:
            r = cache.get(key)
        except Exception:
            r = None
        if r is None:
            from apps.tenants.models import Restaurant
            r = Restaurant.objects.filter(custom_domain=domain, is_active=True).first()
            try:
                cache.set(key, r or False, 300)
            except Exception:
                pass
        return r or None
