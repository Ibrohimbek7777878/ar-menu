"""
Yangi restoran (tenant) ochish: egasi, do'kon, zal va stollar, boshlang'ich bron sozlamasi. YAGONA servis funksiyasi:
`manage.py create_restaurant` ham, platforma API (`POST /api/platform/v1/tenants/`) ham shuni chaqiradi.

Ikki rejim (`allow_existing`):
- True  (buyruq): idempotent — qayta ishga tushirilsa mavjud egasi/restoran qayta ishlatiladi, yetishmagan stollar qo'shiladi,
  hech narsa o'chirilmaydi. "Asosiy restoran" belgilanishi mumkin (`make_default`).
- False (platforma API): FAQAT yangi yaratadi — band login, band subdomen yoki band slug mavjud akkaunt/restoranni bosib olishga YO'L QO'YMAYDI
  (xato), "asosiy restoran" hech qachon o'zgarmaydi. Hammasi bitta tranzaksiyada: xato bo'lsa yarim holat qolmaydi.
"""
import secrets
from dataclasses import dataclass, field

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils.text import slugify

from accounts.models import AdminUser
from notifications.models import AppSetting
from shops.models import Shop
from shops.tenancy import normalize_subdomain, slug_to_subdomain, subdomain_problem
from tables_restaurant.models import Hall, Table


class ProvisionError(Exception):
    """Kiritish xatosi: `message` (o'zbekcha), `field` (qaysi maydon), `code` (mashina uchun)."""

    def __init__(self, message, field=None, code='invalid'):
        super().__init__(message)
        self.message = message
        self.field = field
        self.code = code


@dataclass
class ProvisionResult:
    shop: Shop
    owner: AdminUser
    created_shop: bool
    created_owner: bool
    generated_password: str = None          # faqat bizning o'zimiz yaratgan parol bo'lsa (bir marta ko'rsatiladi, saqlanmaydi)
    hall: Hall = None
    new_tables: int = 0
    tables_total: int = 0
    warnings: list = field(default_factory=list)


def generate_password():
    return secrets.token_urlsafe(9)


def unique_slug(base):
    """`base` band bo'lsa `base-2`, `base-3` … (mavjud restoranga tegmaydi)."""
    base = (slugify(base, allow_unicode=False) or 'restoran').strip('-')[:45] or 'restoran'
    candidate, n = base, 1
    while Shop.objects.filter(slug=candidate).exists():
        n += 1
        candidate = f'{base}-{n}'
    return candidate


def provision_restaurant(*, name, owner_username, password='', slug='', phone='+998900000000', address='Guliston',
                         hall_name='Asosiy Zal', tables=10, subdomain='', business_type='restaurant',
                         make_default=False, allow_existing=False, initial_profile=None):
    name = (name or '').strip()
    if not name:
        raise ProvisionError("Restoran nomi bo'sh bo'lmasligi kerak", 'name')
    if not 1 <= tables <= 200:
        raise ProvisionError("Stollar soni 1 dan 200 gacha bo'lishi kerak", 'tables')
    if business_type not in dict(Shop.BUSINESS_TYPE_CHOICES):
        raise ProvisionError(f"{', '.join(dict(Shop.BUSINESS_TYPE_CHOICES))} dan biri bo'lishi kerak", 'business_type')
    try:
        with transaction.atomic():
            return _provision(name=name, owner_username=owner_username, password=password or '', slug=slug or '', phone=phone,
                              address=address, hall_name=hall_name, tables=tables, subdomain=subdomain or '',
                              business_type=business_type, make_default=make_default, allow_existing=allow_existing,
                              initial_profile=initial_profile)
    except IntegrityError:
        # Parallel so'rov bir vaqtda xuddi shu subdomen/login/slug ni oldi (unique cheklov)
        raise ProvisionError("Subdomen, login yoki restoran nomi band bo'lib qoldi. Qayta urinib ko'ring", None, 'conflict') from None


def _owner(*, owner_username, password, phone, allow_existing, result_flags):
    # API (yangi akkaunt): katta-kichik harfsiz band tekshiriladi ("Ega" va "ega" bir kishi emas); buyruq: aniq mos keladigan akkaunt qayta ishlatiladi
    lookup = {'username': owner_username} if allow_existing else {'username__iexact': owner_username}
    existing = AdminUser.objects.filter(**lookup).first()
    if existing is not None and not allow_existing:
        raise ProvisionError(f"«{owner_username}» logini band. Boshqa login tanlang", 'owner_username', 'username_taken')
    if existing is not None:
        if existing.role not in ('shop_owner', 'shop_manager'):
            raise ProvisionError(f"'{existing.username}' akkaunti restoran egasi emas (role={existing.role})", 'owner_username', 'not_owner')
        if password:
            existing.set_password(password)
            existing.save(update_fields=['password'])
        return existing
    generated = None
    if not password:
        password = generated = generate_password()
    elif not allow_existing:
        try:
            validate_password(password, user=AdminUser(username=owner_username))
        except ValidationError as exc:
            from accounts.staff_permissions import password_problems
            raise ProvisionError('Parol yetarli kuchli emas: ' + password_problems(exc), 'owner_password', 'weak_password') from None
    result_flags['generated_password'] = generated
    result_flags['created_owner'] = True
    return AdminUser.objects.create_user(username=owner_username, password=password, role='shop_owner', is_approved=True, phone=phone)


