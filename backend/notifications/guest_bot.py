"""
Mehmon boti: stolga bog'langan mehmon ofitsiantni botdan chaqirishi (TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_GUEST_API_VA_BOT_2026-11-02.md, B1).

Tugma `callback_data = "wc:<stol QR tokeni>"` (3 + 36 = 39 bayt, Telegram chegarasi 64). Token faqat `/start t_<token>`
orqali stolni QR/NFC bilan skanerlagan mehmonning chatida bo'ladi, ya'ni QR skanerlash bilan bir xil ruxsat. Soxta yoki aylantirilgan
(eski) token rad etiladi. Bitta stolga 60 soniyada 1 chaqiruv: botdan ham, saytdan ham ofitsiant spamlanmasin.
"""
import logging
import uuid

from django.core.cache import cache

from notifications.telegram_bot import answer_callback_query

logger = logging.getLogger(__name__)

CALL_PREFIX = 'wc:'
COOLDOWN_SECONDS = 60


def waiter_button(table_token):
    return {"text": "🛎 Ofitsiantni chaqirish", "callback_data": f"{CALL_PREFIX}{table_token}"}


def handle_guest_callback(data, cq_id=None):
    """`wc:` callback'ini bajaradi. Bu prefiks emas bo'lsa False (boshqa ishlovchi davom etadi), aks holda True."""
    if not str(data or '').startswith(CALL_PREFIX):
        return False
    try:
        token = uuid.UUID(data[len(CALL_PREFIX):].strip())
    except (ValueError, AttributeError):
        answer_callback_query(cq_id, "Stol aniqlanmadi. Stol ustidagi QR kodni qayta skanerlang.", show_alert=True)
        return True

    from tables_restaurant.models import ServiceCall, Table
    table = Table.objects.filter(qr_token=token, is_active=True).first()
    if table is None:
        answer_callback_query(cq_id, "Stol topilmadi. Stol ustidagi QR kodni qayta skanerlang.", show_alert=True)
        return True

    cooldown_key = f"tg_waiter_call:{table.id}"
    if not cache.add(cooldown_key, 1, COOLDOWN_SECONDS):
        answer_callback_query(cq_id, "⏳ Ofitsiant allaqachon chaqirilgan. Iltimos, biroz kuting.")
        return True
    try:
        # Sayt API'sidagi kabi: shu stol uchun javobsiz chaqiruv bo'lsa yangisi yaratilmaydi
        if ServiceCall.objects.filter(table=table, call_type='waiter', status='pending').exists():
            answer_callback_query(cq_id, "⏳ Ofitsiant allaqachon chaqirilgan. Iltimos, biroz kuting.")
            return True
        ServiceCall.objects.create(shop_id=table.shop_id, table=table, call_type='waiter',
                                   title='Ofitsiant chaqiruvi (Telegram)', status='pending')
    except Exception:
        logger.exception("Botdan ofitsiant chaqirishda xato (stol %s)", table.id)
        cache.delete(cooldown_key)
        answer_callback_query(cq_id, "Xatolik yuz berdi. Iltimos, ofitsiantni qo'l ko'tarib chaqiring.", show_alert=True)
        return True
    answer_callback_query(cq_id, f"🛎 Ofitsiant chaqirildi. Stol №{table.number}")
    return True
