"""V12 — MCP provayderlar holati jadvali.
Ishga tushirish: python manage.py mcp_status
Kalitlar .env da bo'lsa avtomatik ko'rinadi; kalitsiz provayder ham xato BO'LMAYDI."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "8 ta AI provayder (MCP) holati: kalit, circuit, bugungi xarajat"

    def handle(self, *args, **options):
        from ai.mcp.router import router
        rows = router.providers_status()
        self.stdout.write(self.style.MIGRATE_HEADING('MCP PROVAYDERLAR HOLATI (V12)'))
        self.stdout.write(f"{'Provayder':<10} {'Model':<24} {'Kalit':<7} {'Circuit':<9} {'Xato':<5} {'Bugun':<6} {'$ bugun'}")
        total = 0.0
        for r in rows:
            key_state = '✓ bor' if r['configured'] else '— yo\u2019q'
            circuit = '🔴 ochiq' if r['circuit_open'] else '🟢 yopiq'
            total += r['cost_today']
            self.stdout.write(
                f"{r['name']:<10} {r['model']:<24} {key_state:<7} {circuit:<9} "
                f"{r['errors_today']:<5} {r['calls_today']:<6} ${r['cost_today']}"
            )
        self.stdout.write(f"\nJami bugungi xarajat: ${round(total, 4)} | Byudjet: env MCP_DAILY_BUDGET")
        ok = [r['name'] for r in rows if r['configured'] and not r['circuit_open']]
        self.stdout.write(self.style.SUCCESS(
            f"Tayyor provayderlar: {len(ok)}/{len(rows)} — {', '.join(ok) if ok else 'hech biri (kalitlar .env ga qo\u2019yilishi kerak)'}"
        ))
