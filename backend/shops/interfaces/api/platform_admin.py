"""
Platforma API: mijozlar (tenantlar) boshqaruvi. TZ_MULTITENANT_BRON_BREND_VIDEO_TUR, Bosqich 2.

    GET   /api/platform/v1/tenants/                          ro'yxat (so'rovlar soni doimiy, N+1 yo'q)
    POST  /api/platform/v1/tenants/                          yangi mijoz (restoran/kafe/to'yxona) ochish
    GET   /api/platform/v1/tenants/check-subdomain/?q=       subdomen bo'shmi
    GET   /api/platform/v1/tenants/<id>/                     bitta mijoz
    PATCH /api/platform/v1/tenants/<id>/                     nom, biznes turi, holat (faol / to'xtatilgan). Subdomen O'ZGARMAYDI
    POST  /api/platform/v1/tenants/<id>/reset-owner-password/  egasiga yangi bir martalik parol

Xavfsizlik:
- FAQAT `super_admin` (platforma operatori); tenant hostida (`<mijoz>.PLATFORM_DOMAIN`) butun API 404 — mijoz saytida platforma yo'li yo'q.
  Ruxsat etilgan hostlar: platforma hosti (apex/www/app) va tenantsiz (localhost/demo).
- CSRF (sessiya), yaratishga tezlik chegarasi (soatiga 30), har amal AuditLog'da. Parollar HECH QAYERDA saqlanmaydi/yozilmaydi:
  bir marta javobda qaytadi (`Cache-Control: no-store`), baza faqat xeshni saqlaydi, audit yozuvida parol yo'q.
- Mijoz MA'LUMOTI (taom, buyurtma, mijoz ismi, summa) ko'rsatilmaydi — faqat sonlar (stollar, taomlar).
- Subdomen o'zgarmaydi: QR kodlar va tarqatilgan havolalar sinmasin.
- Yangi mijoz "asosiy restoran" bo'lib qolmaydi (`restaurant_default_shop` tegilmaydi).
"""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from accounts.models import AdminUser
from accounts.staff_admin import end_sessions
from accounts.staff_permissions import parse_username
from backend.api_input import (
    InputError,
    RestoAdminAPIView,
    parse_choice,
    parse_text,
    query_int,
    query_text,
)
from backend.ratelimit import rate_limited
from orders.audit import log_audit
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION
from products.models import Product
from shops.booking_config import normalize_booking
from shops.brand import parse_phone
from shops.models import Shop
from shops.tenancy import current_tenant, normalize_subdomain, subdomain_problem, tenant_base_url
from tables_restaurant.models import Table
from tables_restaurant.provisioning import ProvisionError, generate_password, provision_restaurant
from web.restaurant_auth import user_role

BUSINESS_TYPES = tuple(key for key, _ in Shop.BUSINESS_TYPE_CHOICES)
STATUSES = tuple(key for key, _ in Shop.STATUS_CHOICES)
NAME_MAX = 100
CREATE_LIMIT = (30, 3600)           # soatiga 30 ta yaratish urinishi
RESET_LIMIT = (10, 3600)


class IsPlatformAdmin(BasePermission):
    message = "Bu amal faqat platforma administratori uchun."

    def has_permission(self, request, view):
        user = request.user
        return bool(getattr(user, 'is_authenticated', False) and getattr(user, 'is_active', False)
                    and user_role(user) == 'super_admin')


