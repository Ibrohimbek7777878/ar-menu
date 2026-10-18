import logging
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Sum
from django.utils import timezone

from accounts.models import AdminUser
from notifications.models import TelegramSubscriber
from notifications.telegram_bot import send_message, edit_message_text, edit_message_reply_markup, answer_callback_query
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
    from django.db.models import Q
    if str(chat_id) in [str(i) for i in get_admin_chat_ids()]:
        return True
    uname = (username or '').lstrip('@').lower()
    if uname:
        return AdminUser.objects.filter(
            is_active=True
        ).filter(
            # Aniq moslik: avval icontains edi — "ad" nomli foydalanuvchi "admin"ga o'tib ketardi
            Q(telegram_username__iexact=uname) | Q(telegram_username__iexact=f'@{uname}') | Q(username__iexact=uname)
        ).exists()
    return False


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
        f"🏪 Restoran: <b>\"{shop.name}\"</b>\n\n"
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
                f"• {it.quantity}x {it.product_name} — {_fmt_sum(it.total)} so'm"
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

    hall_name = table.hall.name if table.hall else "Asosiy zal"

    return (
        f"📍 <b>STOL № {table.number} TAFSILOTI</b>\n"
        f"🏪 Restoran: <b>{table.shop.name}</b>\n"
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


def build_stats_text():
    """Dashboard statistikasi (admin panel bilan bir xil ko'rsatkichlar)."""
    from products.models import Product
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
        "📊 <b>Online Store Guliston — Admin Panel</b>\n\n"
        f"🏬 Do'konlar: <b>{Shop.objects.count()}</b>\n"
        f"📦 Mahsulotlar: <b>{Product.objects.count()}</b>\n"
        f"🧾 Buyurtmalar: <b>{Order.objects.count()}</b>\n"
        f"👥 Mijozlar: <b>{Customer.objects.count()}</b>\n\n"
        f"💰 <b>Bugun:</b> {_fmt_sum(today_rev)} so'm ({today_cnt} ta)\n"
        f"📈 <b>Bu hafta:</b> {_fmt_sum(week_rev)} so'm\n"
        f"⭐ O'rtacha reyting: <b>{round(avg_rating, 1)}</b>\n"
        f"✈️ TG obunachilar: <b>{tg_subs}</b>\n\n"
        "<i>Buyruqlar: /stollar — stollar nazorati, /orders — buyurtmalar</i>"
    )


def build_recent_orders_text(limit=5):
    """So'nggi buyurtmalar ro'yxati."""
    orders = Order.objects.select_related('shop').order_by('-created_at')[:limit]
    if not orders:
        return "🧾 Hozircha buyurtmalar yo'q."
    lines = ["🧾 <b>So'nggi buyurtmalar</b>\n"]
    for o in orders:
        emoji = STATUS_UZ.get(o.status, ('⚪️ ' + o.status, o.status))[0]
        table_str = f" | 🪑 Stol #{o.table.number}" if o.table else ""
        lines.append(
            f"{emoji} <b>{o.order_number}</b> — {o.customer_name}{table_str}\n"
            f"   🏬 {o.shop.name} | 💰 {_fmt_sum(o.final_amount)} so'm\n"
            f"   🕒 {timezone.localtime(o.created_at).strftime('%d.%m.%Y %H:%M')}"
        )
    return "\n\n".join(lines)


