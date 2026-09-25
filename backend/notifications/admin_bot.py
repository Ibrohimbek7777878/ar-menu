"""
Telegram bot — admin panel bo'limi.

Adminlar botda quyidagi buyruqlarni ishlatadi:
  /admin  /panel  → Statistika + menyular
  /stats          → Qisqa statistika
  /orders         → So'nggi 5 ta buyurtma
  /help           → Yordam (admin bo'limi bilan)

Admin aniqlash:
  • .env dagi TELEGRAM_ADMIN_CHAT_IDS (vergul bilan) yoki TELEGRAM_CHAT_ID
  • AdminUser.telegram_username == chat username (TelegramSubscriber orqali chat_id)

Yangi buyurtma bo'lganda barcha admin chatlariga xabar ketadi (signals).
"""
import logging

from django.conf import settings
from django.db.models import Avg, Sum
from django.utils import timezone

from datetime import timedelta

from accounts.models import AdminUser
from notifications.models import TelegramSubscriber
from notifications.telegram_bot import send_message

logger = logging.getLogger(__name__)

STATUS_UZ = {
    'pending': ('🟡 Kutilmoqda', 'pending'),
    'confirmed': ('🔵 Tasdiqlangan', 'confirmed'),
    'preparing': ('🟣 Tayyorlanmoqda', 'preparing'),
    'ready': ('🩵 Tayyor', 'ready'),
    'out_for_delivery': ('🟤 Yetkazilmoqda', 'out_for_delivery'),
    'delivered': ('🟢 Yetkazilgan', 'delivered'),
    'cancelled': ('🔴 Bekor qilingan', 'cancelled'),
    'failed': ('❌ Muvaffaqiyatsiz', 'failed'),
}


def _fmt_sum(value):
    try:
        return f"{int(value):,}".replace(',', ' ')
    except (TypeError, ValueError):
        return str(value)


def get_admin_chat_ids():
    """Barcha admin chat_id lar: env + AdminUser.telegram_username mosligi."""
    ids = []
    raw = getattr(settings, 'TELEGRAM_ADMIN_CHAT_IDS', '') or ''
    for part in raw.split(','):
        part = part.strip()
        if part and part not in ids:
            ids.append(part)
    legacy = str(getattr(settings, 'TELEGRAM_CHAT_ID', '') or '').strip()
    if legacy and legacy not in ids and legacy.lower() != 'none':
        ids.append(legacy)
    usernames = list(
        AdminUser.objects.filter(is_active=True)
        .exclude(telegram_username='')
        .values_list('telegram_username', flat=True)
    )
    usernames = [u.lstrip('@').lower() for u in usernames]
    if usernames:
        subs = TelegramSubscriber.objects.filter(is_active=True, username__in=usernames)
        for s in subs:
            if s.chat_id not in ids:
                ids.append(s.chat_id)
    return ids


def is_admin(chat_id, username=''):
    """Bu chat adminnikimi?"""
    if str(chat_id) in [str(i) for i in get_admin_chat_ids()]:
        return True
    uname = (username or '').lstrip('@').lower()
    if uname:
        return AdminUser.objects.filter(
            is_active=True, telegram_username__icontains=uname,
        ).exists()
    return False


