"""V15: menyuni AI orqali ru/en ga tarjima qilish (kalit bo'lsa).
Ishlatish: python manage.py translate_menu <shop_slug>"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Do'kon mahsulot nomlarini AI orqali tarjima qilish (ingredients_translated)"

    def add_arguments(self, parser):
        parser.add_argument('shop_slug')

    def handle(self, *args, **options):
        from products.models import Product
        from ai.mcp.router import router
        import json
        qs = Product.objects.filter(shop__slug=options['shop_slug'])
        self.stdout.write(f"{qs.count()} ta mahsulot tarjima qilinmoqda...")
        done = 0
        for p in qs[:50]:
            if p.ingredients_translated:
                continue
            resp = router.run('translate', prompt=p.name, use_cache=True, max_tokens=200)
            if resp.ok:
                try:
                    p.ingredients_translated = json.loads(resp.content)
                except Exception:
                    p.ingredients_translated = {'ru': resp.content.strip()[:100]}
                p.save(update_fields=['ingredients_translated'])
                done += 1
            else:
                self.stdout.write(self.style.WARNING(f"  {p.name}: {resp.error[:60]}"))
        self.stdout.write(self.style.SUCCESS(f"Tarjima qilindi: {done} ta (kalitlar .env da bo'lishi kerak)"))
