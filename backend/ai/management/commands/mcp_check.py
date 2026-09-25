"""V12 — barcha MCP provayderlarni ping qilish, circuit breaker'ni o'zi tiklaydi.
Kalit qo'yilgach: python manage.py mcp_check  → bir necha soniyada hammasi aniqlanadi.
Cron/celery har 10 daqiqada: mcp_check (kaliti borlar sog'lomligini nazorat qiladi)."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "MCP provayderlarni ping qilib, circuit holatini avtomatik tiklaydi"

    def add_arguments(self, parser):
        parser.add_argument('--quiet', action='store_true', help='faqat xatolarni chiqarish')

    def handle(self, *args, **options):
        from ai.mcp.router import router
        results = router.check_all()
        ok_n = sum(1 for r in results if r['status'] == 'ok')
        for r in results:
            if r['status'] == 'no_key':
                if not options['quiet']:
                    self.stdout.write(f"⚪ {r['provider']:<10} — kalit yo'q (o'tkazib yuborildi)")
            elif r['status'] == 'ok':
                if not options['quiet']:
                    self.stdout.write(self.style.SUCCESS(f"🟢 {r['provider']:<10} — OK ({r.get('latency_ms', 0)} ms)"))
            else:
                self.stdout.write(self.style.ERROR(f"🔴 {r['provider']:<10} — {r.get('error', '')[:80]}"))
        self.stdout.write(self.style.MIGRATE_HEADING(f"Natija: {ok_n}/{len(results)} provayder ishlayapti"))
