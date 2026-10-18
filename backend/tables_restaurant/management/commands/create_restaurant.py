"""
Yangi restoranni bitta buyruq bilan ochish: restoran, egasining akkaunti, zal va stollar.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (1-qadam)

Ishlatish:
    python manage.py create_restaurant --name "Mening Restoranim" --owner restoran_admin
    python manage.py create_restaurant --name "..." --owner ... --password "..." --tables 12 --no-default

Qayta ishga tushirilsa mavjud restoran o'chirilmaydi va qayta yaratilmaydi — yetishmayotgan stollar qo'shiladi.
"""
import secrets

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from accounts.models import AdminUser
from notifications.models import AppSetting
from shops.models import Shop
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

    @transaction.atomic
    def handle(self, *args, **opts):
        name = opts['name'].strip()
        if not name:
            raise CommandError("Restoran nomi bo'sh bo'lmasligi kerak")
        tables_count = opts['tables']
        if not 1 <= tables_count <= 200:
            raise CommandError("Stollar soni 1 dan 200 gacha bo'lishi kerak")
        slug = (opts['slug'] or slugify(name, allow_unicode=False) or 'restoran').strip('-')

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
        if created_shop:
            shop = Shop.objects.create(
                name=name, slug=slug, owner=owner, address=opts['address'], phone=opts['phone'],
                latitude=40.4897, longitude=68.7842, is_open=True,
            )
        elif shop.owner_id and shop.owner_id != owner.pk:
            raise CommandError(f"'{slug}' restorani boshqa egaga tegishli")
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
        self.stdout.write(f"  Stollar: {Table.objects.filter(shop=shop).count()} ta ({len(new_tables)} ta yangi), zal: {hall.name}")
        self.stdout.write(f"  Mehmon menyusi: /menu/?table=1" + ("" if not opts['no_default'] else "  (asosiy qilinmadi)"))
