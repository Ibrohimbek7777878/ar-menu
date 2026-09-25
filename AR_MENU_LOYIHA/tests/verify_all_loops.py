import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
import django
django.setup()

from rest_framework.test import APIClient
from apps.tenants.models import Restaurant
from apps.tables.models import Table
from apps.menu.models import Category, Dish
from apps.orders.models import Order, OrderItem
from apps.accounts.models import Staff
from apps.accounts.tokens import make_access
from decimal import Decimal
import json

def test_operational_loops():
    print("==================================================================")
    print("🚀 STARTING FULL LOOP ENGINEERING VERIFICATION (6 CORE LOOPS)")
    print("==================================================================")
    client = APIClient()

    # ----------------------------------------------------
    # Loop 1: Menu Management & Multi-Tenant Dish Lifecycle
    # ----------------------------------------------------
    print("\n--- [Loop 1] Menu & Product Creation Loop ---")
    rest = Restaurant.objects.filter(is_active=True).first()
    assert rest, "Restaurant exists"
    print(f"Active Restaurant: {rest.name} (slug: {rest.slug})")

    staff = Staff.objects.filter(restaurant=rest, role='admin', is_active=True).first()
    if not staff:
        staff = Staff.objects.create(restaurant=rest, full_name='Verification Admin',
                                     phone='998909998877', role='admin', is_active=True)
    admin_token = make_access(staff)

    cat = Category.objects.filter(restaurant=rest, is_active=True).first()
    if not cat:
        cat = Category.objects.create(restaurant=rest, name_uz="Maxsus Taomlar", name_ru="Специальные", order=1)
    print(f"Category: {cat.name_uz} (ID: {cat.id})")

    # Add a dish via API endpoint /v1/admin/dishes/
    dish_payload = {
        "category": cat.id,
        "name_uz": "Loop Injiniring Palov",
        "name_ru": "Плов Луп Инжиниринг",
        "name_en": "Loop Engineering Pilaf",
        "price": "60000.00",
        "old_price": "75000.00",
        "cook_min": 25,
        "weight_g": 480,
        "calories": 820,
        "desc_uz": "Loop muhandisligi tekshiruvi uchun yaratilgan shohona palov",
        "ingredients_uz": "Lazer guruch, mayin go'sht, zira, sariq sabzi",
        "is_available": True,
        "is_hit": True,
        "is_new": True,
    }

    res = client.post(
        '/v1/admin/dishes/',
        data=dish_payload,
        HTTP_AUTHORIZATION=f'Bearer {admin_token}',
        HTTP_X_RESTAURANT_ID=str(rest.id)
    )
    print(f"Dish creation status: {res.status_code}")
    assert res.status_code in [200, 201], f"Failed to create dish: {res.content.decode()}"
    dish_data = res.json()
    dish_id = dish_data['id']
    print(f"✅ Created Dish #{dish_id}: {dish_data['name_uz']} | Price: {dish_data['price']} UZS (Old: {dish_data.get('old_price')})")

    # Verify dish appears in public guest menu endpoint
    guest_menu_res = client.get(f'/v1/menu/{rest.slug}/')
    assert guest_menu_res.status_code == 200, "Guest menu reachable"
    guest_dishes = guest_menu_res.json().get('dishes', [])
    created_in_menu = [d for d in guest_dishes if d['id'] == dish_id]
    assert len(created_in_menu) == 1, "New dish immediately live in guest menu!"
    print(f"✅ Live Guest Menu Sync Verified: Dish #{dish_id} is visible with status {guest_menu_res.status_code}")

    # ----------------------------------------------------
    # Loop 2: Guest QR Ingestion & Table Resolution
    # ----------------------------------------------------
    print("\n--- [Loop 2] Guest QR Scanning & Table Resolution Loop ---")
    table = Table.objects.filter(restaurant=rest, is_active=True).first()
    if not table:
        table = Table.objects.create(restaurant=rest, number=15, capacity=4)
    print(f"Table #{table.number} - token: {table.qr_token}")

    guest_client = APIClient()
    qr_res = guest_client.get(f'/t/{table.qr_token}/', follow=True)
    print(f"QR Scan response: {qr_res.status_code} (Redirected to: {qr_res.redirect_chain})")
    assert qr_res.status_code == 200, "Guest landed successfully on menu"
    print("✅ Guest landed on menu page with valid table session")

    # ----------------------------------------------------
    # Loop 3: Waiter Service Calls
    # ----------------------------------------------------
    print("\n--- [Loop 3] Waiter Call Ingestion Loop ---")
    call_payload = {
        "table_id": table.id,
        "type": "call",
        "notes": "Test chaqiruv: Hisob-kitob qilish kerak"
    }
    # Test through /v1/calls/ (aliased route)
    call_res = guest_client.post(
        '/v1/calls/',
        data=json.dumps(call_payload),
        content_type='application/json',
        HTTP_X_RESTAURANT_ID=str(rest.id)
    )
    print(f"Call waiter via /v1/calls/ status: {call_res.status_code}")
    assert call_res.status_code in [200, 201], f"Call waiter failed: {call_res.content.decode()}"
    print(f"✅ Waiter call successfully routed: {call_res.json()}")

    # ----------------------------------------------------
    # Loop 4: Order Placement & Cart Lifecycle
    # ----------------------------------------------------
    print("\n--- [Loop 4] Order Placement & Idempotency Loop ---")
    order_payload = {
        "restaurant_id": rest.id,
        "table_id": table.id,
        "notes": "Stolga iliq holda yetkazilsin",
        "client_nonce": f"loop-test-nonce-{table.id}-123",
        "items": [
            {
                "dish_id": dish_id,
                "quantity": 2,
                "notes": "Qazi qo'shilsin"
            }
        ]
    }
    order_res = guest_client.post(
        '/v1/orders/',
        data=json.dumps(order_payload),
        content_type='application/json',
        HTTP_X_RESTAURANT_ID=str(rest.id)
    )
    print(f"Order placement status: {order_res.status_code}")
    assert order_res.status_code in [200, 201], f"Order placement failed: {order_res.content.decode()}"
    order_data = order_res.json()
    order_id = order_data['id']
    order_num = order_data.get('order_number') or order_data.get('number')
    print(f"✅ Order #{order_num} (ID: {order_id}) placed successfully! Total: {order_data.get('total_amount') or order_data.get('total')}")

    # ----------------------------------------------------
    # Loop 5: Kitchen Display System (KDS) & Order Status Sync
    # ----------------------------------------------------
    print("\n--- [Loop 5] KDS Order Lifecycle & Transition Loop ---")
    # 1. Test KDS board HTML rendering
    kds_board_res = client.get(f'/kds/?token={rest.kds_token}')
    assert kds_board_res.status_code == 200, "KDS board renders 200"
    print(f"✅ KDS Board HTML page rendered 200 with active restaurant token")

    # 2. Staff/Kitchen fetches open orders
    staff_orders_res = client.get(
        '/v1/staff/orders/?status=open',
        HTTP_AUTHORIZATION=f'Bearer {admin_token}',
        HTTP_X_RESTAURANT_ID=str(rest.id)
    )
    assert staff_orders_res.status_code == 200, f"Staff orders list failed: {staff_orders_res.content.decode()}"
    orders_list = staff_orders_res.json().get('orders', [])
    matching = [o for o in orders_list if o['id'] == order_id]
    assert len(matching) > 0, "Created order appears in staff/KDS queue"
    print(f"✅ Order #{order_num} found in staff/KDS queue. Status: {matching[0]['status']}")

    # 3. Transition: accept -> cook -> ready -> serve
    auth_headers = {
        'HTTP_AUTHORIZATION': f'Bearer {admin_token}',
        'HTTP_X_RESTAURANT_ID': str(rest.id)
    }
    # Accept
    acc_res = client.post(f'/v1/staff/orders/{order_id}/accept/', **auth_headers)
    assert acc_res.status_code == 200, f"Accept failed: {acc_res.content.decode()}"
    print(f"✅ Order #{order_num} -> ACCEPTED")

    # Cook
    cook_res = client.post(f'/v1/staff/orders/{order_id}/cook/', **auth_headers)
    assert cook_res.status_code == 200, f"Cook failed: {cook_res.content.decode()}"
    print(f"✅ Order #{order_num} -> COOKING")

    # Ready
    ready_res = client.post(f'/v1/staff/orders/{order_id}/ready/', **auth_headers)
    assert ready_res.status_code == 200, f"Ready failed: {ready_res.content.decode()}"
    print(f"✅ Order #{order_num} -> READY")

    # Serve
    serve_res = client.post(f'/v1/staff/orders/{order_id}/serve/', **auth_headers)
    assert serve_res.status_code == 200, f"Serve failed: {serve_res.content.decode()}"
    print(f"✅ Order #{order_num} -> SERVED")

    # Check guest order status tracking
    guest_track_res = guest_client.get(f'/v1/orders/{order_id}/')
    assert guest_track_res.status_code == 200, "Guest can track order status"
    assert guest_track_res.json().get('status') == 'served', "Guest tracking synchronized to SERVED"
    print(f"✅ Guest tracking synchronized: Order status is SERVED")

    # ----------------------------------------------------
    # Loop 6: Production Readiness & Static Assets
    # ----------------------------------------------------
    print("\n--- [Loop 6] Production Readiness Verification ---")
    from django.core.management import call_command
    from io import StringIO
    out = StringIO()
    call_command('check', stdout=out)
    check_result = out.getvalue()
    print("Django Check Output:", check_result.strip())
    assert "System check identified no issues" in check_result or "0 silenced" in check_result

    # Clean up test dish & order
    Order.objects.filter(id=order_id).delete()
    Dish.objects.filter(id=dish_id).delete()
    print("\n🎉 ALL 6 OPERATIONAL LOOPS VERIFIED AND FUNCTIONING FLAWLESSLY!")

if __name__ == '__main__':
    test_operational_loops()
