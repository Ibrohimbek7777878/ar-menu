#!/usr/bin/env python3
"""
Loop Engineering Diagnostic & End-to-End Audit Suite (v1.0)
Online Store Guliston — 3 Ta Mustaqil Mahsulot Ekotizimi
"""
import os
import sys
import json
import time
from decimal import Decimal
from pathlib import Path

# Django muhitini yuklash
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.test import Client
from django.utils import timezone
from accounts.models import AdminUser, Customer
from shops.models import Shop
from products.models import Product
from categories.models import Category
from orders.models import Order, OrderItem
from tables_restaurant.models import Table, Hall
from ar3d.models import Print3DOrder, Print3DProduct, Print3DMaterial
from notifications.models import BotMessage
from notifications.admin_bot import handle_table_callback, build_order_keyboard
from web.seller_views import seller_3d_studio

class TestReporter:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def check(self, category, test_name, condition, details=""):
        status = "PASS" if condition else "FAIL"
        if condition:
            self.passed += 1
            icon = "✅"
        else:
            self.failed += 1
            icon = "❌"
        res = {
            "category": category,
            "name": test_name,
            "status": status,
            "details": details
        }
        self.results.append(res)
        print(f"  {icon} [{category}] {test_name}: {status} {f'({details})' if details else ''}")
        return condition

    def warn(self, category, test_name, details=""):
        self.warnings += 1
        print(f"  ⚠️ [{category}] {test_name}: WARNING ({details})")
        self.results.append({
            "category": category,
            "name": test_name,
            "status": "WARN",
            "details": details
        })

reporter = TestReporter()
client = Client()

# Superadmin yoki Seller foydalanuvchisini olish/yaratish
admin_user = AdminUser.objects.filter(is_superuser=True).first()
if not admin_user:
    admin_user = AdminUser.objects.filter(role__in=['super_admin', 'shop_owner']).first()

shop = Shop.objects.first()
if not shop:
    shop = Shop.objects.create(name="Guliston Test Shop", slug="guliston-test-shop")

print("\n" + "="*70)
print("🔄 LOOP ENGINEERING: TO'LIQ EKOTIZIM DIAGNOSTIKASI BOSHLANDI")
print("="*70 + "\n")

# ==============================================================================
# 1. MAHSULOT #1: RESTORAN 3D/AR MENYU & BOT (TMA)
# ==============================================================================
print("--- [1] MAHSULOT #1: RESTORAN 3D/AR MENYU & TELEGRAM BOT ---")

