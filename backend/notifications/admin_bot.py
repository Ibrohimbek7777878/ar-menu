import logging
import re
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Q, Sum
from django.utils import timezone

from accounts.models import AdminUser
from notifications.models import TelegramSubscriber
from notifications.telegram_bot import send_message, edit_message_text, edit_message_reply_markup, answer_callback_query
from notifications.telegram_client import esc
from tables_restaurant.models import Table, NFCCard
from shops.models import Shop
from orders.models import Order

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


def _table_sort_key(tbl):
    try:
        return (0, int(tbl.number))
    except (ValueError, TypeError):
        return (1, str(tbl.number))


def _env_admin_chat_ids():
    """Server egasi (platforma) belgilagan chatlar: TELEGRAM_ADMIN_CHAT_IDS va eski TELEGRAM_CHAT_ID (.env)."""
    ids = []
    raw = getattr(settings, 'TELEGRAM_ADMIN_CHAT_IDS', '') or ''
    for part in raw.split(','):
        part = part.strip()
        if part and part not in ids:
            ids.append(part)
    legacy = str(getattr(settings, 'TELEGRAM_CHAT_ID', '') or '').strip()
    if legacy and legacy not in ids and legacy.lower() != 'none':
        ids.append(legacy)
    return ids


def get_admin_chat_ids():
    """
    Platforma adminlarining chat_id lari (faqat XABAR YUBORISH uchun): env + platforma admin (super_admin) akkauntlari.
    Avval bu yerga HAR QANDAY xodimning telegram_username'i mos kelgan obunachilar ham qo'shilardi — natijada
    do'kon A buyurtmalari (mijoz ismi, telefon, summa) do'kon B ofitsiantiga ham borardi.
    """
    ids = _env_admin_chat_ids()
    usernames = list(
        AdminUser.objects.filter(is_active=True)
        .filter(Q(role='super_admin') | Q(is_superuser=True))
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


class AdminScope:
    """
    Telegram chat nimalarni boshqara olishi.
      platform=True  — server egasi (.env chatlari): barcha do'konlar;
      platform=False — do'kon admini: faqat `shop_ids` ichidagi do'konlar (statistika, kassa, buyurtma, stol).
    """
    __slots__ = ('platform', 'shop_ids')

    def __init__(self, platform=False, shop_ids=()):
        self.platform = bool(platform)
        self.shop_ids = frozenset(shop_ids)

    def allows_shop(self, shop_id):
        return self.platform or (shop_id is not None and shop_id in self.shop_ids)

    def shop_filter(self):
        """Hisobot so'rovlari uchun: platforma — None (cheklovsiz), do'kon admini — do'kon id lari ro'yxati."""
        return None if self.platform else sorted(self.shop_ids)

    def primary_shop(self):
        """Buyruq (masalan /kassa, /stollar) qaysi do'kon uchun bajariladi."""
        if self.platform:
            return get_restaurant_shop()
        return Shop.objects.filter(id__in=self.shop_ids).order_by('id').first()

    def shops(self):
        """Hisobot beriladigan do'konlar: platforma — asosiy restoran, do'kon admini — o'z do'konlari."""
        if self.platform:
            shop = get_restaurant_shop()
            return [shop] if shop else []
        return list(Shop.objects.filter(id__in=self.shop_ids).order_by('id'))


def shops_bound_to_chat(chat_id):
    """Do'kon sozlamasida (business_profile.telegram_chat_id) shu chat_id ko'rsatilgan do'konlar."""
    cid = str(chat_id or '').strip()
    if not cid:
        return []
    lookup = Q(business_profile__telegram_chat_id=cid)
    if re.fullmatch(r'-?[0-9]+', cid):
        lookup |= Q(business_profile__telegram_chat_id=int(cid))   # eski yozuvlarda butun son bo'lishi mumkin
    return list(Shop.objects.filter(lookup).only('id', 'owner_id').order_by('id'))


def resolve_admin_scope(chat_id):
    """
    Chat_id bo'yicha admin huquqi (None — admin emas). Faqat Telegram o'zi bergan chat_id ga ishonamiz:
    Telegram username (soxta akkaunt ochish mumkin, AdminUser.username bilan tasodifan mos kelishi mumkin) hisobga olinmaydi.
    Bitta chat turli egalarning do'konlariga bog'langan bo'lsa (eski ma'lumot) — kimniki ekani noma'lum: huquq berilmaydi.
    """
    cid = str(chat_id or '').strip()
    if not cid:
        return None
    if cid in _env_admin_chat_ids():
        return AdminScope(platform=True)
    shops = shops_bound_to_chat(cid)
    if not shops:
        return None
    owners = {s.owner_id if s.owner_id is not None else f'shop-{s.pk}' for s in shops}
    if len(owners) > 1:
        logger.warning("Telegram chat %s bir necha egaga tegishli do'konlarga bog'langan — admin huquqi berilmadi", cid)
        return None
    return AdminScope(platform=False, shop_ids=[s.pk for s in shops])


def is_admin(chat_id, username=''):
    """Bu chat adminnikimi? `username` e'tiborga olinmaydi (eski chaqiruvlar bilan moslik uchun qoldirilgan)."""
    return resolve_admin_scope(chat_id) is not None


def kassa_report_text(shops):
    """Berilgan do'konlar bo'yicha bugungi kassa matni (har bir do'kon alohida blok). /kassa buyrug'i ishlatadi."""
    from finance.services.summary import today_summary
    shops = [s for s in shops if s]
    if not shops:
        return "Kassa ma'lumotlari topilmadi."
    blocks = []
    for target_shop in shops:
        summary = today_summary(target_shop)
        today_str = summary['today_date'].strftime('%d.%m.%Y')
        blocks.append(
            f"📊 <b>{esc(target_shop.name)} — Bugungi Kassa ({today_str})</b>\n\n"
            f"🟢 <b>Kirim:</b> {_fmt_sum(summary['income'])} so'm\n"
            f"🔴 <b>Chiqim:</b> {_fmt_sum(summary['expense'])} so'm\n"
            f"💎 <b>Sof kassa:</b> {_fmt_sum(summary['net_profit'])} so'm"
        )
    return "\n\n".join(blocks) + "\n\nBatafsil ma'lumot do'kon moliya panelida."


def default_restaurant_slug():
    """Mehmon menyusi ko'rsatadigan asosiy restoran (bo'sh bo'lsa — eski xatti-harakat)."""
    from django.conf import settings as dj_settings
    from notifications.models import AppSetting
    row = AppSetting.objects.filter(key='restaurant_default_shop').first()
    return ((row.value if row else '') or getattr(dj_settings, 'RESTAURANT_DEFAULT_SHOP', '') or '').strip()


def get_restaurant_shop(shop_id=None, order=None, table=None):
    """
    Restoran stollariga ega bo'lgan aniq do'konni topish.
    Birinchi navbatda order.shop_id, table.shop_id yoki shop_id bo'yicha qat'iy filtrlaydi.
    """
    if order and getattr(order, 'shop_id', None):
        return order.shop
    if table and getattr(table, 'shop_id', None):
        return table.shop
    if shop_id:
        s = Shop.objects.filter(id=shop_id).first()
        if s:
            return s
    # Admin tanlagan asosiy restoran (AppSetting 'restaurant_default_shop' = slug, admin paneldan o'zgaradi;
    # yoki .env RESTAURANT_DEFAULT_SHOP). Avval doim "stollari bor birinchi do'kon" olinardi.
    default_slug = default_restaurant_slug()
    if default_slug:
        s = Shop.objects.filter(slug=default_slug).first()
        if s:
            return s
    # Stollari bor do'konni qidirish
    shop_with_tables = Shop.objects.filter(restaurant_tables__isnull=False).distinct().first()
    if shop_with_tables:
        return shop_with_tables
    return Shop.objects.first()


def get_shop_admin_chat_ids(shop=None):
    """
    Muayyan restoranning xodimlari va adminlari chat_id larini topish.
    Agar shop berilsa, buyurtma faqat o'sha muassasaga tegishli xodimlarga yuboriladi.
    """
    from django.db.models import Q
    if not shop:
        return get_admin_chat_ids()

    ids = []
    # 1. Biznes profili yoki do'kon sozlamalaridagi telegram chat ID
    if hasattr(shop, 'business_profile') and isinstance(shop.business_profile, dict):
        biz_chat = shop.business_profile.get('telegram_chat_id')
        if biz_chat and str(biz_chat) not in ids:
            ids.append(str(biz_chat))

    # 2. Restoranga biriktirilgan xodimlar (ofitsiant, menejer, do'kon egasi)
    owner_id = getattr(shop.owner, 'id', None) if getattr(shop, 'owner', None) else None
    shop_users_filter = Q(shop=shop)
    if owner_id:
        shop_users_filter |= Q(id=owner_id)

    shop_users = AdminUser.objects.filter(is_active=True).filter(shop_users_filter).exclude(telegram_username='')
    usernames = [u.telegram_username.lstrip('@').lower() for u in shop_users if u.telegram_username]
    if usernames:
        subs = TelegramSubscriber.objects.filter(is_active=True, username__in=usernames)
        for s in subs:
            if str(s.chat_id) not in ids:
                ids.append(str(s.chat_id))

    # 3. Agar ushbu do'kon uchun alohida xodim chat_id lari topilmasa, umumiy adminlarga yuboriladi
    if not ids:
        return get_admin_chat_ids()

    return ids


def build_tables_monitoring_text(shop=None):
    """
    4.1. Umumiy kunlik monitoring formati:
    📊 BUGUNGI STOLLAR HISOBOTI (28.09.2026)
    🏪 Restoran: "Milliy Taomlar"

    🪑 Jami stollar: 12 ta
    🟢 Bo'sh stollar: 8 ta
    🔴 Band / Bron stollar: 4 ta

    📦 Bugungi jami stol zakazlari: 19 ta
    💰 Kunlik stollar tushumi: 2,450,000 so'm
    """
    if not shop:
        shop = get_restaurant_shop()
    if not shop:
        return "🏪 Restoran yoki stollar tizimi bazada topilmadi."

    now = timezone.localtime()
    today_formatted = now.strftime('%d.%m.%Y')
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    tables = list(Table.objects.filter(shop=shop, is_active=True))
    tables.sort(key=_table_sort_key)
    total_tables = len(tables)
    free_tables = sum(1 for t in tables if t.status == 'free')
    occupied_tables = total_tables - free_tables

    today_orders = Order.objects.filter(
        shop=shop,
        table__isnull=False,
        created_at__gte=today_start
    ).exclude(status__in=['cancelled', 'failed'])
    today_orders_count = today_orders.count()
    today_revenue = today_orders.aggregate(s=Sum('final_amount'))['s'] or 0

    return (
        f"📊 <b>BUGUNGI STOLLAR HISOBOTI ({today_formatted})</b>\n"
        f"🏪 Restoran: <b>\"{esc(shop.name)}\"</b>\n\n"
        f"🪑 Jami stollar: <b>{total_tables} ta</b>\n"
        f"🟢 Bo'sh stollar: <b>{free_tables} ta</b>\n"
        f"🔴 Band / Bron stollar: <b>{occupied_tables} ta</b>\n\n"
        f"📦 Bugungi jami stol zakazlari: <b>{today_orders_count} ta</b>\n"
        f"💰 Kunlik stollar tushumi: <b>{_fmt_sum(today_revenue)} so'm</b>"
    )


def build_tables_keyboard(shop=None):
    """
    4.2. Har bir stol bo'yicha interaktiv inline tugmalar (2 ta per row):
    [ 🔴 Stol 1 (Band) ]  [ 🟢 Stol 2 (Bo'sh) ]
    [ 🔄 Yangilash ]
    """
    if not shop:
        shop = get_restaurant_shop()
    if not shop:
        return None

    tables = list(Table.objects.filter(shop=shop, is_active=True))
    tables.sort(key=_table_sort_key)

    keyboard = []
    row = []
    for t in tables:
        is_free = (t.status == 'free')
        status_icon = '🟢' if is_free else '🔴'
        status_txt = "Bo'sh" if is_free else dict(Table.STATUS).get(t.status, 'Band')
        btn_text = f"{status_icon} Stol {t.number} ({status_txt})"
        row.append({"text": btn_text, "callback_data": f"t_view:{t.id}"})
        if len(row) == 2:
            keyboard.append(row)
            row = []
    if row:
        keyboard.append(row)

    # Quyi boshqaruv tugmalari
    keyboard.append([
        {"text": "🔄 Yangilash", "callback_data": f"t_refresh:{shop.id}"},
        {"text": "📊 Asosiy Statistika", "callback_data": "admin_stats"}
    ])
    return {"inline_keyboard": keyboard}


def build_table_detail_text(table_id):
    """
    4.3. Stol tafsiloti (Stol ustiga bosilganda):
    📍 STOL № 1 TAFSILOTI
    Holati: 🔴 Band (Buyurtma jarayonida)
    NFC tekkizishlar soni: 3 marta

    🍽 Hozirgi buyurtma:
    • 1x Choyxona Palov — 45,000 so'm
    • 2x Qora choy — 16,000 so'm
    • 1x Achchiq-chuchuk — 12,000 so'm

    💵 Jami hisob: 73,000 so'm
    🕒 Vaqti: 13:40 da ochilgan
    """
    try:
        table = Table.objects.select_related('shop', 'hall').get(id=table_id)
    except Table.DoesNotExist:
        return "❌ Stol topilmadi."

    is_free = (table.status == 'free')
    status_icon = '🟢' if is_free else '🔴'
    status_label = "Bo'sh" if is_free else dict(Table.STATUS).get(table.status, 'Band')
    status_desc = "Hozirda bo'sh" if is_free else "Buyurtma jarayonida"

    nfc_cards = table.nfc_cards.all()
    tap_count = sum(c.tap_count for c in nfc_cards)

    active_order = Order.objects.filter(
        table=table
    ).exclude(status__in=['delivered', 'cancelled', 'failed']).order_by('-created_at').first()

    if active_order:
        items = active_order.items.all()
        if items.exists():
            order_lines = [
                f"• {it.quantity}x {esc(it.product_name)} — {_fmt_sum(it.total)} so'm"
                for it in items
            ]
            items_str = "\n".join(order_lines)
        else:
            items_str = "• Taomlar hali qo'shilmadi"
        total_str = f"{_fmt_sum(active_order.final_amount)} so'm"
        time_str = f"{timezone.localtime(active_order.created_at).strftime('%H:%M')} da ochilgan"
    else:
        items_str = "• Faol buyurtma yo'q"
        total_str = "0 so'm"
        time_str = "Stol hozirda bo'sh" if is_free else "Yangi mehmon o'tirdi"

    hall_name = esc(table.hall.name) if table.hall else "Asosiy zal"

    return (
        f"📍 <b>STOL № {table.number} TAFSILOTI</b>\n"
        f"🏪 Restoran: <b>{esc(table.shop.name)}</b>\n"
        f"🏛 Zal: <b>{hall_name}</b> (sig'imi: {table.capacity} kishi)\n"
        f"Holati: {status_icon} <b>{status_label}</b> ({status_desc})\n"
        f"NFC tekkizishlar soni: <b>{tap_count} marta</b>\n\n"
        f"🍽 <b>Hozirgi buyurtma:</b>\n"
        f"{items_str}\n\n"
        f"💵 <b>Jami hisob:</b> <b>{total_str}</b>\n"
        f"🕒 <b>Vaqti:</b> {time_str}"
    )


def build_table_detail_keyboard(table_id):
    """Stol tafsilotining inline tugmalari: [ ⬅️ Orqaga ] [ ✅ Stolni bo'shatish ]"""
    try:
        table = Table.objects.get(id=table_id)
    except Table.DoesNotExist:
        return None

    if table.status == 'free':
        action_btn = {"text": "🔴 Stolni band qilish", "callback_data": f"t_set_occ:{table.id}"}
    else:
        action_btn = {"text": "✅ Stolni bo'shatish", "callback_data": f"t_set_free:{table.id}"}

    keyboard = [
        [action_btn, {"text": "🔄 Yangilash", "callback_data": f"t_view:{table.id}"}],
        [{"text": "⬅️ Orqaga (Barcha stollar)", "callback_data": f"t_list:{table.shop_id}"}]
    ]
    return {"inline_keyboard": keyboard}


def build_stats_keyboard(shop_id=None):
    """Admin statistika xabarining tugmalari."""
    sid = shop_id or 0
    return {
        "inline_keyboard": [
            [
                {"text": "🪑 Stollar Monitoringi", "callback_data": f"t_list:{sid}"},
                {"text": "🧾 So'nggi buyurtmalar", "callback_data": "admin_orders"},
            ],
            [
                {"text": "🔄 Yangilash", "callback_data": "admin_stats"}
            ]
        ]
    }


def build_stats_text(shop_ids=None):
    """
    Dashboard statistikasi. shop_ids=None — butun platforma (server egasi uchun);
    ro'yxat berilsa — FAQAT shu do'konlar (do'kon admini boshqa do'konlar daromadi/mijozlarini ko'rmaydi).
    """
    from products.models import Product
    from accounts.models import Customer
    from orders.timeutils import local_day_start

    now = timezone.now()
    today_start = local_day_start()
    week_start = now - timedelta(days=7)
    orders = Order.objects.all()
    products = Product.objects.all()
    if shop_ids is not None:
        orders = orders.filter(shop_id__in=shop_ids)
        products = products.filter(shop_id__in=shop_ids)
    live = orders.exclude(status__in=['cancelled', 'failed'])

    today_rev = live.filter(created_at__gte=today_start).aggregate(s=Sum('final_amount'))['s'] or 0
    week_rev = live.filter(created_at__gte=week_start).aggregate(s=Sum('final_amount'))['s'] or 0
    today_cnt = orders.filter(created_at__gte=today_start).count()
    avg_rating = products.aggregate(a=Avg('rating'))['a'] or 0

    if shop_ids is not None:
        names = ", ".join(esc(n) for n in Shop.objects.filter(id__in=shop_ids).order_by('id').values_list('name', flat=True))
        return (
            f"📊 <b>{names} — Admin Panel</b>\n\n"
            f"📦 Mahsulotlar: <b>{products.count()}</b>\n"
            f"🧾 Buyurtmalar: <b>{orders.count()}</b>\n\n"
            f"💰 <b>Bugun:</b> {_fmt_sum(today_rev)} so'm ({today_cnt} ta)\n"
            f"📈 <b>Bu hafta:</b> {_fmt_sum(week_rev)} so'm\n"
            f"⭐ O'rtacha reyting: <b>{round(avg_rating, 1)}</b>\n\n"
            "<i>Buyruqlar: /stollar — stollar nazorati, /orders — buyurtmalar, /kassa — bugungi kassa</i>"
        )

    tg_subs = TelegramSubscriber.objects.filter(is_active=True).count()
    return (
        "📊 <b>Online Store Guliston — Admin Panel</b>\n\n"
        f"🏬 Do'konlar: <b>{Shop.objects.count()}</b>\n"
        f"📦 Mahsulotlar: <b>{products.count()}</b>\n"
        f"🧾 Buyurtmalar: <b>{orders.count()}</b>\n"
        f"👥 Mijozlar: <b>{Customer.objects.count()}</b>\n\n"
        f"💰 <b>Bugun:</b> {_fmt_sum(today_rev)} so'm ({today_cnt} ta)\n"
        f"📈 <b>Bu hafta:</b> {_fmt_sum(week_rev)} so'm\n"
        f"⭐ O'rtacha reyting: <b>{round(avg_rating, 1)}</b>\n"
        f"✈️ TG obunachilar: <b>{tg_subs}</b>\n\n"
        "<i>Buyruqlar: /stollar — stollar nazorati, /orders — buyurtmalar</i>"
    )


def build_recent_orders_text(limit=5, shop_ids=None):
    """So'nggi buyurtmalar ro'yxati. shop_ids berilsa — faqat shu do'konlar (do'kon admini boshqalarning mijozlarini ko'rmaydi)."""
    qs = Order.objects.select_related('shop', 'table')
    if shop_ids is not None:
        qs = qs.filter(shop_id__in=shop_ids)
    orders = qs.order_by('-created_at')[:limit]
    if not orders:
        return "🧾 Hozircha buyurtmalar yo'q."
    lines = ["🧾 <b>So'nggi buyurtmalar</b>\n"]
    for o in orders:
        emoji = STATUS_UZ.get(o.status, ('⚪️ ' + o.status, o.status))[0]
        table_str = f" | 🪑 Stol #{esc(o.table.number)}" if o.table else ""
        lines.append(
            f"{emoji} <b>{esc(o.order_number)}</b> — {esc(o.customer_name)}{table_str}\n"
            f"   🏬 {esc(o.shop.name)} | 💰 {_fmt_sum(o.final_amount)} so'm\n"
            f"   🕒 {timezone.localtime(o.created_at).strftime('%d.%m.%Y %H:%M')}"
        )
    return "\n\n".join(lines)


def notify_new_order(order):
    """Yangi buyurtma → barcha admin chatlariga xabar."""
    emoji = STATUS_UZ.get(order.status, ('⚪️', order.status))[0]
    table_str = f"\n🪑 Stol: <b>#{esc(order.table.number)}</b>" if order.table else ""
    text = (
        "🔔 <b>Yangi buyurtma!</b>\n\n"
        f"🧾 Raqam: <b>{order.order_number}</b>{table_str}\n"
        f"👤 Mijoz: {esc(order.customer_name)}\n"
        f"📞 Tel: {esc(getattr(order, 'customer_phone_1', '') or '-')}\n"
        f"🏬 Do'kon: {esc(order.shop.name)}\n"
        f"💰 Summa: <b>{_fmt_sum(order.final_amount)} so'm</b>\n"
        f"{emoji} Holat: {STATUS_UZ.get(order.status, ('-', order.status))[0]}\n\n"
        f"Batafsil ko'rish: /stollar yoki /orders"
    )
    sent = 0
    for chat_id in get_admin_chat_ids():
        if send_message(chat_id, text):
            sent += 1
    return sent


def build_order_keyboard(order):
    """
    Buyurtma uchun interaktiv inline tugmalar (Oshxona / Ofitsiant / Kassa).
    Agar stol buyurtmasi bo'lsa:
      [ 👨‍🍳 Tayyorlanmoqda ] [ 🩵 Tayyor ]
      [ 🟢 Stolga berildi ] [ 📍 Stol №... ]
    Agar yetkazib berish (Marketplace) bo'lsa:
      [ ✅ Tasdiqlash ] [ 🚗 Yo'lga chiqdi ]
      [ 🎉 Yetkazildi ] [ ❌ Bekor qilish ]
    """
    if hasattr(order, 'table') and order.table:
        cur = order.status
        btn_prep = "▶️ 👨‍🍳 Tayyorlanmoqda ◀️" if cur == 'preparing' else "👨‍🍳 Tayyorlanmoqda"
        btn_ready = "▶️ 🩵 Tayyor ◀️" if cur == 'ready' else "🩵 Tayyor"
        btn_deliv = f"▶️ 🟢 Berildi ◀️" if cur == 'delivered' else f"🟢 Stol №{order.table.number} ga berildi"

        return {
            "inline_keyboard": [
                [
                    {"text": btn_prep, "callback_data": f"ord_status:{order.id}:preparing"},
                    {"text": btn_ready, "callback_data": f"ord_status:{order.id}:ready"},
                ],
                [
                    {"text": btn_deliv, "callback_data": f"ord_status:{order.id}:delivered"},
                    {"text": f"📍 Stol №{order.table.number}", "callback_data": f"t_view:{order.table.id}"},
                ],
            ]
        }
    else:
        cur = order.status
        btn_conf = "▶️ Tasdiqlangan ◀️" if cur == 'confirmed' else "✅ Tasdiqlash"
        btn_out = "▶️ Yo'lda ◀️" if cur == 'out_for_delivery' else "🚗 Yo'lga chiqdi"
        btn_del = "▶️ Yetkazildi ◀️" if cur == 'delivered' else "🎉 Yetkazildi"
        btn_can = "▶️ Bekor ◀️" if cur == 'cancelled' else "❌ Bekor qilish"

        return {
            "inline_keyboard": [
                [
                    {"text": btn_conf, "callback_data": f"ord_status:{order.id}:confirmed"},
                    {"text": btn_out, "callback_data": f"ord_status:{order.id}:out_for_delivery"},
                ],
                [
                    {"text": btn_del, "callback_data": f"ord_status:{order.id}:delivered"},
                    {"text": btn_can, "callback_data": f"ord_status:{order.id}:cancelled"},
                ]
            ]
        }


def _deny_callback(cq_id, text="⛔️ Bu amal sizga ruxsat etilmagan"):
    if cq_id:
        answer_callback_query(cq_id, text, show_alert=True)
    return True


def _table_shop_allowed(scope, table_id):
    """Stol shu admin doirasidagi do'konga tegishlimi (id bo'yicha, boshqa do'kon stoliga tegish taqiqlangan)."""
    shop_id = Table.objects.filter(id=table_id).values_list('shop_id', flat=True).first()
    return shop_id is not None and scope.allows_shop(shop_id)


def handle_table_callback(data, chat_id, message_id=None, cq_id=None, username=''):
    """
    Stollar va admin interaktiv callback_query larni boshqarish:
    • ord_status:<order_id>:<status>
    • t_list:<shop_id>
    • t_refresh:<shop_id>
    • t_view:<table_id>
    • t_set_free:<table_id>
    • t_set_occ:<table_id>
    • admin_stats
    • admin_orders
    Ruxsat faqat chat_id bo'yicha (username e'tiborga olinmaydi). Do'kon admini faqat o'z do'koni stol/buyurtmalariga tegadi;
    3D printer buyurtmalari — faqat platforma admini.
    """
    scope = resolve_admin_scope(chat_id)
    if scope is None:
        if cq_id:
            answer_callback_query(cq_id, "⛔️ Faqat adminlar uchun!", show_alert=True)
        return True

    def _show(text, kb):
        if message_id:
            edit_message_text(chat_id, message_id, text, reply_markup=kb)
        else:
            send_message(chat_id, text, reply_markup=kb)

    if data.startswith(('t_list:', 't_refresh:')):
        parts = data.split(':')
        shop_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        if scope.platform:
            shop = get_restaurant_shop(shop_id)
        elif shop_id and not scope.allows_shop(shop_id):
            return _deny_callback(cq_id, "⛔️ Bu restoran sizga tegishli emas")
        else:
            shop = Shop.objects.filter(id=shop_id).first() if shop_id else scope.primary_shop()
        text = build_tables_monitoring_text(shop)
        kb = build_tables_keyboard(shop)
        if cq_id:
            answer_callback_query(cq_id, "Stollar ro'yxati yangilandi 🔄")
        _show(text, kb)
        return True

    elif data.startswith('t_view:'):
        parts = data.split(':')
        table_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        if not table_id:
            if cq_id:
                answer_callback_query(cq_id, "Stol topilmadi")
            return True
        if not _table_shop_allowed(scope, table_id):
            return _deny_callback(cq_id, "Stol topilmadi")
        text = build_table_detail_text(table_id)
        kb = build_table_detail_keyboard(table_id)
        if cq_id:
            answer_callback_query(cq_id)
        _show(text, kb)
        return True

    elif data.startswith(('t_set_free:', 't_set_occ:')):
        parts = data.split(':')
        table_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        new_status = 'free' if data.startswith('t_set_free:') else 'occupied'
        if table_id:
            if not _table_shop_allowed(scope, table_id):
                return _deny_callback(cq_id, "Stol topilmadi")
            try:
                table = Table.objects.get(id=table_id)
                table.status = new_status
                table.save(update_fields=['status'])
                if cq_id:
                    msg = f"✅ Stol №{table.number} bo'shatildi!" if new_status == 'free' else f"🔴 Stol №{table.number} band qilindi!"
                    answer_callback_query(cq_id, msg, show_alert=True)
                _show(build_table_detail_text(table_id), build_table_detail_keyboard(table_id))
                return True
            except Table.DoesNotExist:
                pass
        if cq_id:
            answer_callback_query(cq_id, "Xatolik yuz berdi")
        return True

    elif data == 'admin_stats':
        shop = scope.primary_shop()
        text = build_stats_text(scope.shop_filter())
        kb = build_stats_keyboard(shop.id if shop else None)
        if cq_id:
            answer_callback_query(cq_id)
        _show(text, kb)
        return True

    elif data == 'admin_orders':
        text = build_recent_orders_text(limit=8, shop_ids=scope.shop_filter())
        shop = scope.primary_shop()
        kb = {
            "inline_keyboard": [
                [{"text": "⬅️ Orqaga (Stollar)", "callback_data": f"t_list:{shop.id if shop else 0}"}]
            ]
        }
        if cq_id:
            answer_callback_query(cq_id)
        _show(text, kb)
        return True

    elif data.startswith('ord_status:'):
        parts = data.split(':')
        if len(parts) >= 3 and parts[1].isdigit():
            order_id = int(parts[1])
            new_status = parts[2]
            if new_status not in dict(Order.STATUS_CHOICES):
                return _deny_callback(cq_id, "Noto'g'ri holat")
            try:
                order = Order.objects.select_related('table', 'shop').get(id=order_id)
                if not scope.allows_shop(order.shop_id):
                    raise Order.DoesNotExist   # boshqa do'kon buyurtmasi: mavjudligi ham oshkor bo'lmaydi
            except Order.DoesNotExist:
                if cq_id:
                    answer_callback_query(cq_id, "Buyurtma topilmadi", show_alert=True)
                return True

            old_status = order.status
            if old_status != new_status:
                # Holat FAQAT holat mashinasi orqali o'zgaradi (admin API `OrderStatusUpdateView` bilan bir xil qoidalar):
                # ruxsat etilmagan o'tish rad etiladi; tarix, yetkazilganda to'lov/kassa kirimi va ombor, bekor qilishda zaxira
                # bo'shatish, mijoz/xodimga xabar (outbox navbati orqali) shu yerda bajariladi. Avval bu tugma `order.status`
                # ni to'g'ridan-to'g'ri yozib, bularning hammasini chetlab o'tardi.
                from django.db import transaction
                from orders.audit import log_audit
                from orders.state_machine import transition_order
                with transaction.atomic():
                    # KDS bilan bir xil (web/tma_views.py): stol klaviaturasida "Tasdiqlash" tugmasi yo'q, shuning uchun kutilayotgan
                    # buyurtma tayyorlashga/tayyorga o'tganda avval 'confirmed' qilinadi (tarixda ikkala qadam ham yoziladi).
                    # Aks holda Telegram'dan yangi stol buyurtmasini oldinga siljitib bo'lmay qolardi.
                    if order.status == 'pending' and new_status in ('preparing', 'ready'):
                        transition_order(order, 'confirmed', reason='Telegram: qabul qilindi')
                        order.refresh_from_db()
                    ok, msg = transition_order(order, new_status, reason='Telegram orqali')
                    if ok:
                        if order.table:
                            table_status = {'delivered': 'occupied', 'preparing': 'ordering', 'ready': 'ready'}.get(new_status)
                            if table_status:
                                order.table.status = table_status
                                order.table.save(update_fields=['status'])
                        log_audit('order_status_changed', target_type='order', target_id=order.id,
                                  old_value={'status': old_status},
                                  new_value={'status': new_status, 'source': 'telegram', 'chat_id': str(chat_id)})
                if not ok:
                    return _deny_callback(cq_id, f"⚠️ {msg}")

            status_name = dict(Order.STATUS_CHOICES).get(new_status, new_status)
            if cq_id:
                answer_callback_query(cq_id, f"Buyurtma #{order.order_number}: {status_name} ✅", show_alert=False)

            kb = build_order_keyboard(order)
            if message_id:
                edit_message_reply_markup(chat_id, message_id, reply_markup=kb)
            return True

    elif data.startswith('3d_status:'):
        from ar3d.models import Print3DOrder
        from notifications.services.print3d_notification_service import notify_customer_3d_order_ready
        if not scope.platform:
            return _deny_callback(cq_id)    # 3D studiya buyurtmalari umumiy: do'kon admini ularga tegmaydi
        parts = data.split(':')
        if len(parts) >= 3 and parts[2].isdigit():
            new_status = parts[1]
            if new_status not in dict(Print3DOrder.STATUS_CHOICES):
                return _deny_callback(cq_id, "Noto'g'ri holat")
            order_id = int(parts[2])
            order = Print3DOrder.objects.filter(id=order_id).first()
            if order:
                order.status = new_status
                order.save(update_fields=['status'])

                if cq_id:
                    status_text = "Chop etilmoqda" if new_status == 'printing' else ("Tayyor bo'ldi" if new_status == 'ready' else new_status)
                    answer_callback_query(cq_id, f"3D Buyurtma #{order.order_number}: {status_text} ✅")

                if new_status == 'printing':
                    send_message(chat_id, f"⚙️ 3D Buyurtma <b>#{order.order_number}</b> holati <b>'Chop etilmoqda'</b> ga o'zgartirildi!")
                    if order.telegram_chat_id:
                        send_message(
                            order.telegram_chat_id,
                            f"⚙️ <b>Xushxabar, {esc(order.customer_name)}!</b>\n\n"
                            f"Sizning <b>#{order.order_number}</b> raqamli 3D printer buyurtmangiz hozirda usta tomonidan 3D printerda chop etilishni boshladi! 🚀\n\n"
                            f"Tayyor bo'lishi bilan sizga fotosurat va lokatsiya yuboramiz."
                        )
                elif new_status == 'ready':
                    notify_customer_3d_order_ready(order)
                    send_message(chat_id, f"✅ 3D Buyurtma <b>#{order.order_number}</b> 'TAYYOR' deb belgilandi va mijozga rasm/lokatsiya yuborildi!")
            return True

    return False


def handle_admin_command(text, chat_id, username=''):
    """
    Admin buyrug'ini bajaradi. Qaytaradi: True — ushlandi (webhook javob berdi),
    False — bu admin emas yoki buyruq adminlikka tegishli emas.
    Ruxsat faqat chat_id bo'yicha; do'kon admini faqat o'z do'koni ma'lumotini ko'radi.
    """
    t = (text or '').strip().split('@')[0].lower()
    admin_commands = ('/admin', '/panel', '/stats', '/orders', '/stollar', '/tables', '/stol')

    if not t.startswith(admin_commands):
        return False

    scope = resolve_admin_scope(chat_id)
    if scope is None:
        send_message(
            chat_id,
            "⛔️ Bu buyruq faqat biznes egalari va adminlar uchun.\n"
            "Agar admin bo'lsangiz, /id buyrug'i bilan Chat ID ni oling va uni restoran sozlamalaridagi "
            "«Telegram chat ID» maydoniga kiriting.",
        )
        return True

    shop = scope.primary_shop()

    if t in ('/stollar', '/tables', '/stol'):
        send_message(chat_id, build_tables_monitoring_text(shop), reply_markup=build_tables_keyboard(shop))
        return True

    if t in ('/admin', '/panel', '/stats'):
        send_message(chat_id, build_stats_text(scope.shop_filter()),
                     reply_markup=build_stats_keyboard(shop.id if shop else None))
        return True

    elif t == '/orders':
        kb = {
            "inline_keyboard": [
                [{"text": "🪑 Stollar Monitoringi", "callback_data": f"t_list:{shop.id if shop else 0}"}]
            ]
        }
        send_message(chat_id, build_recent_orders_text(shop_ids=scope.shop_filter()), reply_markup=kb)
        return True

    return True