def _provision(*, name, owner_username, password, slug, phone, address, hall_name, tables, subdomain, business_type,
               make_default, allow_existing, initial_profile):
    warnings = []
    flags = {'generated_password': None, 'created_owner': False}
    explicit_subdomain = bool(subdomain)
    if allow_existing:
        slug = (slug or slugify(name, allow_unicode=False) or 'restoran').strip('-')
    else:
        slug = (slug or '').strip() and slugify(slug, allow_unicode=False).strip('-') or unique_slug(name)
        if Shop.objects.filter(slug=slug).exists():
            raise ProvisionError(f"«{slug}» nomli restoran allaqachon bor", 'slug', 'slug_taken')

    if explicit_subdomain:
        subdomain = normalize_subdomain(subdomain)
        problem = subdomain_problem(subdomain)
        if problem:
            raise ProvisionError(problem, 'subdomain', 'subdomain_invalid')
    elif allow_existing:
        subdomain = slug_to_subdomain(slug)           # yaroqsiz yoki band bo'lsa keyinroq e'tiborsiz qoldiriladi (ogohlantirish bilan)
    else:
        raise ProvisionError('Subdomen kiritilishi shart', 'subdomain', 'subdomain_required')

    owner = _owner(owner_username=owner_username, password=password, phone=phone, allow_existing=allow_existing, result_flags=flags)

    shop = Shop.objects.filter(slug=slug).first() if allow_existing else None
    created_shop = shop is None
    taken = Shop.objects.filter(subdomain=subdomain).exclude(pk=getattr(shop, 'pk', None)).exists() if subdomain else False
    if taken and explicit_subdomain:
        raise ProvisionError(f"'{subdomain}' subdomeni band", 'subdomain', 'subdomain_taken')
    if taken or (subdomain and not explicit_subdomain and subdomain_problem(subdomain)):
        warnings.append(f"Subdomen '{subdomain}' band yoki yaroqsiz — keyin /platform orqali bering")
        subdomain = None

    if created_shop:
        profile = dict(initial_profile or {})
        shop = Shop.objects.create(
            name=name, slug=slug, owner=owner, address=address, phone=phone, latitude=40.4897, longitude=68.7842, is_open=True,
            subdomain=subdomain, business_type=business_type, business_profile=profile,
        )
    elif shop.owner_id and shop.owner_id != owner.pk:
        raise ProvisionError(f"'{slug}' restorani boshqa egaga tegishli", 'slug', 'not_owner')
    else:
        # Mavjud restoran: subdomen/turni faqat aniq so'ralganda yangilaymiz (o'zboshimchalik bilan o'zgartirilmaydi)
        changed = []
        if explicit_subdomain and shop.subdomain != subdomain:
            shop.subdomain = subdomain
            changed.append('subdomain')
        if business_type != 'restaurant' and shop.business_type != business_type:
            shop.business_type = business_type
            changed.append('business_type')
        if changed:
            shop.save(update_fields=changed)
    if owner.shop_id != shop.pk:
        owner.shop = shop
        owner.save(update_fields=['shop'])

    hall, _ = Hall.objects.get_or_create(shop=shop, name=hall_name)
    existing = set(Table.objects.filter(shop=shop).values_list('number', flat=True))
    new_tables = [Table(shop=shop, hall=hall, number=str(n), capacity=4, status='free')
                  for n in range(1, tables + 1) if str(n) not in existing]
    Table.objects.bulk_create(new_tables)

    if make_default:
        AppSetting.objects.update_or_create(
            key='restaurant_default_shop',
            defaults={'value': shop.slug, 'category': 'restaurant',
                      'description': "Mehmon menyusi (/menu/) ko'rsatadigan restoran slug'i"},
        )
    return ProvisionResult(
        shop=shop, owner=owner, created_shop=created_shop, created_owner=flags['created_owner'],
        generated_password=flags['generated_password'], hall=hall, new_tables=len(new_tables),
        tables_total=Table.objects.filter(shop=shop).count(), warnings=warnings,
    )