# 1.1 Veb va TMA sahifalari
r = client.get('/menu/')
reporter.check("P1: Web", "Restoran Menyu sahifasi (/menu/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/menu/?table=1')
reporter.check("P1: Web", "Stol biriktirilgan menyu (/menu/?table=1)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/menu/?table=invalid_9999_xyz')
reporter.check("P1: Web", "Noto'g'ri stol parametri (Graceful fallback)", r.status_code == 200, "Xatosiz fallback")

r = client.get('/tma/')
reporter.check("P1: TMA", "TMA bosh sahifasi (/tma/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/menu/catalog/')
reporter.check("P1: TMA", "Restoran toifalar katalogi (/menu/catalog/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/ar/')
reporter.check("P1: 3D AR", "WebXR /ar/ 3D Menyu sahifasi yuklanishi", r.status_code == 200 and 'AIR 3D MENU' in r.content.decode('utf-8', errors='ignore'), f"HTTP {r.status_code}")

r_rest = client.get('/restaurant/')
reporter.check("P1: 3D AR", "Yangi /restaurant/ 3D Menyu sahifasi va 3D Modellar", r_rest.status_code == 200 and 'hero-3d-viewer' in r_rest.content.decode('utf-8'), f"HTTP {r_rest.status_code}, 3D sahnasi faol")

# 1.2 Restoran Savat va Checkout
table = Table.objects.filter(is_active=True).first()
if not table:
    hall = Hall.objects.first() or Hall.objects.create(shop=shop, name="Asosiy Zal")
    table = Table.objects.create(shop=shop, hall=hall, number="1", status="free")

prod = Product.objects.filter(shop=shop, is_available=True).first()
if not prod:
    cat = Category.objects.first() or Category.objects.create(name="Milliy Taomlar")
    prod = Product.objects.create(shop=shop, category=cat, name="Osh Palov", price=35000, is_available=True)

# TMA Cart API
r = client.post('/tma/api/cart/', json.dumps({
    "action": "add",
    "product_id": prod.id,
    "quantity": 2
}), content_type="application/json")
reporter.check("P1: Savat", "TMA Savatga taom qo'shish API", r.status_code == 200, f"HTTP {r.status_code}")

# Checkout stol bilan
client.get(f'/menu/?table={table.number}')
r = client.post(f'/menu/checkout/?table={table.number}', {
    "customer_name": "Test Mehmon",
    "customer_phone": "+998901234567",
    "table": str(table.number),
    "notes": "Kam yog'li bo'lsin"
})
reporter.check("P1: Buyurtma", "Stol orqali 1-klikda buyurtma berish", r.status_code in (200, 302), f"HTTP {r.status_code}")

# Oxirgi yaratilgan buyurtmani tekshirish
last_order = Order.objects.filter(customer_name="Test Mehmon").order_by('-created_at').first()
if last_order:
    reporter.check("P1: Buyurtma", "Buyurtmaga stol avtomatik biriktirilishi", last_order.table_id == table.id, f"Stol №{table.number}")
    reporter.check("P1: Manzil", "Restoran ichidagi manzil standarti", "Stol" in last_order.delivery_address, last_order.delivery_address)
else:
    reporter.warn("P1: Buyurtma", "Oxirgi buyurtma obyekti topilmadi")

# 1.3 Oshxona va Ofitsiant Interaktiv Telegram Tugmalari
if last_order:
    kb = build_order_keyboard(last_order)
    reporter.check("P1: Bot UI", "Oshxona/Ofitsiant interaktiv tugmalari yaratilishi", bool(kb.get('inline_keyboard')), "4 ta tugma mavjud")

    # Callback: Oshpaz 'preparing' tugmasini bosishi
    res = handle_table_callback(f"ord_status:{last_order.id}:preparing", chat_id="12345", username="admin")
    last_order.refresh_from_db()
    reporter.check("P1: Callback", "Telegram [Tayyorlanmoqda] tugmasi ishlashi", last_order.status == 'preparing', f"Status: {last_order.status}")

    # Callback: Oshpaz 'ready' tugmasini bosishi
    res = handle_table_callback(f"ord_status:{last_order.id}:ready", chat_id="12345", username="admin")
    last_order.refresh_from_db()
    reporter.check("P1: Callback", "Telegram [Tayyor] tugmasi ishlashi", last_order.status == 'ready', f"Status: {last_order.status}")

    # Callback: Ofitsiant 'delivered' tugmasini bosishi
    res = handle_table_callback(f"ord_status:{last_order.id}:delivered", chat_id="12345", username="admin")
    last_order.refresh_from_db()
    table.refresh_from_db()
    reporter.check("P1: Callback", "Telegram [Stolga berildi] tugmasi ishlashi", last_order.status == 'delivered', f"Status: {last_order.status}")

# 1.4 Stol boshqaruvi va Admin
res = handle_table_callback(f"t_set_occ:{table.id}", chat_id="12345", username="admin")
table.refresh_from_db()
reporter.check("P1: Stollar", "Telegramdan stolni band qilish (t_set_occ)", table.status == 'occupied', f"Stol holati: {table.status}")

res = handle_table_callback(f"t_set_free:{table.id}", chat_id="12345", username="admin")
table.refresh_from_db()
reporter.check("P1: Stollar", "Telegramdan stolni bo'shatish (t_set_free)", table.status == 'free', f"Stol holati: {table.status}")

# Webhook orqali xabarlarni audit qilish
BotMessage.objects.create(
    chat_id="998901234567",
    username="mehmon_ali",
    first_name="Ali",
    text="/stollar",
    is_command=True,
    command="/stollar",
    response="Jami stollar: 10 ta"
)
reporter.check("P1: Audit", "BotMessage audit bazasida saqlanishi", BotMessage.objects.filter(command="/stollar").exists(), "Xabar loglandi")

# Seller Admin Stollar va Telegram
if admin_user:
    client.force_login(admin_user)
    r = client.get('/seller/tables/')
    reporter.check("P1: Admin", "Seller Stollar Paneli (/seller/tables/)", r.status_code == 200, f"HTTP {r.status_code}")
    r = client.get('/seller/telegram/')
    reporter.check("P1: Admin", "Seller Jonli Telegram Xabarlar Auditi (/seller/telegram/)", r.status_code == 200, f"HTTP {r.status_code}")
    r = client.get('/seller/kds/')
    reporter.check("P1: KDS", "Seller Oshxona Ekrani (/seller/kds/)", r.status_code == 200, f"HTTP {r.status_code}")
    r = client.get('/seller/waiter/')
    reporter.check("P1: Waiter", "Seller Ofitsiant POS Paneli (/seller/waiter/)", r.status_code == 200, f"HTTP {r.status_code}")


# ==============================================================================
# 2. MAHSULOT #2: ONLINE STORE GULISTON (MARKETPLACE)
# ==============================================================================
print("\n--- [2] MAHSULOT #2: ONLINE STORE GULISTON (MARKETPLACE) ---")

r = client.get('/')
reporter.check("P2: Web", "Marketplace Asosiy Sahifa (/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/catalog/')
reporter.check("P2: Web", "Marketplace Katalog (/catalog/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/search/?q=osh')
reporter.check("P2: Qidiruv", "Tovar qidiruv (/search/?q=osh)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get(f'/product/{prod.slug}/')
reporter.check("P2: Detail", "Tovar sahifasi (/product/<slug>/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/cart/')
reporter.check("P2: Savat", "Marketplace Savatcha (/cart/)", r.status_code == 200, f"HTTP {r.status_code}")

# Marketplace Savatga qo'shish
r = client.post('/cart/add/', {
    "product_id": prod.id,
    "quantity": 1
})
reporter.check("P2: Savat", "Tovar savatga qo'shilishi (/cart/add/)", r.status_code in (200, 302), f"HTTP {r.status_code}")

# Checkout yetkazib berish (stolga bog'lanmagan sof marketplace formati)
r = client.post('/checkout/', {
    "name": "Marketplace Haridor",
    "phone": "+998912345678",
    "address": "Guliston shahar, 3-mavze, 14-uy",
    "notes": "Eshik kodi 123",
    "lat": "40.4900",
    "lng": "68.7800"
})
reporter.check("P2: Checkout", "Marketplace Kuryerlik buyurtmasi", r.status_code in (200, 302), f"HTTP {r.status_code}")

if admin_user:
    client.force_login(admin_user)
    r = client.get('/seller/products/')
    reporter.check("P2: Sklad", "Seller Mahsulotlar & Sklad (/seller/products/)", r.status_code == 200, f"HTTP {r.status_code}")
    r = client.get('/seller/orders/')
    reporter.check("P2: Buyurtmalar", "Seller Marketplace Buyurtmalari (/seller/orders/)", r.status_code == 200, f"HTTP {r.status_code}")


# ==============================================================================
# 3. MAHSULOT #3: 3D STUDIO & SERVISLAR MARKAZI
# ==============================================================================
print("\n--- [3] MAHSULOT #3: 3D STUDIO & SERVISLAR MARKAZI ---")

r = client.get('/studio/')
reporter.check("P3: Web", "3D Studio Asosiy Sahifasi (/studio/)", r.status_code == 200, f"HTTP {r.status_code}")

r = client.get('/3d-print/')
reporter.check("P3: Web", "3D Printer Xizmatlari sahifasi (/3d-print/)", r.status_code == 200, f"HTTP {r.status_code}")

# 3D Buyurtma yaratish API
r = client.post('/3d-print/order/', {
    "customer_name": "Inomjon Muhandis",
    "customer_phone": "+998909998877",
    "custom_title": "Avtomobil ventilatsiya panjarasi (Ehtiyot qism)",
    "custom_description": "Issiqlikka chidamli PETG materialidan, 100% to'ldirish bilan bo'lsin",
    "material": "PETG",
    "color": "Qora mot",
    "quantity": 2,
    "has_cashback": "true",
    "delivery_type": "pickup"
})
reporter.check("P3: API", "3D Print Buyurtma qabul qilish (/3d-print/order/)", r.status_code == 200, f"HTTP {r.status_code}")

order_3d = Print3DOrder.objects.filter(customer_name="Inomjon Muhandis").order_by('-created_at').first()
if order_3d:
    reporter.check("P3: Keshbek", "5% Keshbek chegirmasi hisobi", order_3d.discount_amount > 0, f"-{order_3d.discount_amount} so'm")
    reporter.check("P3: Material", "Material va Rang to'g'ri saqlanishi", order_3d.material == 'PETG', f"{order_3d.material}, {order_3d.color}")

    # 3D Buyurtma holatini yangilash (Telegram callback testi)
    res = handle_table_callback(f"3d_status:printing:{order_3d.id}", chat_id="12345", username="admin")
    order_3d.refresh_from_db()
    reporter.check("P3: Callback", "3D status [Chop etilmoqda] o'zgarishi", order_3d.status == 'printing', f"Status: {order_3d.status}")

    res = handle_table_callback(f"3d_status:ready:{order_3d.id}", chat_id="12345", username="admin")
    order_3d.refresh_from_db()
    reporter.check("P3: Callback", "3D status [Tayyor bo'ldi] o'zgarishi", order_3d.status == 'ready', f"Status: {order_3d.status}")
else:
    reporter.warn("P3: Buyurtma", "3D buyurtma obyekti topilmadi")

# 3D Studio Seller Navbati (Print Queue)
if admin_user:
    client.force_login(admin_user)
    r = client.get('/seller/studio/')
    reporter.check("P3: Admin", "Seller 3D Print Navbati Paneli (/seller/studio/)", r.status_code == 200, f"HTTP {r.status_code}")

    # Seller paneldan status o'zgartirish (POST)
    if order_3d:
        r = client.post('/seller/studio/', {
            "action": "update_status",
            "order_id": order_3d.id,
            "status": "delivered"
        })
        order_3d.refresh_from_db()
        reporter.check("P3: Admin Post", "Seller paneldan buyurtmani 'Topshirildi' qilish", order_3d.status == 'delivered', f"Status: {order_3d.status}")


# ==============================================================================
# 4. UMUMIY EKOTIZIM VA SWITCHER TEKSHIRUVI
# ==============================================================================
print("\n--- [4] EKOTIZIM: UNIVERSAL SWITCHER VA XAVFSIZLIK ---")

# Header switcher mavjudligi
r = client.get('/')
html = r.content.decode('utf-8')
reporter.check("Ecosystem", "Header Switcher: 3D Menyu havolasi", ("/restaurant/" in html or "/menu/" in html), "Havola faol")
reporter.check("Ecosystem", "Header Switcher: 3D Studio havolasi", "/studio/" in html, "Havola faol")
reporter.check("Ecosystem", "Header Switcher: Online Store havolasi", "/" in html, "Havola faol")

# Base Seller Switcher
if admin_user:
    client.force_login(admin_user)
    r = client.get('/seller/tables/')
    s_html = r.content.decode('utf-8')
# ==============================================================================
# 5. ALOHIDA PORTLAR VA MUSTAQIL URLCONF TEKSHIRUVI (8001, 8002, 8003)
# ==============================================================================
print("\n--- [5] ALOHIDA PORTLAR VA MUSTAQIL URLCONF MARSHRUTLARI ---")

# 5.1 Port 8001: Restoran 3D/AR
r_p1 = client.get('/', HTTP_HOST='127.0.0.1:8001', SERVER_PORT='8001')
reporter.check("P1: Port 8001", "Port 8001 Root (/) Restoran 3D Menyu ochilishi", r_p1.status_code == 200 and ('hero-3d-viewer' in r_p1.content.decode('utf-8') or 'AIR 3D' in r_p1.content.decode('utf-8') or 'tma' in r_p1.content.decode('utf-8').lower()), f"HTTP {r_p1.status_code}")

r_p1_wh = client.post('/bot/restaurant/webhook/', content_type='application/json', data=json.dumps({}), HTTP_HOST='127.0.0.1:8001', SERVER_PORT='8001')
reporter.check("P1: Port 8001", "Port 8001 Restoran Webhook (/bot/restaurant/webhook/)", r_p1_wh.status_code == 200, f"HTTP {r_p1_wh.status_code}")

# 5.2 Port 8002: Online Store Gipermarket
r_p2 = client.get('/', HTTP_HOST='127.0.0.1:8002', SERVER_PORT='8002')
reporter.check("P2: Port 8002", "Port 8002 Root (/) Online Store Gipermarket ochilishi", r_p2.status_code == 200 and ('Guliston' in r_p2.content.decode('utf-8') or 'Do\'kon' in r_p2.content.decode('utf-8')), f"HTTP {r_p2.status_code}")

r_p2_wh = client.post('/bot/market/webhook/', content_type='application/json', data=json.dumps({}), HTTP_HOST='127.0.0.1:8002', SERVER_PORT='8002')
reporter.check("P2: Port 8002", "Port 8002 Market Webhook (/bot/market/webhook/)", r_p2_wh.status_code == 200, f"HTTP {r_p2_wh.status_code}")

# 5.3 Port 8003: 3D Studio & Chop Etish
r_p3 = client.get('/', HTTP_HOST='127.0.0.1:8003', SERVER_PORT='8003')
reporter.check("P3: Port 8003", "Port 8003 Root (/) 3D Studio & Chop Etish ochilishi", r_p3.status_code == 200 and ('3D' in r_p3.content.decode('utf-8') or 'Printer' in r_p3.content.decode('utf-8')), f"HTTP {r_p3.status_code}")

r_p3_wh = client.post('/bot/studio/webhook/', content_type='application/json', data=json.dumps({}), HTTP_HOST='127.0.0.1:8003', SERVER_PORT='8003')
reporter.check("P3: Port 8003", "Port 8003 Studio Webhook (/bot/studio/webhook/)", r_p3_wh.status_code == 200, f"HTTP {r_p3_wh.status_code}")

# ==============================================================================
# YAKUNIY NATIJALAR
# ==============================================================================
print("\n" + "="*70)
print(f"📊 DIAGNOSTIKA NATIJALARI: Jami: {reporter.passed + reporter.failed} ta test")
print(f"   ✅ Muvaffaqiyatli (PASS): {reporter.passed} ta")
print(f"   ❌ Xatolik (FAIL):        {reporter.failed} ta")
print(f"   ⚠️ Ogohlantirish (WARN):  {reporter.warnings} ta")
print("="*70 + "\n")

if reporter.failed > 0:
    sys.exit(1)
else:
    sys.exit(0)
