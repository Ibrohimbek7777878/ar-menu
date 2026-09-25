import re
import json
import logging
from decimal import Decimal
from django.utils import timezone
from finance.models import FinanceCategory, FinanceTransaction, DebtRecord
from finance.services.defaults import seed_default_categories_for_shop

logger = logging.getLogger(__name__)

def parse_uzbek_amount(text):
    """
    O'zbekcha matndagi sonlarni raqamga aylantirish.
    Qo'llab-quvvatlanadi:
    - 20mln, 20 mln, 8mlni, 1.5 mln, 20 million
    - 1 250 ming, 250 ming, 1 250mingi, 50k
    - 15 000 000, 20 000 000, 1 250 000, 8 000 000 (probel bilan ajratilgan)
    - 15000000, 45000 (oddiy sonlar)
    """
    if not text:
        return 0
    text = text.lower().replace(',', '.')

    # 1. mln / million qidirish (masalan: 20mln, 8mlni, 1.5 mln, 20 million)
    mln_match = re.search(r'((?:\d[\d\s\.]*\d|\d))\s*(?:mln|million)', text)
    # 2. ming / k qidirish (masalan: 1 250 ming, 250 ming, 1 250mingi, 50k)
    ming_match = re.search(r'((?:\d[\d\s\.]*\d|\d))\s*(?:ming|k\b)', text)

    total = 0
    if mln_match:
        val_str = mln_match.group(1).replace(' ', '')
        try:
            total += float(val_str) * 1_000_000
        except ValueError:
            pass

    if ming_match:
        val_str = ming_match.group(1).replace(' ', '')
        try:
            total += float(val_str) * 1_000
        except ValueError:
            pass

    if total > 0:
        return total

    # 3. Probel bilan ajratilgan to'liq raqam (masalan: 15 000 000, 1 250 000, 350 000)
    space_num_match = re.search(r'\b(\d{1,3}(?:\s\d{3})+)\b', text)
    if space_num_match:
        cleaned = space_num_match.group(1).replace(' ', '')
        try:
            return float(cleaned)
        except ValueError:
            pass

    # 4. Standart oddiy raqam (masalan, 250000, 45000)
    raw_match = re.search(r'\b(\d{4,})\b', text)
    if raw_match:
        try:
            return float(raw_match.group(1))
        except ValueError:
            pass

    return 0