class PlatformAPIView(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [IsPlatformAdmin]

    def initial(self, request, *args, **kwargs):
        # Tenant hostida platforma API umuman yo'q (hatto kirmagan foydalanuvchiga ham 404: mavjudligi ko'rinmasin)
        if current_tenant() is not None:
            raise NotFound()
        super().initial(request, *args, **kwargs)

    @staticmethod
    def no_store(response):
        response['Cache-Control'] = 'no-store'
        return response


def _urls(shop):
    base = tenant_base_url(shop)
    return {'url': f'{base}/' if base else None, 'login_url': f'{base}/admin/login/' if base else None}


def _row(shop):
    """Mijoz qatori: faqat sozlama va SONLAR (mijoz ma'lumotining mazmuni yo'q). `shop` `_tenants()` dan (annotatsiyali) kelishi shart."""
    owner = shop.owner
    return {
        'id': shop.pk,
        'name': shop.name,
        'subdomain': shop.subdomain,
        'business_type': shop.business_type,
        'status': shop.status,
        'owner_username': owner.username if owner is not None else '',
        'created_at': shop.created_at.isoformat() if shop.created_at else None,
        'tables': shop.tables_n,
        'products': shop.products_n,
        'url': _urls(shop)['url'],
    }


def _count_of(model):
    """Do'konga tegishli yozuvlar soni — bitta so'rov ichidagi bog'langan ichki so'rov (alohida guruhlash so'rovlari kerak emas)."""
    inner = model.objects.filter(shop_id=OuterRef('pk')).order_by().values('shop_id').annotate(n=Count('pk')).values('n')[:1]
    return Coalesce(Subquery(inner, output_field=IntegerField()), 0)


def _tenants():
    """Mijozlar (subdomeni bor do'konlar) egasi va stol/taom sonlari bilan: so'rovlar soni ro'yxat uzunligiga bog'liq emas."""
    return (Shop.objects.filter(subdomain__isnull=False).select_related('owner')
            .annotate(tables_n=_count_of(Table), products_n=_count_of(Product)))


def _subdomain_state(raw):
    """-> (normalizatsiya, sabab | None). Band tekshiruvi katta-kichik harfsiz."""
    normalized = normalize_subdomain(raw) or ''
    problem = subdomain_problem(normalized)
    if problem:
        return normalized, problem
    if Shop.objects.filter(subdomain=normalized).exists():
        return normalized, f"'{normalized}' subdomeni band"
    return normalized, None


class TenantListCreateView(PlatformAPIView):
    def get(self, request):
        qs = _tenants()
        text = query_text(request, 'q', 60)
        if text:
            qs = qs.filter(Q(name__icontains=text) | Q(subdomain__icontains=text) | Q(owner__username__icontains=text))
        state = request.GET.get('status')
        if state in STATUSES:
            qs = qs.filter(status=state)
        total = qs.count()
        limit = query_int(request, 'limit', 100, 1, 200)
        offset = query_int(request, 'offset', 0, 0, 1_000_000)
        shops = qs.order_by('-created_at', '-id')[offset:offset + limit]
        return self.no_store(Response({'count': total, 'results': [_row(s) for s in shops]}))

    def post(self, request):
        limited = rate_limited(request, 'platform_tenant_create', *CREATE_LIMIT)
        if limited is not None:
            return limited
        data = request.data
        name = parse_text(data.get('name'), 'name', max_length=NAME_MAX, required=True)
        business_type = parse_choice(data.get('business_type') or 'restaurant', 'business_type', BUSINESS_TYPES)
        subdomain, problem = _subdomain_state(parse_text(data.get('subdomain'), 'subdomain', max_length=60, required=True))
        if problem:
            raise InputError(problem, 'subdomain')
        owner_username = parse_username(data.get('owner_username'))
        password = parse_text(data.get('owner_password'), 'owner_password', max_length=128)
        phone = parse_phone(data.get('phone'))
        try:
            result = provision_restaurant(
                name=name, owner_username=owner_username, password=password, phone=phone, address='', tables=10,
                subdomain=subdomain, business_type=business_type, make_default=False, allow_existing=False,
                initial_profile={'booking': normalize_booking(None)},
            )
        except ProvisionError as exc:
            raise InputError(exc.message, exc.field) from None
        shop = result.shop
        log_audit('tenant_created', request=request, actor=request.user, target_type='shop', target_id=shop.pk,
                  new_value={'name': shop.name, 'subdomain': shop.subdomain, 'business_type': shop.business_type,
                             'owner_username': result.owner.username})
        body = {
            'id': shop.pk, 'name': shop.name, 'subdomain': shop.subdomain, 'business_type': shop.business_type,
            'status': shop.status, 'owner_username': result.owner.username, 'tables': result.tables_total,
            **_urls(shop),
        }
        if result.generated_password:
            body['generated_password'] = result.generated_password          # bir marta; hech qayerda saqlanmaydi
        return self.no_store(Response(body, status=status.HTTP_201_CREATED))


class SubdomainCheckView(PlatformAPIView):
    def get(self, request):
        normalized, problem = _subdomain_state(query_text(request, 'q', 60))
        body = {'available': problem is None, 'normalized': normalized}
        if problem:
            body['reason'] = problem
        return Response(body)


def _get_tenant(pk):
    shop = _tenants().filter(pk=pk).first()
    if shop is None:
        raise Http404
    return shop


class TenantDetailView(PlatformAPIView):
    def get(self, request, pk):
        return Response(_row(_get_tenant(pk)))

    def patch(self, request, pk):
        shop = _get_tenant(pk)
        data = request.data
        for key in data:
            if key not in ('name', 'business_type', 'status', 'subdomain'):
                raise InputError(f"Noma'lum kalit: «{key}»", key)
        if 'subdomain' in data and normalize_subdomain(data.get('subdomain')) != shop.subdomain:
            raise InputError("Subdomen o'zgarmaydi: QR kodlar va tarqatilgan havolalar ishlamay qolardi", 'subdomain')
        old = {'name': shop.name, 'business_type': shop.business_type, 'status': shop.status}
        changed = []
        if 'name' in data:
            shop.name = parse_text(data['name'], 'name', max_length=NAME_MAX, required=True)
            changed.append('name')
        if 'business_type' in data:
            shop.business_type = parse_choice(data['business_type'], 'business_type', BUSINESS_TYPES)
            changed.append('business_type')
        if 'status' in data:
            shop.status = parse_choice(data['status'], 'status', STATUSES)
            changed.append('status')
        if changed:
            shop.save(update_fields=changed)
            log_audit('tenant_updated', request=request, actor=request.user, target_type='shop', target_id=shop.pk,
                      old_value={k: v for k, v in old.items() if k in changed},
                      new_value={k: getattr(shop, k) for k in changed})
        return Response(_row(_get_tenant(pk)))


class TenantResetOwnerPasswordView(PlatformAPIView):
    def post(self, request, pk):
        limited = rate_limited(request, 'platform_owner_reset', *RESET_LIMIT)
        if limited is not None:
            return limited
        shop = _get_tenant(pk)
        owner = shop.owner or AdminUser.objects.filter(shop=shop, role='shop_owner').order_by('id').first()
        if owner is None:
            return Response({'error': 'Bu mijozning egasi topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        if owner.role == 'super_admin' or owner.is_superuser:
            raise InputError("Platforma administratorining parolini bu yerdan o'zgartirib bo'lmaydi", 'owner')
        password = None
        for _ in range(5):
            candidate = generate_password()
            try:
                validate_password(candidate, user=owner)
            except ValidationError:               # tasodifiy parol juda kam rad etiladi; baribir qayta uriniladi
                continue
            password = candidate
            break
        if password is None:
            return Response({'error': 'Parol yaratib bo\'lmadi, qayta urinib ko\'ring'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        owner.set_password(password)
        owner.save(update_fields=['password'])
        ended = end_sessions(owner)
        log_audit('tenant_owner_pw_reset', request=request, actor=request.user, target_type='shop', target_id=shop.pk,
                  new_value={'owner_username': owner.username, 'sessions_ended': ended})
        return self.no_store(Response({'owner_username': owner.username, 'generated_password': password}))
