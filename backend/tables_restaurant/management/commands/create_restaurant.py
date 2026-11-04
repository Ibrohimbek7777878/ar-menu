"""
Yangi restoranni bitta buyruq bilan ochish: restoran, egasining akkaunti, zal va stollar.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (1-qadam)

Ishlatish:
    python manage.py create_restaurant --name "Mening Restoranim" --owner restoran_admin
    python manage.py create_restaurant --name "..." --owner ... --password "..." --tables 12 --no-default
    python manage.py create_restaurant --name "Bahor" --owner bahor_ega --subdomain bahor --business-type cafe   # multi-tenant

Qayta ishga tushirilsa mavjud restoran o'chirilmaydi va qayta yaratilmaydi — yetishmayotgan stollar qo'shiladi.
Mantiq `tables_restaurant/provisioning.py` da (platforma API ham shuni chaqiradi).
"""
from django.core.management.base import BaseCommand, CommandError

from shops.models import Shop
from shops.tenancy import tenant_base_url
from tables_restaurant.models import Table
from tables_restaurant.provisioning import ProvisionError, provision_restaurant


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

    def handle(self, *args, **opts):
        try:
            result = provision_restaurant(
                name=opts['name'], owner_username=opts['owner'], password=opts['password'], slug=opts['slug'],
                phone=opts['phone'], address=opts['address'], hall_name=opts['hall'], tables=opts['tables'],
                subdomain=opts['subdomain'], business_type=opts['business_type'],
                make_default=not opts['no_default'], allow_existing=True,
            )
        except ProvisionError as exc:
            prefix = '--subdomain: ' if exc.code == 'subdomain_invalid' else ('--business-type: ' if exc.field == 'business_type' else '')
            raise CommandError(f"{prefix}{exc.message}") from None
        shop, owner = result.shop, result.owner
        if result.generated_password:
            self.stdout.write(self.style.WARNING(f"Parol avtomatik yaratildi: {result.generated_password}  (saqlab qo'ying)"))
        for warning in result.warnings:
            self.stdout.write(self.style.WARNING(warning))

        self.stdout.write(self.style.SUCCESS(
            f"{'Yaratildi' if result.created_shop else 'Yangilandi'}: {shop.name} (slug={shop.slug}, id={shop.pk})"
        ))
        self.stdout.write(f"  Egasi: {owner.username} — kirish: /seller/login/")
        if shop.subdomain:
            url = tenant_base_url(shop) or f"https://{shop.subdomain}.<PLATFORM_DOMAIN>"
            self.stdout.write(f"  Subdomen: {shop.subdomain} ({shop.business_type}) — manzil: {url}/")
        self.stdout.write(f"  Stollar: {result.tables_total} ta ({result.new_tables} ta yangi), zal: {result.hall.name}")
        first_table = Table.objects.filter(shop=shop).order_by('id').first()
        qr_hint = first_table.qr_path if first_table else '/menu/'
        self.stdout.write(f"  Mehmon menyusi (1-stol QR havolasi): {qr_hint}" + ("" if not opts['no_default'] else "  (asosiy qilinmadi)"))
