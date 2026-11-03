"""
Yangi restoranni bitta buyruq bilan ochish: restoran, egasining akkaunti, zal va stollar.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (1-qadam)

Ishlatish:
    python manage.py create_restaurant --name "Mening Restoranim" --owner restoran_admin
    python manage.py create_restaurant --name "..." --owner ... --password "..." --tables 12 --no-default
    python manage.py create_restaurant --name "Bahor" --owner bahor_ega --subdomain bahor --business-type cafe   # multi-tenant

Qayta ishga tushirilsa mavjud restoran o'chirilmaydi va qayta yaratilmaydi — yetishmayotgan stollar qo'shiladi.
"""
import secrets

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from accounts.models import AdminUser
from notifications.models import AppSetting
from shops.models import Shop
from shops.tenancy import normalize_subdomain, slug_to_subdomain, subdomain_problem, tenant_base_url
from tables_restaurant.models import Hall, Table


class Command(BaseCommand):
    help = "Yangi restoran: egasi (login/parol), zal va stollar bilan"

    def add_arguments(self, parser):
        parser.add_argument('--name', required=True, help="Restoran nomi")
        parser.add_argument('--slug', default='', help="URL nomi (bo'sh bo'lsa nomidan yasaladi)")
        parser.add_argument('--owner', required=True, help="Egasining login nomi")
        parser.add_argument('--password', default='', help="Parol (bo'sh bo'lsa xavfsiz parol yaratiladi va ko'rsatiladi)")
        parser.add_argument('--phone', default='+998900000000')
        parser.add_argument('--address', default='Guliston')
        parser.add_argument('--hall', default='Asosiy Zal', help="Zal nomi")
        parser.add_argument('--tables', type=int, default=10, help="Stollar soni (1..200)")
        parser.add_argument('--no-default', action='store_true',
                            help="Mehmon menyusining asosiy restorani qilib belgilamaslik")
        parser.add_argument('--subdomain', default='',
                            help="Multi-tenant: mijoz.<PLATFORM_DOMAIN> (3-40 belgi: kichik harf, raqam, defis). "
                                 "Bo'sh bo'lsa slug'dan olinadi (yaroqli va band bo'lmasa)")
        parser.add_argument('--business-type', default='restaurant', choices=[c[0] for c in Shop.BUSINESS_TYPE_CHOICES],
                            help="Biznes turi: restaurant | cafe | banquet (standart: restaurant)")

    @transaction.atomic
    def handle(self, *args, **opts):
        name = opts['name'].strip()
        if not name:
            raise CommandError("Restoran nomi bo'sh bo'lmasligi kerak")
        tables_count = opts['tables']
        if not 1 <= tables_count <= 200:
            raise CommandError("Stollar soni 1 dan 200 gacha bo'lishi kerak")
        if opts['business_type'] not in dict(Shop.BUSINESS_TYPE_CHOICES):        # call_command() argparse choices'ni tekshirmaydi
            raise CommandError(f"--business-type: {', '.join(dict(Shop.BUSINESS_TYPE_CHOICES))} dan biri bo'lishi kerak")
        slug = (opts['slug'] or slugify(name, allow_unicode=False) or 'restoran').strip('-')
        subdomain = None
        if opts['subdomain']:
            subdomain = normalize_subdomain(opts['subdomain'])
            problem = subdomain_problem(subdomain)
            if problem:
                raise CommandError(f"--subdomain: {problem}")
        else:
            subdomain = slug_to_subdomain(slug)       # yaroqsiz yoki band bo'lsa keyinroq e'tiborsiz qoldiriladi (ogohlantirish bilan)

        # 1. Egasi
        owner = AdminUser.objects.filter(username=opts['owner']).first()
        password = opts['password']
        if owner:
            if owner.role not in ('shop_owner', 'shop_manager'):
                raise CommandError(f"'{owner.username}' akkaunti restoran egasi emas (role={owner.role})")
            if password:
                owner.set_password(password)
                owner.save(update_fields=['password'])
        else:
            if not password:
                password = secrets.token_urlsafe(9)
                self.stdout.write(self.style.WARNING(f"Parol avtomatik yaratildi: {password}  (saqlab qo'ying)"))
            owner = AdminUser.objects.create_user(
                username=opts['owner'], password=password, role='shop_owner',
                is_approved=True, phone=opts['phone'],
            )

        # 2. Restoran
        shop = Shop.objects.filter(slug=slug).first()
        created_shop = shop is None
        # Subdomen bandligi: aniq so'ralgan bo'lsa xato, slug'dan olingan bo'lsa jimgina o'tkazib yuboriladi
        taken = Shop.objects.filter(subdomain=subdomain).exclude(pk=getattr(shop, 'pk', None)).exists() if subdomain else False
        if taken and opts['subdomain']:
            raise CommandError(f"'{subdomain}' subdomeni band")
        if taken or (subdomain and not opts['subdomain'] and subdomain_problem(subdomain)):
            self.stdout.write(self.style.WARNING(f"Subdomen '{subdomain}' band yoki yaroqsiz — keyin /platform orqali bering"))
            subdomain = None
        if created_shop:
            shop = Shop.objects.create(
                name=name, slug=slug, owner=owner, address=opts['address'], phone=opts['phone'],
                latitude=40.4897, longitude=68.7842, is_open=True,
                subdomain=subdomain, business_type=opts['business_type'],
            )
        elif shop.owner_id and shop.owner_id != owner.pk:
            raise CommandError(f"'{slug}' restorani boshqa egaga tegishli")
        else:
            # Mavjud restoran: subdomen/turni faqat aniq so'ralganda yangilaymiz (o'zboshimchalik bilan o'zgartirilmaydi)
            changed = []
            if opts['subdomain'] and shop.subdomain != subdomain:
                shop.subdomain = subdomain
                changed.append('subdomain')
            if opts['business_type'] != 'restaurant' and shop.business_type != opts['business_type']:
                shop.business_type = opts['business_type']
                changed.append('business_type')
            if changed:
                shop.save(update_fields=changed)
        if owner.shop_id != shop.pk:
            owner.shop = shop
            owner.save(update_fields=['shop'])

        # 3. Zal va stollar (yetishmaganlari qo'shiladi)
        hall, _ = Hall.objects.get_or_create(shop=shop, name=opts['hall'])
        existing = set(Table.objects.filter(shop=shop).values_list('number', flat=True))
        new_tables = [
            Table(shop=shop, hall=hall, number=str(n), capacity=4, status='free')
            for n in range(1, tables_count + 1) if str(n) not in existing
        ]
        Table.objects.bulk_create(new_tables)

        # 4. Mehmon menyusining asosiy restorani (admin paneldagi "Sozlamalar"da o'zgartiriladi)
        if not opts['no_default']:
            AppSetting.objects.update_or_create(
                key='restaurant_default_shop',
                defaults={'value': shop.slug, 'category': 'restaurant',
                          'description': "Mehmon menyusi (/menu/) ko'rsatadigan restoran slug'i"},
            )

        self.stdout.write(self.style.SUCCESS(
            f"{'Yaratildi' if created_shop else 'Yangilandi'}: {shop.name} (slug={shop.slug}, id={shop.pk})"
        ))
        self.stdout.write(f"  Egasi: {owner.username} — kirish: /seller/login/")
        if shop.subdomain:
            url = tenant_base_url(shop) or f"https://{shop.subdomain}.<PLATFORM_DOMAIN>"
            self.stdout.write(f"  Subdomen: {shop.subdomain} ({shop.business_type}) — manzil: {url}/")
        self.stdout.write(f"  Stollar: {Table.objects.filter(shop=shop).count()} ta ({len(new_tables)} ta yangi), zal: {hall.name}")
        first_table = Table.objects.filter(shop=shop).order_by('id').first()
        qr_hint = first_table.qr_path if first_table else '/menu/'
        self.stdout.write(f"  Mehmon menyusi (1-stol QR havolasi): {qr_hint}" + ("" if not opts['no_default'] else "  (asosiy qilinmadi)"))
