"""
Xodimni bloklash / blokdan chiqarish. Akkaunt o'chirilmaydi (tarixi va auditi saqlanadi); ochiq sessiyalar tugatiladi.

    python manage.py block_staff --username ali
    python manage.py block_staff --username ali --unblock
"""
from django.core.management.base import BaseCommand, CommandError

from accounts.staff_admin import StaffError, block_staff


class Command(BaseCommand):
    help = "Xodimni bloklash yoki blokdan chiqarish"

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--unblock', action='store_true')

    def handle(self, *args, **opts):
        try:
            user, ended = block_staff(opts['username'], unblock=opts['unblock'])
        except StaffError as exc:
            raise CommandError(str(exc)) from None
        if opts['unblock']:
            self.stdout.write(self.style.SUCCESS(f"{user.username} blokdan chiqarildi"))
        else:
            self.stdout.write(self.style.SUCCESS(f"{user.username} bloklandi ({ended} ta ochiq sessiya tugatildi)"))