def notify_new_order(order):
    """Yangi buyurtma → barcha admin chatlariga xabar."""
    emoji = STATUS_UZ.get(order.status, ('⚪️', order.status))[0]
    table_str = f"\n🪑 Stol: <b>#{order.table.number}</b>" if order.table else ""
    text = (
        "🔔 <b>Yangi buyurtma!</b>\n\n"
        f"🧾 Raqam: <b>{order.order_number}</b>{table_str}\n"
        f"👤 Mijoz: {order.customer_name}\n"
        f"📞 Tel: {getattr(order, 'customer_phone', '') or '-'}\n"
        f"🏬 Do'kon: {order.shop.name}\n"
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
    """
    if not is_admin(chat_id, username):
        if cq_id:
            answer_callback_query(cq_id, "⛔️ Faqat adminlar uchun!", show_alert=True)
        return True

    if data.startswith(('t_list:', 't_refresh:')):
        parts = data.split(':')
        shop_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        shop = get_restaurant_shop(shop_id)
        text = build_tables_monitoring_text(shop)
        kb = build_tables_keyboard(shop)
        if cq_id:
            answer_callback_query(cq_id, "Stollar ro'yxati yangilandi 🔄")
        if message_id:
            edit_message_text(chat_id, message_id, text, reply_markup=kb)
        else:
            send_message(chat_id, text, reply_markup=kb)
        return True

    elif data.startswith('t_view:'):
        parts = data.split(':')
        table_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        if not table_id:
            if cq_id:
                answer_callback_query(cq_id, "Stol topilmadi")
            return True
        text = build_table_detail_text(table_id)
        kb = build_table_detail_keyboard(table_id)
        if cq_id:
            answer_callback_query(cq_id)
        if message_id:
            edit_message_text(chat_id, message_id, text, reply_markup=kb)
        else:
            send_message(chat_id, text, reply_markup=kb)
        return True

    elif data.startswith('t_set_free:'):
        parts = data.split(':')
        table_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        if table_id:
            try:
                table = Table.objects.get(id=table_id)
                table.status = 'free'
                table.save(update_fields=['status'])
                if cq_id:
                    answer_callback_query(cq_id, f"✅ Stol №{table.number} bo'shatildi!", show_alert=True)
                text = build_table_detail_text(table_id)
                kb = build_table_detail_keyboard(table_id)
                if message_id:
                    edit_message_text(chat_id, message_id, text, reply_markup=kb)
                else:
                    send_message(chat_id, text, reply_markup=kb)
                return True
            except Table.DoesNotExist:
                pass
        if cq_id:
            answer_callback_query(cq_id, "Xatolik yuz berdi")
        return True

    elif data.startswith('t_set_occ:'):
        parts = data.split(':')
        table_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        if table_id:
            try:
                table = Table.objects.get(id=table_id)
                table.status = 'occupied'
                table.save(update_fields=['status'])
                if cq_id:
                    answer_callback_query(cq_id, f"🔴 Stol №{table.number} band qilindi!", show_alert=True)
                text = build_table_detail_text(table_id)
                kb = build_table_detail_keyboard(table_id)
                if message_id:
                    edit_message_text(chat_id, message_id, text, reply_markup=kb)
                else:
                    send_message(chat_id, text, reply_markup=kb)
                return True
            except Table.DoesNotExist:
                pass
        if cq_id:
            answer_callback_query(cq_id, "Xatolik yuz berdi")
        return True

    elif data == 'admin_stats':
        shop = get_restaurant_shop()
        text = build_stats_text()
        kb = build_stats_keyboard(shop.id if shop else None)
        if cq_id:
            answer_callback_query(cq_id)
        if message_id:
            edit_message_text(chat_id, message_id, text, reply_markup=kb)
        else:
            send_message(chat_id, text, reply_markup=kb)
        return True

    elif data == 'admin_orders':
        text = build_recent_orders_text(limit=8)
        shop = get_restaurant_shop()
        kb = {
            "inline_keyboard": [
                [{"text": "⬅️ Orqaga (Stollar)", "callback_data": f"t_list:{shop.id if shop else 0}"}]
            ]
        }
        if cq_id:
            answer_callback_query(cq_id)
        if message_id:
            edit_message_text(chat_id, message_id, text, reply_markup=kb)
        else:
            send_message(chat_id, text, reply_markup=kb)
        return True

    elif data.startswith('ord_status:'):
        parts = data.split(':')
        if len(parts) >= 3 and parts[1].isdigit():
            order_id = int(parts[1])
            new_status = parts[2]
            try:
                order = Order.objects.select_related('table', 'shop').get(id=order_id)
                old_status = order.status
                if old_status != new_status:
                    order.status = new_status
                    if new_status == 'delivered':
                        order.delivered_at = timezone.now()
                        if order.table:
                            order.table.status = 'occupied'
                            order.table.save(update_fields=['status'])
                    elif new_status == 'preparing':
                        if order.table:
                            order.table.status = 'ordering'
                            order.table.save(update_fields=['status'])
                    elif new_status == 'ready':
                        if order.table:
                            order.table.status = 'ready'
                            order.table.save(update_fields=['status'])
                    order.save(update_fields=['status', 'delivered_at', 'updated_at'])

                    try:
                        from notifications.services.telegram_service import send_status_updated
                        send_status_updated(order, old_status, new_status)
                    except Exception as ex:
                        logger.error(f"send_status_updated xatolik: {ex}")

                status_name = dict(Order.STATUS_CHOICES).get(new_status, new_status)
                if cq_id:
                    answer_callback_query(cq_id, f"Buyurtma #{order.order_number}: {status_name} ✅", show_alert=False)

                kb = build_order_keyboard(order)
                if message_id:
                    edit_message_reply_markup(chat_id, message_id, reply_markup=kb)
                return True
            except Order.DoesNotExist:
                if cq_id:
                    answer_callback_query(cq_id, "Buyurtma topilmadi", show_alert=True)
                return True

    elif data.startswith('3d_status:'):
        from ar3d.models import Print3DOrder
        from notifications.services.print3d_notification_service import notify_customer_3d_order_ready
        parts = data.split(':')
        if len(parts) >= 3 and parts[2].isdigit():
            new_status = parts[1]
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
                            f"⚙️ <b>Xushxabar, {order.customer_name}!</b>\n\n"
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
    """
    t = (text or '').strip().split('@')[0].lower()
    admin_commands = ('/admin', '/panel', '/stats', '/orders', '/stollar', '/tables', '/stol')

    if not t.startswith(admin_commands):
        return False

    if not is_admin(chat_id, username):
        send_message(
            chat_id,
            "⛔️ Bu buyruq faqat biznes egalari va adminlar uchun.\n"
            "Agar admin bo'lsangiz, profilingizga Telegram username qo'shing "
            "yoki ADMIN_CHAT_IDS ni .env ga yozing.",
        )
        return True

    if t in ('/stollar', '/tables', '/stol'):
        shop = get_restaurant_shop()
        text = build_tables_monitoring_text(shop)
        kb = build_tables_keyboard(shop)
        send_message(chat_id, text, reply_markup=kb)
        return True

    if t in ('/admin', '/panel', '/stats'):
        shop = get_restaurant_shop()
        send_message(chat_id, build_stats_text(), reply_markup=build_stats_keyboard(shop.id if shop else None))
        return True

    elif t == '/orders':
        shop = get_restaurant_shop()
        kb = {
            "inline_keyboard": [
                [{"text": "🪑 Stollar Monitoringi", "callback_data": f"t_list:{shop.id if shop else 0}"}]
            ]
        }
        send_message(chat_id, build_recent_orders_text(), reply_markup=kb)
        return True

    return True
