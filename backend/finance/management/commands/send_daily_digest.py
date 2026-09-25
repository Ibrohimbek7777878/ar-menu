"""
Har kuni kechqurun (masalan soat 23:00 da) do'kon egalari va ma'murlariga
kunlik kassa, naqd/plastik tushum, xarajatlar va qarzlar xulosasini
Telegram orqali avtomatik jo'natuvchi buyruq.

Ishlatish:
    python manage.py send_daily_digest
    python manage.py send_daily_digest --shop-id=1
"""
import logging
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum
from django.conf import settings
from shops.models import Shop
from finance.models import FinanceTransaction, DebtRecord
from notifications.services.telegram_service import _send_message

logger = logging.getLogger('finance')


class Command(BaseCommand):
    help = "Barcha faol do'konlar uchun kunlik kassa hisobotini Telegram orqali jo'natish"

    def add_arguments(self, parser):
        parser.add_argument('--shop-id', type=int, default=None, help="Muayyan do'kon ID si")

    def handle(self, *args, **options):
        shop_id = options.get('shop_id')
        today_date = timezone.localdate()

        shops = Shop.objects.all()
        if shop_id:
            shops = shops.filter(id=shop_id)

        count = 0
        self.stdout.write(f"📊 Kunlik Telegram hisoboti boshlanmoqda: {today_date}")

        for shop in shops:
            try:
                tx_today = FinanceTransaction.objects.filter(shop=shop, tx_date=today_date, is_cancelled=False)
                inc_tot = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                inc_c = tx_today.filter(tx_type='income', payment_method='cash', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                inc_k = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
                exp_tot = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                exp_c = tx_today.filter(tx_type='expense', payment_method='cash', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                exp_k = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
                net_prof = inc_tot - exp_tot
                net_c = inc_c - exp_c
                net_k = inc_k - exp_k

                debts_qs = DebtRecord.objects.filter(shop=shop).exclude(status='settled')
                cust_d = debts_qs.filter(debt_type='customer').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')
                supp_d = debts_qs.filter(debt_type='supplier').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')

                report_text = (
                    f"📊 <b>{shop.name} — KUNLIK KASSA HISOBOTI ({today_date.strftime('%d.%m.%Y')})</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"🟢 <b>Kassa Kirimi:</b> {int(inc_tot):,} so'm\n"
                    f"   • 💵 Naqd: {int(inc_c):,} so'm\n"
                    f"   • 💳 Plastik: {int(inc_k):,} so'm\n\n"
                    f"🔴 <b>Kassa Chiqimi:</b> {int(exp_tot):,} so'm\n"
                    f"   • 💵 Naqd: {int(exp_c):,} so'm\n"
                    f"   • 💳 Plastik: {int(exp_k):,} so'm\n\n"
                    f"💎 <b>Sof Kassa (Foyda):</b> {int(net_prof):,} so'm\n"
                    f"   • 💵 Naqd qoldiq: {int(net_c):,} so'm\n"
                    f"   • 💳 Plastik hisob: {int(net_k):,} so'm\n\n"
                    f"🤝 <b>Nasiyalar Holati:</b>\n"
                    f"   • 📥 Bizga berishadi: {int(cust_d):,} so'm\n"
                    f"   • 📤 Biz beramiz: {int(supp_d):,} so'm\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"✅ <i>Universal Kassa & Moliya tizimi</i>"
                ).replace(",", " ")

                target_chat_ids = []
                if hasattr(shop, 'owner') and getattr(shop.owner, 'telegram_chat_id', None):
                    target_chat_ids.append(str(shop.owner.telegram_chat_id))

                default_chat = getattr(settings, 'TELEGRAM_CHAT_ID', '')
                if default_chat and str(default_chat) not in target_chat_ids:
                    target_chat_ids.append(str(default_chat))

                for cid in target_chat_ids:
                    res = _send_message(cid, report_text, parse_mode='HTML')
                    self.stdout.write(f"   [{shop.name}] -> {cid}: ok={res.get('success')}")

                count += 1
            except Exception as e:
                self.stderr.write(f"   [{shop.name}] Xatolik: {e}")
                logger.error(f"[DAILY_DIGEST_ERR] Shop #{shop.id} error: {e}", exc_info=True)

        self.stdout.write(self.style.SUCCESS(f"✅ {count} ta do'kon uchun kunlik hisobot yuborildi!"))
