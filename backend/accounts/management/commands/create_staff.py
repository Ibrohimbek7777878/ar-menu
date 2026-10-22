"""
Restoran xodimi (ofitsiant, oshpaz, hostess, menejer) yaratish yoki yangilash.

    python manage.py create_staff --shop oshxona --username ali --role kitchen
    python manage.py create_staff --shop oshxona --username zarina --role hostess --name "Zarina Karimova" --password '...'
    python manage.py create_staff --shop oshxona --username ali --role waiter --update    # parolni qayta tiklash / rolni almashtirish

Parol berilmasa xavfsiz parol yaratiladi va BIR MARTA ko'rsatiladi. Xodim login + parol bilan /admin/login/ dan
kiradi va roliga mos sahifaga tushadi (oshpaz — /kds/, hostess — /arrival/desk/, ofitsiant — ofitsiant paneli).
"""
from django.core.management.base import BaseCommand, CommandError

from accounts.staff_admin import CREATABLE_ROLES, StaffError, create_staff
from shops.models import Shop


class Command(BaseCommand):
    help = "Restoran xodimini yaratish (login + parol + rol + restoran)"

    def add_arguments(self, parser):
        parser.add_argument('--shop', required=True, help="Restoran slug'i")
        parser.add_argument('--username', required=True)
        parser.add_argument('--role', required=True, choices=CREATABLE_ROLES)
        parser.add_argument('--password', default='', help="Bo'sh bo'lsa xavfsiz parol yaratiladi")
        parser.add_argument('--name', default='', help="To'liq ism")
        parser.add_argument('--phone', default='')
        parser.add_argument('--update', action='store_true', help="Mavjud xodimni yangilash (parol, rol)")

    def handle(self, *args, **opts):
        shop = Shop.objects.filter(slug=opts['shop']).first()
        if not shop:
            raise CommandError(f"Restoran topilmadi: {opts['shop']}")
        try:
            user, generated = create_staff(shop, opts['username'], opts['role'], password=opts['password'],
                                           full_name=opts['name'], phone=opts['phone'], update=opts['update'])
        except StaffError as exc:
            raise CommandError(str(exc)) from None
        self.stdout.write(self.style.SUCCESS(f"Tayyor: {user.username} ({user.get_role_display()}) — {shop.name}"))
        if generated:
            self.stdout.write(self.style.WARNING(f"Parol: {generated}   (faqat hozir ko'rsatiladi, saqlab qo'ying)"))