def build_stats_text():
    """Dashboard statistikasi (admin panel bilan bir xil ko'rsatkichlar)."""
    from orders.models import Order
    from products.models import Product
    from shops.models import Shop
    from accounts.models import Customer

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    live = Order.objects.exclude(status__in=['cancelled', 'failed'])

    today_rev = live.filter(created_at__gte=today_start).aggregate(s=Sum('final_amount'))['s'] or 0
    week_rev = live.filter(created_at__gte=week_start).aggregate(s=Sum('final_amount'))['s'] or 0
    today_cnt = Order.objects.filter(created_at__gte=today_start).count()
    avg_rating = Product.objects.aggregate(a=Avg('rating'))['a'] or 0
    tg_subs = TelegramSubscriber.objects.filter(is_active=True).count()

    return (
        "📊 <b>Online Store Guliston — Admin</b>\n\n"
        f"🏬 Do'konlar: <b>{Shop.objects.count()}</b>\n"
        f"📦 Mahsulotlar: <b>{Product.objects.count()}</b>\n"
        f"🧾 Buyurtmalar: <b>{Order.objects.count()}</b>\n"
        f"👥 Mijozlar: <b>{Customer.objects.count()}</b>\n\n"
        f"💰 <b>Bugun:</b> {_fmt_sum(today_rev)} so'm ({today_cnt} ta)\n"
        f"📈 <b>Bu hafta:</b> {_fmt_sum(week_rev)} so'm\n"
        f"⭐ O'rtacha reyting: <b>{round(avg_rating, 1)}</b>\n"
        f"✈️ TG obunachilar: <b>{tg_subs}</b>\n\n"
        "<i>Buyruqlar: /orders — so'nggi buyurtmalar, /stats — statistika</i>"
    )


def build_recent_orders_text(limit=5):
    """So'nggi buyurtmalar ro'yxati."""
    from orders.models import Order

    orders = Order.objects.select_related('shop').order_by('-created_at')[:limit]
    if not orders:
        return "🧾 Hozircha buyurtmalar yo'q."
    lines = ["🧾 <b>So'nggi buyurtmalar</b>\n"]
    for o in orders:
        emoji = STATUS_UZ.get(o.status, ('⚪️ ' + o.status, o.status))[0]
        lines.append(
            f"{emoji} <b>{o.order_number}</b> — {o.customer_name}\n"
            f"   🏬 {o.shop.name} | 💰 {_fmt_sum(o.final_amount)} so'm\n"
            f"   🕒 {timezone.localtime(o.created_at).strftime('%d.%m.%Y %H:%M')}"
        )
    return "\n\n".join(lines)


def notify_new_order(order):
    """Yangi buyurtma → barcha admin chatlariga xabar."""
    emoji = STATUS_UZ.get(order.status, ('⚪️', order.status))[0]
    text = (
        "🔔 <b>Yangi buyurtma!</b>\n\n"
        f"🧾 Raqam: <b>{order.order_number}</b>\n"
        f"👤 Mijoz: {order.customer_name}\n"
        f"📞 Tel: {getattr(order, 'customer_phone', '') or '-'}\n"
        f"🏬 Do'kon: {order.shop.name}\n"
        f"💰 Summa: <b>{_fmt_sum(order.final_amount)} so'm</b>\n"
        f"{emoji} Holat: {STATUS_UZ.get(order.status, ('-' , order.status))[0]}\n\n"
        f"Batafsil: /orders"
    )
    sent = 0
    for chat_id in get_admin_chat_ids():
        if send_message(chat_id, text):
            sent += 1
    return sent


def handle_admin_command(text, chat_id, username=''):
    """
    Admin buyrug'ini bajaradi. Qaytaradi: True — ushlandi (webhook javob berdi),
    False — bu admin emas yoki buyruq adminlikka tegishli emas.
    """
    t = (text or '').strip().split('@')[0].lower()
    admin_commands = ('/admin', '/panel', '/stats', '/orders')

    if not t.startswith(admin_commands):
        return False

    if not is_admin(chat_id, username):
        send_message(
            chat_id,
            "⛔️ Bu buyruq faqat adminlar uchun.\n"
            "Agar admin bo'lsangiz, profilingizga Telegram username qo'shing "
            "(admin panel → Profil) yoki ADMIN_CHAT_IDS ni .env ga yozing.",
        )
        return True

    if t in ('/admin', '/panel', '/stats'):
        send_message(chat_id, build_stats_text())
    elif t == '/orders':
        send_message(chat_id, build_recent_orders_text())
    return True
