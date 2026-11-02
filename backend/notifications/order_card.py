"""
Xodim boti: yangi buyurtma kartochkasi (TZ docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_GUEST_API_VA_BOT_2026-11-02.md, B2).

Ixcham: raqam va holat, xizmat turi (stol va zal / olib ketish / yetkazib berish), taomlar, to'lov holati, summa. Mijoz ismi va
telefoni faqat stolsiz buyurtmada (kuryer/qo'ng'iroq uchun kerak). Hamma foydalanuvchi matni `esc` orqali (HTML inyeksiya yo'q),
xabar Telegram chegarasidan (4096 belgi) oshmaydi.
"""
import re
from notifications.telegram_client import esc

MAX_ITEM_LINES = 12
MAX_TEXT_LENGTH = 3800  # Telegram 4096 belgi; havola va zaxira uchun qoldiriladi


def _som(value):
    return f"{int(value):,}".replace(',', ' ')


def _where_line(order):
    table = getattr(order, 'table', None)
    if table:
        hall = f" · {esc(table.hall.name)}" if getattr(table, 'hall', None) else ""
        return f"🍽 <b>Stol {esc(table.number)}</b>{hall}"
    if getattr(order, 'is_pickup', False):
        return "🥡 <b>Olib ketish</b>"
    address = esc(order.delivery_address) if getattr(order, 'delivery_address', '') else "manzil ko'rsatilmagan"
    return f"🚗 <b>Yetkazib berish</b> · {address}"


def _items_lines(order):
    rows = list(order.items.all())
    lines = [f" • {esc(it.product_name)} ×{it.quantity} — {_som(it.total)}" for it in rows[:MAX_ITEM_LINES]]
    if len(rows) > MAX_ITEM_LINES:
        lines.append(f" … yana {len(rows) - MAX_ITEM_LINES} ta taom")
    return "\n".join(lines)


def _guest_note(order):
    """Mehmon yozgan izoh (allergiya, "achchiq bo'lmasin"): oshxona/ofitsiant kartochkada ko'rishi shart. Texnik "TMA buyurtma (...)." prefiksisiz."""
    note = re.sub(r'^TMA buyurtma \([a-z_]+\)\.?\s*', '', (getattr(order, 'notes', '') or '').strip())
    return note[:300]


def order_card_text(order, link=''):
    from notifications.admin_bot import STATUS_UZ
    status = STATUS_UZ.get(order.status, ('⚪️ ' + str(order.status), order.status))[0]
    parts = [
        f"🔔 <b>Yangi buyurtma #{esc(order.order_number)}</b> · {status}",
        _where_line(order),
        "",
        _items_lines(order) or " (taomlar ko'rsatilmagan)",
        "",
        *([f"📝 <b>Izoh:</b> {esc(_guest_note(order))}", ""] if _guest_note(order) else []),
        f"💳 {esc(order.get_payment_status_display())}",
    ]
    if not getattr(order, 'table', None) and getattr(order, 'delivery_fee', 0):
        parts.append(f"🚚 Yetkazish: {_som(order.delivery_fee)} so'm")
    parts.append(f"💰 <b>{_som(order.final_amount)} so'm</b>")
    # Mijoz: ism har doim (ofitsiant stolda murojaat qilishi uchun), telefon faqat stolsiz buyurtmada (kuryer/qo'ng'iroq)
    fields = [esc(order.customer_name or '')]
    if not getattr(order, 'table', None):
        fields.append(esc(order.customer_phone_1 or ''))
    who = " · ".join(x for x in fields if x)
    if who:
        parts.append(f"👤 {who}")
    text = "\n".join(parts)
    if len(text) > MAX_TEXT_LENGTH:
        text = text[:MAX_TEXT_LENGTH].rsplit("\n", 1)[0] + "\n …"
    return text + link
