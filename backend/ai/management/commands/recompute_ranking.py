"""Do'kon/mahsulot reytingini qayta hisoblash."""
from django.core.management.base import BaseCommand

from ai.tasks import recompute_ranking


class Command(BaseCommand):
    help = 'AI reyting algoritmini ishga tushiradi (tashrif + sotuv + sharh).'

    def handle(self, *args, **options):
        self.stdout.write('Reyting hisoblanmoqda...')
        result = recompute_ranking()
        self.stdout.write(
            self.style.SUCCESS(
                f"Tayyor. Do'konlar: {result['shops']}, Mahsulotlar: {result['products']}"
            )
        )
