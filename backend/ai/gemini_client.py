"""
Bulut AI (Gemini) mijozi uchun joy (TZ: R3-2).

Moliya yordamchisi (`finance/services/ai_copilot.py`) avval mavjud bo'lmagan `ai.gemini_client` ni import qilardi:
import har safar yiqilib, xato "Gemini fallback" deb jimgina yutilardi. Endi modul bor va o'z holatini aniq aytadi.

Egasining qarori: hozircha AI yo'q — moliya matni lokal qoidalar bilan tahlil qilinadi. Bulut AI yoqilishi
(Q6, ma'lumot uchinchi tomonga ketishini qabul qilish) va bu yerda `ask_gemini_json` yozilishi kerak.
"""
from django.conf import settings


class CloudAINotConfigured(RuntimeError):
    """Bulut AI ulanmagan: chaqiruvchi lokal (qoidaga asoslangan) tahlilga o'tadi."""


def ask_gemini_json(prompt):
    if not getattr(settings, 'GEMINI_API_KEY', ''):
        raise CloudAINotConfigured("GEMINI_API_KEY sozlanmagan — lokal tahlil ishlatiladi")
    raise CloudAINotConfigured("Gemini mijozi hali yozilmagan (egasi qarori Q6 kutilmoqda)")