def process_finance_ai_query(shop, raw_text, user=None):
    """
    Tadbirkor yozgan yoki gapirgan o'zbekcha matnni tahlil qilib,
    avtomatik ravishda moliya operatsiyalarini (kirim/chiqim) yaratish.
    """
    seed_default_categories_for_shop(shop)
    categories = list(FinanceCategory.objects.filter(shop=shop))
    
    # Try Gemini API if available
    gemini_result = None
    try:
        from ai.gemini_client import ask_gemini_json
        prompt = f"""
        Sen O'zbekiston kafelari, to'yxonalari va restoranlari uchun aqlli moliya buxgalterisan.
        Foydalanuvchi kundalik kassa, tushum va xarajatlarini oddiy o'zbek tilida yozgan:
        "{raw_text}"

        Mavjud kategoriyalar: {[c.name for c in categories]}

        Quyidagi JSON formatida javob qaytar:
        {{
            "transactions": [
                {{
                    "type": "income" yoki "expense",
                    "amount": 1000000,
                    "category": "Kategoriya nomi",
                    "title": "Qisqa nomi (masalan: 30 kg go'sht)",
                    "notes": "Qo'shimcha"
                }}
            ],
            "debts": [
                {{
                    "person_name": "Ism",
                    "amount": 500000,
                    "debt_type": "customer" yoki "supplier",
                    "notes": "Nasiya izohi"
                }}
            ],
            "summary_uz": "O'zbekcha xushmuomala xulosa"
        }}
        Faqat toza JSON qaytar.
        """
        res = ask_gemini_json(prompt)
        if isinstance(res, dict) and 'transactions' in res:
            gemini_result = res
    except Exception as e:
        logger.warning(f"Gemini finance parsing fallback to local: {e}")

    # Fallback / Local Rule-based parser
    created_txs = []
    total_income = Decimal('0')
    total_expense = Decimal('0')

    if gemini_result and gemini_result.get('transactions'):
        for item in gemini_result['transactions']:
            amt = Decimal(str(item.get('amount', 0)))
            if amt <= 0:
                continue
            tx_type = 'income' if item.get('type') == 'income' else 'expense'
            cat_name = item.get('category', '').lower()
            
            # Find category
            cat = None
            for c in categories:
                if c.name.lower() in cat_name or cat_name in c.name.lower():
                    cat = c
                    break
            if not cat:
                cat = next((c for c in categories if c.category_type == tx_type), None)
                
            tx = FinanceTransaction.objects.create(
                shop=shop, category=cat, tx_type=tx_type, amount=amt,
                title=item.get('title', 'Kiritilgan operatsiya'),
                notes=item.get('notes', ''), created_by=user,
                tx_date=timezone.localdate()
            )
            created_txs.append(tx)
            if tx_type == 'income':
                total_income += amt
            else:
                total_expense += amt
                
        summary_text = gemini_result.get('summary_uz') or ""
    else:
        # Regex split lines / commas
        chunks = re.split(r'[,;\n\.\+]|\s+va\s+', raw_text)
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk or len(chunk) < 3:
                continue
            amt = parse_uzbek_amount(chunk)
            if amt <= 0:
                continue
            amt_dec = Decimal(str(int(amt)))
            
            low = chunk.lower()
            # Determine type
            is_income = any(w in low for w in ['kassa', 'tushum', 'savdo', 'kirdi', 'daromad', 'to\'lov', 'sarmoya', 'invest', 'foyda', 'olgan', 'oldik'])
            if any(w in low for w in ['ijara', 'ijaraga', 'berdim', 'berdik', 'to\'ladim', 'to\'ladik', 'chiqdi', 'ketdi', 'keti', 'xarajat', 'go\'sht', 'sabzavot', 'piyoz', 'un', 'yog\'']):
                is_income = False
            tx_type = 'income' if is_income else 'expense'

            # Find matching category
            matched_cat = None
            if 'ijara' in low:
                matched_cat = next((c for c in categories if 'ijara' in c.name.lower()), None)
            elif 'sarmoya' in low:
                matched_cat = next((c for c in categories if 'sarmoya' in c.name.lower()), None)

            if not matched_cat:
                for c in categories:
                    for word in c.name.lower().split():
                        if len(word) > 3 and word in low:
                            matched_cat = c
                            break
                    if matched_cat:
                        break
            if not matched_cat:
                matched_cat = next((c for c in categories if c.category_type == tx_type), None)
                
            tx = FinanceTransaction.objects.create(
                shop=shop, category=matched_cat, tx_type=tx_type,
                amount=amt_dec, title=chunk[:100], created_by=user,
                tx_date=timezone.localdate()
            )
            created_txs.append(tx)
            if tx_type == 'income':
                total_income += amt_dec
            else:
                total_expense += amt_dec

    net_profit = total_income - total_expense
    
    def fmt_space(val):
        return f"{int(val):,}".replace(",", " ")

    response_msg = f"✅ <b>{len(created_txs)} ta operatsiya</b> hisob-kitob daftaringizga yozildi!\n\n"
    response_msg += f"🟢 <b>Kirim (Kassa):</b> {fmt_space(total_income)} so'm\n"
    response_msg += f"🔴 <b>Chiqim (Xarajatlar):</b> {fmt_space(total_expense)} so'm\n"
    response_msg += f"👑 <b>Bugungi sof qoldiq (Foyda):</b> {fmt_space(net_profit)} so'm\n"

    return {
        'success': True,
        'created_count': len(created_txs),
        'total_income': float(total_income),
        'total_expense': float(total_expense),
        'net_profit': float(net_profit),
        'message': response_msg
    }
