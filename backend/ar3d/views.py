import json
import logging
import time
import random
import math
import os
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.middleware.csrf import get_token
from django.core.cache import cache
from django.conf import settings
from django.db import transaction

from shops.models import Shop
from products.models import Product
from categories.models import Category
from orders.models import Order, OrderItem
from ar3d.models import Product3DModel, ProductLibrary
from notifications.services.telegram_service import send_table_service_call, send_order_created
from web.restaurant_auth import remember_guest_order, restaurant_staff_required, staff_shop

logger = logging.getLogger(__name__)

_MEM_CACHE = {}

def safe_cache_get(key, default=None):
    try:
        val = cache.get(key, default)
        if val is not None:
            return val
    except Exception:
        pass
    return _MEM_CACHE.get(key, default)

def safe_cache_set(key, val, timeout=300):
    try:
        cache.set(key, val, timeout)
    except Exception:
        pass
    _MEM_CACHE[key] = val

def safe_cache_delete(key):
    try:
        cache.delete(key)
    except Exception:
        pass
    _MEM_CACHE.pop(key, None)

def safe_cache_clear():
    try:
        cache.clear()
    except Exception:
        pass
    _MEM_CACHE.clear()


DEFAULT_GLB_MAP = {
    'plov': '/media/ar/glb/plov.glb',
    'shashlik': '/media/ar/glb/shashlik.glb',
    'somsa': '/media/ar/glb/somsa.glb',
    'manti': '/media/ar/glb/manti.glb',
    'lagman': '/media/ar/glb/lagmon.glb',
    'qozon_kabob': '/media/ar/glb/qozon_kabob.glb',
    'shorva': '/media/ar/glb/shorva.glb',
    'mastava': '/media/ar/glb/mastava.glb',
    'non': '/media/ar/glb/non.glb',
    'salat': '/media/ar/glb/salad_achichuk.glb',
    'salat_bahor': '/media/ar/glb/salad_bahor.glb',
    'choy': '/media/ar/glb/tea_cup.glb',
    'steak': '/media/ar/glb/steak_meat.glb',
    'breakfast': '/media/ar/glb/breakfast_egg.glb',
    'dessert': '/media/ar/glb/dessert_bowl.glb',
    'drink': '/media/ar/glb/drink_bottle.glb',
}

DEMO_DISHES = [
    {
        "id": 101,
        "name": "Osh (To'y Palovi)",
        "desc": "Zarafshon lazer guruchi, mayin lahm qo'zi go'shti, sariq sabzi, no'xat, kishmish va bedana tuxumi bilan damlangan to'y oshi.",
        "price": 42000,
        "cat": "milliy",
        "category_id": 1,
        "cook_min": 15,
        "weight_g": 450,
        "calories": 720,
        "diameter_cm": 32,
        "image": "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/plov.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["halal"],
        "allergens": [],
        "ingredients": ["Qo'y go'shti", "Lazer guruch", "Sariq sabzi", "Zira", "Kishmish", "Bedana tuxumi"],
        "tourist_fact": "O'zbekistonning milliy brendi va YUNESKO nomoddiy madaniy merosi ro'yxatiga kiritilgan an'anaviy shohona taom."
    },
    {
        "id": 102,
        "name": "G'ijduvon Shashlik",
        "desc": "Yumshoq qo'zi va mol go'shti qiymasi, maxsus ziravorlar bilan charxpalak usulida ko'mir cho'g'ida pishirilgan lazzatli kabob.",
        "price": 24000,
        "cat": "kabob",
        "category_id": 2,
        "cook_min": 20,
        "weight_g": 180,
        "calories": 480,
        "diameter_cm": 25,
        "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/shashlik.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["halal"],
        "allergens": [],
        "ingredients": ["Qo'y go'shti", "Dumba yog'i", "Piyoz", "Kashnich urug'i", "Zira"],
        "tourist_fact": "Buxoro viloyatining mashhur G'ijduvon usulidagi sershira va og'izda eriydigan mashhur kabob."
    },
    {
        "id": 103,
        "name": "Tandir Somsa",
        "desc": "Qat-qat qarsildoq xamir, maydalangan barra go'sht va dumba bo'laklari, zira va kunjut bilan tandirda pishirilgan qaynoq somsa.",
        "price": 14000,
        "cat": "milliy",
        "category_id": 1,
        "cook_min": 10,
        "weight_g": 220,
        "calories": 390,
        "diameter_cm": 16,
        "image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/somsa.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["halal"],
        "allergens": ["gluten"],
        "ingredients": ["Qatlama xamir", "Mol go'shti", "Piyoz", "Dumba", "Kunjut", "Zira"],
        "tourist_fact": "O'zbek dasturxonining ajralmas pishirig'i, an'anaviy loy tandir devoriga urib pishiriladi."
    },
    {
        "id": 104,
        "name": "Qasqon Manti",
        "desc": "Yupqa xamir ichida barra go'sht va shirin piyoz bo'laklari, bug'da pishirilgan, sariyog' va qatiq bilan tortiladigan manti.",
        "price": 36000,
        "cat": "milliy",
        "category_id": 1,
        "cook_min": 25,
        "weight_g": 400,
        "calories": 540,
        "diameter_cm": 28,
        "image": "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/manti.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": False,
        "is_new": True,
        "is_available": True,
        "diet": ["halal"],
        "allergens": ["gluten"],
        "ingredients": ["Yupqa xamir", "Mayin mol go'shti", "Piyoz", "Zira", "Qatiq"],
        "tourist_fact": "Maxsus ko'p qavatli bug' qozoni — mantiqasqonda suv bug'ida mehr bilan pishiriladi."
    },
    {
        "id": 105,
        "name": "Qovurma Lag'mon",
        "desc": "Qo'lda cho'zilgan elastik xamir, shirador go'sht, bulg'or qalampiri, pomidor va maxsus ziravorlar bilan tez qovurilgan lag'mon.",
        "price": 38000,
        "cat": "milliy",
        "category_id": 1,
        "cook_min": 18,
        "weight_g": 450,
        "calories": 610,
        "diameter_cm": 26,
        "image": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/lagmon.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["halal", "spicy"],
        "allergens": ["gluten"],
        "ingredients": ["Cho'zma xamir", "Go'sht", "Bulg'or qalampiri", "Pomidor", "Kashnich"],
        "tourist_fact": "Ipak Yo'li madaniyatining yorqin namunasi, qo'lda cho'zilgan ugra mahorati bilan tayyorlanadi."
    },
    {
        "id": 106,
        "name": "Qozon Kabob",
        "desc": "Qozonda qizarib qovurilgan tillarang kartoshka va sershira barra qo'zi qovurg'alari, yangi uzilgan piyoz bilan.",
        "price": 48000,
        "cat": "milliy",
        "category_id": 1,
        "cook_min": 25,
        "weight_g": 500,
        "calories": 780,
        "diameter_cm": 28,
        "image": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/qozon_kabob.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["halal"],
        "allergens": [],
        "ingredients": ["Qo'zi qovurg'asi", "Kichik butun kartoshka", "Zira", "Kashnich"],
        "tourist_fact": "Cho'yan qozonda past olovda uzoq qovurilib, go'shti suyagidan o'z-o'zidan ajraladi."
    },
    {
        "id": 107,
        "name": "Qo'y Go'shtli Sho'rva",
        "desc": "Tiniq va xushbo'y go'sht suvi, yirik sabzavotlar, barra no'xat va yangi ko'katlar solingan shifobaxsh sho'rva.",
        "price": 32000,
        "cat": "shorva",
        "category_id": 3,
        "cook_min": 10,
        "weight_g": 450,
        "calories": 420,
        "diameter_cm": 22,
        "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/shorva.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": False,
        "is_new": False,
        "is_available": True,
        "diet": ["halal"],
        "allergens": [],
        "ingredients": ["Qo'y lahm va suyagi", "Sabzi", "Kartoshka", "No'xat", "Shivit"],
        "tourist_fact": "O'zbekistonda uzoq yo'ldan kelgan aziz mehmonlarga eng birinchi taqdim etiladigan issiq taom."
    },
    {
        "id": 108,
        "name": "Achchiq-Chuchuk Salati",
        "desc": "Quyoshda pishgan shirin Samarqand pomidorlari, yupqa to'g'ralgan shirin piyoz, achchiq qalampir va rayhon.",
        "price": 16000,
        "cat": "salat",
        "category_id": 4,
        "cook_min": 5,
        "weight_g": 200,
        "calories": 85,
        "diameter_cm": 20,
        "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/salad_achichuk.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["vegan", "halal"],
        "allergens": [],
        "ingredients": ["Pomidor", "Piyoz", "Achchiq qalampir", "Rayhon"],
        "tourist_fact": "Palovning eng yaxshi tabiiy hamrohi — yog'li taomlarni hazm qilishni yengillashtiradi."
    },
    {
        "id": 109,
        "name": "Issiq Samarqand Patir Non",
        "desc": "Sut va sariyog' bilan qorilgan, chetlariga naqsh urilgan, tandirda qizargan oppoq va yumshoq patir non.",
        "price": 8000,
        "cat": "milliy",
        "category_id": 1,
        "cook_min": 5,
        "weight_g": 350,
        "calories": 280,
        "diameter_cm": 24,
        "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/non.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["halal"],
        "allergens": ["gluten"],
        "ingredients": ["Bug'doy uni", "Sut", "Sariyog'", "Sedana"],
        "tourist_fact": "O'zbek mehmondo'stligining muqaddas ramzi. Dasturxonga eng avval issiq non qo'yiladi."
    },
    {
        "id": 110,
        "name": "Zafaronli Ko'k Choy",
        "desc": "Maxsus ko'k choy barglari, tog' giyohlari, novvot va limon bo'laklari bilan damlangan xushbo'y choy.",
        "price": 12000,
        "cat": "ichimlik",
        "category_id": 5,
        "cook_min": 5,
        "weight_g": 800,
        "calories": 15,
        "diameter_cm": 18,
        "image": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
        "glb_url": "/media/ar/glb/tea_cup.glb",
        "has_3d": True,
        "has_ar": True,
        "is_hit": True,
        "is_new": False,
        "is_available": True,
        "diet": ["vegan", "halal"],
        "allergens": [],
        "ingredients": ["Ko'k choy barglari", "Zafaron", "Limon", "Novvot"],
        "tourist_fact": "Choyni piyolaga uch marta qaytarib quyish 'loy'ni ketkazib, choy lazzatini ochadi."
    }
]


def _resolve_dish_glb(name, desc=''):
    """Taom nomiga qarab real GLB model manzilini topish."""
    text = f"{name} {desc}".lower()
    if any(k in text for k in ['osh', 'palov', 'plov']):
        return DEFAULT_GLB_MAP['plov']
    if any(k in text for k in ['kabob', 'shashlik']):
        return DEFAULT_GLB_MAP['shashlik']
    if any(k in text for k in ['somsa', 'samsa']):
        return DEFAULT_GLB_MAP['somsa']
    if 'manti' in text:
        return DEFAULT_GLB_MAP['manti']
    if any(k in text for k in ['lagmon', "lag'mon"]):
        return DEFAULT_GLB_MAP['lagman']
    if any(k in text for k in ['qozon kabob', 'jarkop']):
        return DEFAULT_GLB_MAP['qozon_kabob']
    if any(k in text for k in ['shorva', "sho'rva"]):
        return DEFAULT_GLB_MAP['shorva']
    if 'mastava' in text:
        return DEFAULT_GLB_MAP['mastava']
    if any(k in text for k in ['non', 'patir']):
        return DEFAULT_GLB_MAP['non']
    if any(k in text for k in ['achichuk', 'achchiq', 'chuchuk']):
        return DEFAULT_GLB_MAP['salat']
    if 'salat' in text:
        return DEFAULT_GLB_MAP['salat_bahor']
    if any(k in text for k in ['choy', 'tea', 'kofe', 'qahva']):
        return DEFAULT_GLB_MAP['choy']
    if any(k in text for k in ['steyk', 'steak', 'gril']):
        return DEFAULT_GLB_MAP['steak']
    if any(k in text for k in ['tuxum', 'nonushta', 'omlet']):
        return DEFAULT_GLB_MAP['breakfast']
    if any(k in text for k in ['desert', 'shirinlik', 'tort', 'paxlava']):
        return DEFAULT_GLB_MAP['dessert']
    if any(k in text for k in ['suv', 'ichimlik', 'sharbat', 'sok', 'cola']):
        return DEFAULT_GLB_MAP['drink']
    return DEFAULT_GLB_MAP['plov']


def ar_3d_menu_page(request, slug=None):
    """
    Asosiy AIR 3D Menyu sahifasini ko'rsatish (/ar/ yoki /m/<slug>/).
    Agar '?classic=1' so'ralsa, eski grid katalog ko'rinishiga o'tadi.
    """
    if request.GET.get('classic') == '1':
        from web import views as web_views
        if slug:
            return web_views.ar_menu_page(request, slug)
        return web_views.ar_catalog(request)

    shop = None
    if slug and slug != 'demo':
        shop = Shop.objects.filter(slug=slug).first()
    if not shop:
        shop = Shop.objects.filter(is_open=True).first()

    table_raw = request.GET.get('t') or request.GET.get('table') or '5'
    table_num = 5
    table_hall = ''

    # Signed token bo'lsa ochib ko'rish
    if table_raw:
        try:
            from django.core.signing import TimestampSigner
            import uuid as _uuid
            from tables_restaurant.models import resolve_table_by_token
            clean_token = table_raw
            if ':' in clean_token:
                clean_token = TimestampSigner().unsign(clean_token, max_age=24 * 3600)
            tbl = resolve_table_by_token(_uuid.UUID(str(clean_token).strip()))
            table_num = tbl.number
            table_hall = tbl.hall.name if tbl.hall else ''
            if not shop or (shop and tbl.shop_id == shop.id):
                shop = tbl.shop
        except Exception:
            try:
                table_num = int(table_raw)
            except ValueError:
                table_num = 5

    lang = request.GET.get('lang') or request.session.get('django_language') or 'uz'
    is_nfc = bool(request.GET.get('nfc') == '1' or request.session.get('nfc_source'))
    initial_data = {
        'slug': shop.slug if shop else 'demo',
        'restaurant_name': shop.name if shop else "Registon Lounge & Restaurant",
        'table_id': table_raw,
        'table_number': table_num,
        'table_hall': table_hall,
        'lang': lang,
        'is_nfc': is_nfc,
        'csrf_token': get_token(request),
        'color_primary': shop.color_primary if (shop and shop.color_primary) else '#10b981',
        'color_accent': shop.color_accent if (shop and shop.color_accent) else '#f59e0b',
        'template_style': getattr(shop, 'store_type', 'restaurant'),
    }

    return render(request, 'air_3d_menu_index.html', {
        'shop': shop,
        'initial_data_json': json.dumps(initial_data)
    })


def v1_menu_api(request, slug):
    """
    GET /v1/menu/<slug>/?lang=uz&table=5
    AIR 3D Menyu uchun restoran ma'lumotlari, toifalar va 3D taomlarni qaytaradi.
    """
    shop = None
    if slug and slug != 'demo':
        shop = Shop.objects.filter(slug=slug).first()
    if not shop:
        shop = Shop.objects.filter(is_open=True).first()

    lang = request.GET.get('lang', 'uz')
    table_id = request.GET.get('table', '5')

    restaurant_data = {
        'id': shop.id if shop else 1,
        'slug': shop.slug if shop else 'demo',
        'name': shop.name if shop else "Registon Lounge & Restaurant",
        'logo': shop.image.url if (shop and getattr(shop, 'image', None)) else None,
        'colors': {
            'primary': shop.color_primary if (shop and shop.color_primary) else '#10b981',
            'accent': shop.color_accent if (shop and shop.color_accent) else '#f59e0b'
        },
        'template_style': getattr(shop, 'store_type', 'restaurant'),
        'langs': ['uz', 'ru', 'en'],
        'default_lang': 'uz',
        'service_fee_pct': 10,
        'has_ar': True,
        'phone': getattr(shop, 'phone', None) or "+998 90 123 45 67",
        'address': getattr(shop, 'address', None) or "Guliston shahri, O'zbekiston ko'chasi 45",
    }

    categories = [
        {'id': 'all', 'name': 'Barchasi', 'icon': '🍽️'},
        {'id': 'milliy', 'name': 'Milliy taomlar', 'icon': '🥘'},
        {'id': 'kabob', 'name': 'Kaboblar', 'icon': '🍢'},
        {'id': 'shorva', 'name': "Sho'rvalar", 'icon': '🥣'},
        {'id': 'salat', 'name': 'Salatlar', 'icon': '🥗'},
        {'id': 'ichimlik', 'name': 'Ichimliklar', 'icon': '🫖'},
    ]

    dishes = []
    # Agar bazada ushbu do'kon/restoranning taomlari bo'lsa, ularni olamiz
    shop_products = shop.products.filter(is_available=True) if shop else Product.objects.none()

    if shop_products.exists():
        for p in shop_products[:40]:
            cat_id = str(p.category_id or 'milliy')
            glb_url = p.ar_model or ''
            if not glb_url and hasattr(p, 'model3d') and p.model3d.glb:
                glb_url = p.model3d.glb.url
            if not glb_url:
                glb_url = _resolve_dish_glb(p.name, p.description)

            # Rasm
            img_url = p.image.url if p.image else 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80'

            dishes.append({
                'id': p.id,
                'name': p.name,
                'desc': p.description or f"{p.name} — eng sarxil masalliqlardan yangi tayyorlangan.",
                'price': float(p.price),
                'cat': cat_id,
                'category_id': p.category_id or 1,
                'cook_min': getattr(p, 'cook_min', 15) or 15,
                'weight_g': getattr(p, 'weight_g', 350) or 350,
                'calories': getattr(p, 'calories', 500) or 500,
                'diameter_cm': 28,
                'image': img_url,
                'glb_url': glb_url,
                'has_3d': True,
                'has_ar': True,
                'is_hit': getattr(p, 'is_hit', False) or getattr(p, 'is_featured', False),
                'is_new': getattr(p, 'is_new', False),
                'is_available': p.is_available,
                'diet': getattr(p, 'diet_tags', ['halal']) or ['halal'],
                'allergens': getattr(p, 'allergens', []) or [],
                'ingredients': [p.name],
                'tourist_fact': f"{p.name} — o'zbek mehmondo'stligining xushbo'y va an'anaviy taomi."
            })

    # Agar do'konda taomlar hali kiritilmagan bo'lsa, 17 ta to'liq 3D modelga ega demo menyuni taqdim etamiz
    if not dishes:
        dishes = DEMO_DISHES

    return JsonResponse({
        'restaurant': restaurant_data,
        'categories': categories,
        'dishes': dishes
    }, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
def v1_orders_api(request):
    """
    POST /v1/orders/
    AIR 3D Menyu savatidan to'g'ridan-to'g'ri stol buyurtmasini qabul qilish.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception as e:
        return JsonResponse({'error': f'JSON xatosi: {str(e)}'}, status=400)

    session_id = data.get('session_id', '')
    table_id = data.get('table_id', '5')
    note = data.get('note', '')
    raw_items = data.get('items', [])

    if not raw_items:
        return JsonResponse({'error': 'Savat bo\'sh'}, status=400)

    # Do'kon va stolni aniqlash
    shop = None
    table_obj = None

    if table_id:
        try:
            import uuid as _uuid
            from tables_restaurant.models import Table
            if len(str(table_id)) >= 32:
                table_obj = Table.objects.filter(qr_token=_uuid.UUID(str(table_id))).first()
            if not table_obj:
                table_obj = Table.objects.filter(number=int(table_id)).first()
            if table_obj:
                shop = table_obj.shop
        except Exception:
            pass

    # Agar stol orqali do'kon aniqlanmagan bo'lsa, request parametrlari orqali tekshirish
    if not shop:
        shop_slug = data.get('shop_slug') or data.get('restaurant_slug') or data.get('shop')
        shop_id = data.get('shop_id')
        if shop_slug:
            shop = Shop.objects.filter(slug=shop_slug, is_open=True).first()
        elif shop_id:
            shop = Shop.objects.filter(id=shop_id, is_open=True).first()

    if not shop:
        return JsonResponse({'error': 'Do\'kon yoki stol ma\'lumotlari aniqlanmadi'}, status=400)

    from orders.numbering import next_order_number
    order_num = next_order_number()
    customer_phone = data.get('phone') or data.get('customer_phone') or "+998900000000"
    raw_customer_name = data.get('customer_name')
    if raw_customer_name:
        customer_name = raw_customer_name
    elif table_obj:
        customer_name = f"Stol #{table_obj.number} {table_obj.hall.name if table_obj.hall else ''} (AR 3D)"
    else:
        customer_name = f"Stol #{table_id} (AR 3D)"

    total_amount = 0
    created_items = []

    for item in raw_items:
        dish_id = item.get('dish_id')
        try:
            qty = int(item.get('qty', 1))
        except (ValueError, TypeError):
            qty = 1

        if qty <= 0 or qty > 100:
            return JsonResponse({'error': 'Noto\'g\'ri mahsulot miqdori'}, status=400)

        item_note = str(item.get('note', ''))[:255]

        product = None
        price = 0
        prod_name = "AR 3D Taom"

        # Narx faqat shu restoranning mavjud mahsulotidan (TZ: R-SEC-07).
        # Avval boshqa do'kon mahsuloti ham qabul qilinar, noma'lum taom esa 35 000 so'm deb narxlanardi.
        if isinstance(dish_id, int) or (isinstance(dish_id, str) and dish_id.isdigit()):
            product = Product.objects.filter(
                id=int(dish_id), shop=shop, is_available=True, is_deleted=False
            ).first()

        if product:
            price = int(product.price)
            prod_name = product.name
        elif settings.DEMO_MODE:
            # Demo taomlar faqat DEMO_MODE da (AGENTS.md 4-qoida: o'chirilmaydi, flag ortida)
            for d in DEMO_DISHES:
                if str(d['id']) == str(dish_id):
                    price = int(d['price'])
                    prod_name = d['name']
                    break
        if not price:
            return JsonResponse({'error': 'Taom menyuda topilmadi yoki hozir mavjud emas'}, status=400)

        line_total = price * qty
        total_amount += line_total
        created_items.append({
            'product': product,
            'name': prod_name,
            'price': price,
            'qty': qty,
            'total': line_total,
            'note': item_note
        })

    with transaction.atomic():
        order = Order.objects.create(
            order_number=order_num,
            customer_name=customer_name,
            customer_phone_1=customer_phone,
            shop=shop,
            table=table_obj,
            delivery_address="Restoran ichida (Stolda)",
            notes=note,
            total_amount=total_amount,
            delivery_fee=0,
            discount_amount=0,
            final_amount=total_amount,
            status='pending',
            payment_status='unpaid',
            is_pickup=False
        )

        for ci in created_items:
            OrderItem.objects.create(
                order=order,
                product=ci['product'],
                product_name=ci['name'],
                price=ci['price'],
                quantity=ci['qty'],
                unit='dona',
                total=ci['total']
            )

        if table_obj:
            table_obj.status = 'occupied'
            table_obj.save(update_fields=['status'])

        # Mahsulot omborini zaxiralash (Stock Reservation)
        try:
            from orders.inventory import reserve_stock
            reserve_stock(order, timeout_minutes=15)
        except Exception as e:
            logger.warning(f"Stock reservation xatosi (davom etiladi): {e}")

    remember_guest_order(request, order)

    # Telegram xabar yuborish
    try:
        send_order_created(order)
    except Exception as e:
        logger.warning(f"Telegram notification xatosi: {e}")

    return JsonResponse({
        'success': True,
        'order_id': order.id,
        'order_number': order.order_number,
        'status': order.status,
        'total': float(order.final_amount),
        'table': table_id
    })


@csrf_exempt
def v1_call_waiter_api(request):
    """
    POST /v1/guest/call-waiter/
    Stoldan ofitsiant chaqirish, suv/choy yoki hisob-kitob (chek) so'rash.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception as e:
        return JsonResponse({'error': f'JSON xatosi: {str(e)}'}, status=400)

    table_id = data.get('table_id', '5')
    reason = data.get('reason', 'waiter')

    # 60s cooldown tekshiruvi (Spamdan himoya)
    cooldown_key = f"call_waiter_cd_{table_id}"
    if safe_cache_get(cooldown_key):
        return JsonResponse({
            'success': False,
            'error': "Iltimos, biroz kuting. Ofitsiantga so'rov allaqachon yuborilgan!",
            'retry_after': 60
        }, status=429)

    safe_cache_set(cooldown_key, True, 60)
    safe_cache_set(f"table_call_status_{table_id}", {'status': 'waiting', 'reason': reason, 'created_at': time.time()}, 300)

    from tables_restaurant.models import Table
    table_obj = None
    try:
        import uuid as _uuid
        if len(str(table_id)) >= 32:
            table_obj = Table.objects.filter(qr_token=_uuid.UUID(str(table_id))).first()
        if not table_obj:
            table_obj = Table.objects.filter(number=int(table_id)).first()
    except Exception:
        pass

    if not table_obj:
        table_obj = Table.objects.first()

    service_map = {
        'waiter': 'waiter',
        'water': 'tea',
        'bill': 'bill'
    }
    stype = service_map.get(reason, 'waiter')

    if table_obj:
        if stype == 'bill':
            table_obj.status = 'bill'
            table_obj.save(update_fields=['status'])
        elif stype == 'waiter' and table_obj.status in ['free', 'cleaning']:
            table_obj.status = 'occupied'
            table_obj.save(update_fields=['status'])

        try:
            send_table_service_call(table_obj.shop, table_obj, stype, f"AIR 3D Menyu orqali so'rov: {reason}")
        except Exception as e:
            logger.warning(f"Telegram service call xatosi: {e}")

    messages = {
        'waiter': 'Ofitsiantga xabar berildi! Tez orada stolingizga yetib keladi.',
        'water': 'Choy va ichimlik so\'rovi xizmatchilarga yetkazildi!',
        'bill': 'Hisob-kitob cheki tayyorlanmoqda, ofitsiant olib keladi!'
    }
    return JsonResponse({
        'success': True,
        'message': messages.get(reason, 'Xabar ofitsiantga yetkazildi!')
    })


@csrf_exempt
def v1_lang_api(request):
    """
    POST /v1/lang/
    Tilni almashtirish va sessiyada saqlash.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    try:
        data = json.loads(request.body.decode('utf-8'))
        lang = data.get('lang', 'uz')
        request.session['django_language'] = lang
        return JsonResponse({'success': True, 'lang': lang})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


def v1_ar_dish_api(request, dish_id):
    """
    GET /v1/ar/<dish_id>/
    Tanlangan taomning real 3D GLB/USDZ modeli va metama'lumotlari.
    """
    product = None
    if str(dish_id).isdigit():
        product = Product.objects.filter(id=int(dish_id)).first()

    if product:
        glb = product.ar_model or ''
        if not glb and hasattr(product, 'model3d') and product.model3d.glb:
            glb = product.model3d.glb.url
        if not glb:
            glb = _resolve_dish_glb(product.name, product.description)

        return JsonResponse({
            'id': product.id,
            'name': product.name,
            'glb': glb,
            'usdz': getattr(getattr(product, 'model3d', None), 'usdz', None) and product.model3d.usdz.url or '',
            'real_size_cm': 28,
            'cook_min': getattr(product, 'cook_min', 15) or 15,
            'weight_g': getattr(product, 'weight_g', 350) or 350,
            'calories': getattr(product, 'calories', 500) or 500,
        })

    # Demo dish
    for d in DEMO_DISHES:
        if str(d['id']) == str(dish_id):
            return JsonResponse({
                'id': d['id'],
                'name': d['name'],
                'glb': d['glb_url'],
                'usdz': '',
                'real_size_cm': d['diameter_cm'],
                'cook_min': d['cook_min'],
                'weight_g': d['weight_g'],
                'calories': d['calories'],
                'tourist_fact': d['tourist_fact']
            })

    return JsonResponse({'error': 'Taom topilmadi'}, status=404)


def v1_call_status_api(request):
    """
    GET /v1/guest/call-status/?table_id=5
    Mijoz stolining ofitsiant chaqiruv holatini tekshirish (waiting / accepted / done).
    """
    table_raw = request.GET.get('table_id') or request.GET.get('table') or '5'
    cached = safe_cache_get(f"table_call_status_{table_raw}")
    status = 'waiting'
    reason = 'waiter'
    if cached:
        status = cached.get('status', 'waiting')
        reason = cached.get('reason', 'waiter')

    msg = "Ofitsiant yo'lda va tez orada stolingizga yetib keladi" if status == 'accepted' else "Chaqiruv ofitsiantlarga yetkazildi va kutilmoqda"
    return JsonResponse({
        'success': True,
        'table_id': table_raw,
        'status': status,
        'reason': reason,
        'message': msg
    })


@restaurant_staff_required(api=True, capability='pos')
def v1_staff_calls_api(request):
    """
    GET /v1/staff/calls/
    Ofitsiantlar ekrani (WaiterView) uchun o'z restoranidagi ochiq chaqiruvlar ro'yxati.
    """
    from tables_restaurant.models import Table
    calls = []
    active_tables = Table.objects.filter(shop=staff_shop(request), is_active=True).select_related('hall', 'shop')

    for t in active_tables:
        call_cache = safe_cache_get(f"table_call_status_{t.number}")
        if call_cache or t.status in ['waiting', 'bill', 'ordering']:
            calls.append({
                'id': int(t.id),
                'table_id': t.number,
                'table_no': str(t.number),
                'hall': t.hall.name if t.hall else "Asosiy zal",
                'reason': call_cache.get('reason', 'waiter') if call_cache else ('bill' if t.status == 'bill' else 'waiter'),
                'status': call_cache.get('status', 'new') if call_cache else 'new',
                'created_at': "Hozir",
            })

    return JsonResponse({
        'success': True,
        'calls': calls
    })


@restaurant_staff_required(api=True, capability='pos')
@require_POST
def v1_staff_call_accept_api(request, pk):
    """POST /v1/staff/calls/<id>/accept/ — faqat login qilgan xodim, faqat o'z restorani stoli."""
    from tables_restaurant.models import Table
    tbl = Table.objects.filter(id=pk, shop=staff_shop(request)).first()
    if not tbl:
        return JsonResponse({'success': False, 'error': 'Stol topilmadi'}, status=404)
    safe_cache_set(f"table_call_status_{tbl.number}", {'status': 'accepted', 'reason': 'waiter'}, 300)
    return JsonResponse({'success': True, 'call_id': pk, 'status': 'accepted'})


@restaurant_staff_required(api=True, capability='pos')
@require_POST
def v1_staff_call_done_api(request, pk):
    """POST /v1/staff/calls/<id>/done/ — faqat login qilgan xodim, faqat o'z restorani stoli."""
    from tables_restaurant.models import Table
    tbl = Table.objects.filter(id=pk, shop=staff_shop(request)).first()
    if not tbl:
        return JsonResponse({'success': False, 'error': 'Stol topilmadi'}, status=404)
    safe_cache_delete(f"table_call_status_{tbl.number}")
    tbl.status = 'occupied'
    tbl.save(update_fields=['status'])
    return JsonResponse({'success': True, 'call_id': pk, 'status': 'done'})


@csrf_exempt
def v1_split_bill_api(request):
    """
    POST /v1/guest/split-bill/
    Stol hisobini N ta mehmon orasida bo'lish (Split Bill & Tips).
    Faqat to'lanmagan (unpaid) ochiq buyurtmalar hisoblanadi.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    table_raw = data.get('table_id', '5')
    try:
        parts = int(data.get('parts', 2))
    except (ValueError, TypeError):
        parts = 2

    if parts < 1:
        parts = 1
    if parts > 30:
        parts = 30

    from tables_restaurant.models import Table
    table_obj = None
    try:
        import uuid as _uuid
        if len(str(table_raw)) >= 32:
            table_obj = Table.objects.filter(qr_token=_uuid.UUID(str(table_raw))).first()
        if not table_obj:
            table_obj = Table.objects.filter(number=str(table_raw)).first()
    except Exception:
        pass

    total_amount = 0
    if table_obj:
        orders = Order.objects.filter(
            table=table_obj,
            status__in=['pending', 'confirmed', 'preparing', 'ready', 'cooking', 'served'],
            payment_status='unpaid'
        ).order_by('-created_at')
        if orders.exists():
            total_amount = sum(float(o.final_amount or o.total_amount) for o in orders[:10])

    if total_amount <= 0:
        return JsonResponse({
            'success': True,
            'ok': True,
            'table': table_raw,
            'total': 0.0,
            'parts': parts,
            'per_person': 0.0,
            'remainder': 0.0,
            'currency': "so'm",
            'summary': "Ushbu stolda to'lanmagan ochiq buyurtma mavjud emas."
        })

    per_person = math.ceil(total_amount / parts)
    remainder = abs(total_amount - (per_person * parts))

    return JsonResponse({
        'success': True,
        'ok': True,
        'table': table_raw,
        'total': float(total_amount),
        'parts': parts,
        'per_person': float(per_person),
        'remainder': float(remainder),
        'currency': "so'm",
        'summary': f"{parts} kishi uchun har biriga {int(per_person):,} so'mdan to'g'ri keladi."
    })


@csrf_exempt
def ai_chat_api(request):
    """
    POST /api/ai-chat and POST /v1/ai/chat/
    AIR 3D Menyu AI Sommelier / Virtual Ofitsiant Chatboti.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    message = (data.get('message') or data.get('question') or data.get('prompt') or '').strip()
    lang = data.get('lang', 'uz')
    if lang not in ('uz', 'ru', 'en'):
        lang = 'uz'

    if not message:
        return JsonResponse({'error': 'Savol bo\'sh bo\'lishi mumkin emas'}, status=400)

    ai_reply = None
    ai_key = getattr(settings, 'GEMINI_API_KEY', None) or getattr(settings, 'AI_API_KEY', None) or os.environ.get('GEMINI_API_KEY') or os.environ.get('AI_API_KEY')
    if ai_key:
        try:
            from ai.ai_service import _call_openai
            sys_prompt = (
                f"You are ARMENU's expert Uzbek restaurant sommelier and friendly AI waiter at 'Registon' restaurant. "
                f"You help customers understand traditional Uzbek dishes (Osh, Manti, Somsa, Lag'mon, Shashlik, Sho'rva, Choy, etc.), "
                f"answer dietary questions (Halal, Vegan, Non-spicy, Gluten-free, Kids-friendly), and suggest appetizing pairings. "
                f"Keep your answers warm, concise (2-4 sentences max), polite, and in the language requested: '{lang}'."
            )
            ai_reply = _call_openai(sys_prompt, message)
        except Exception as err:
            logger.info(f"AI sommelier external API note: {err}")

    if not ai_reply:
        low = message.lower()
        matched_dishes = []
        if any(k in low for k in ['osh', 'palov', 'plov', 'guruch']):
            matched_dishes = [101, 108, 110]
            if lang == 'uz':
                ai_reply = "Albatta! Shohona Toshkent to'y oshimiz Zarafshon lazer guruchi va mayin qo'zi go'shtidan damlangan. Unga barra Achchiq-chuchuk salati va zafaronli ko'k choy buyurtma qilishni tavsiya qilaman!"
            elif lang == 'ru':
                ai_reply = "Конечно! Наш праздничный ташкентский плов готовится из риса лазер и нежнейшей баранины. К нему идеально подойдёт свежий салат ачик-чучук и зелёный чай с шафраном!"
            else:
                ai_reply = "Certainly! Our Tashkent Wedding Plov is cooked with premium lazer rice and tender lamb. We highly recommend pairing it with fresh Achchik-Chuchuk salad and saffron green tea!"

        elif any(k in low for k in ['kabob', 'shashlik', 'go\'sht', 'gijduvon']):
            matched_dishes = [102, 109, 110]
            if lang == 'uz':
                ai_reply = "G'ijduvon shashligimiz ko'mir cho'g'ida pishirilgan bo'lib, og'izda eriydi! Yoniga issiq Samarqand patir noni va yangi rayhonli ko'katlar juda yarashadi."
            elif lang == 'ru':
                ai_reply = "Наш гиждуванский шашлык томится на углях и буквально тает во рту! Рекомендуем дополнить его горячей самаркандской лепёшкой и свежей зеленью."
            else:
                ai_reply = "Our Gijduvon Shashlik is charcoal-grilled to perfection and melts in your mouth! It pairs wonderfully with warm Samarkand patir bread and fresh greens."

        elif any(k in low for k in ['somsa', 'samsa', 'tandir']):
            matched_dishes = [103, 110]
            if lang == 'uz':
                ai_reply = "Tandir somsalarimiz qat-qat qarsildoq xamir va sershira barra go'shtdan yangi uzilgan. Issiq holida ko'k choy bilan tanovul qilishni maslahat beraman!"
            elif lang == 'ru':
                ai_reply = "Наша тандырная самса — это хрустящее слоёное тесто и сочная начинка из отборного мяса. Рекомендуем отведать горячей с чайником чая!"
            else:
                ai_reply = "Our tandoor somsa features flaky crispy dough and rich savory filling straight from the clay oven. Best enjoyed piping hot with traditional tea!"

        elif any(k in low for k in ['manti', 'bug\'', 'xamir']):
            matched_dishes = [104, 108]
            if lang == 'uz':
                ai_reply = "Qasqon mantimiz bug'da nozik pishirilgan bo'lib, ichi to'la mayin go'sht va piyoz sharbatiga boy. Qatiq yoki yangi achchiq-chuchuk bilan ajoyib uyg'unlashadi!"
            elif lang == 'ru':
                ai_reply = "Наши манты томятся на пару в каскане, сохраняя всю сочность мяса и пряных луковых соков. Отлично сочетаются со сметаной или салатом ачик-чучук!"
            else:
                ai_reply = "Our steamed Manti are handcrafted and filled with juicy spiced meat. Served best with yogurt sauce or crisp tomato salad!"

        elif any(k in low for k in ['lag\'mon', 'lagmon', 'ugra', 'cho\'zma']):
            matched_dishes = [105, 110]
            if lang == 'uz':
                ai_reply = "Qovurma lag'monimiz oshpazimiz tomonidan qo'lda cho'zilgan yangi ugra, barra go'sht va shirin bulg'or qalampiri bilan qovurilgan. To'yimli va xushxo'r tanlov!"
            elif lang == 'ru':
                ai_reply = "Наш жареный лагман готовится из свежей домашней тянутой лапши, сочного мяса и сладкого перца. Сытное и невероятно ароматное блюдо!"
            else:
                ai_reply = "Our pan-fried Lagman features hand-pulled noodles stir-fried with tender meat and crisp bell peppers. A rich and flavorful signature dish!"

        elif any(k in low for k in ['shorva', "sho'rva", 'mastava', 'suyuq']):
            matched_dishes = [107, 109]
            if lang == 'uz':
                ai_reply = "Qo'y go'shtli tiniq sho'rvamiz va Mastavamiz yangi go'sht suvi hamda tog' giyohlari bilan tayyorlangan. Qorinni to'yg'azuvchi va juda shifobaxsh!"
            elif lang == 'ru':
                ai_reply = "Наваристый суп шурпа и мастава приготовлены на медленном огне с травами и овощами. Очень сытно, легко и целебно!"
            else:
                ai_reply = "Our slow-simmered Lamb Shorva and Mastava soups are rich in nutrients and aromatic herbs. Wonderfully restorative and comforting!"

        elif any(k in low for k in ['parhez', 'diet', 'achchiq emas', 'mild', 'yengil']):
            matched_dishes = [104, 107, 108]
            if lang == 'uz':
                ai_reply = "Yengil va parhezbop taom qidirayotgan bo'lsangiz: bug'da pishirilgan nozik manti, tiniq sho'rva va barra sabzavotli Bahor salatini tavsiya qilamiz."
            elif lang == 'ru':
                ai_reply = "Для лёгкого или диетического обеда рекомендуем паровые манты, прозрачную шурпу или свежий салат 'Бахор' без острых специй."
            else:
                ai_reply = "For a light or mild meal, we recommend our gently steamed manti, clear soup, or the crisp Bahor spring salad with minimal spice."

        elif any(k in low for k in ['bola', 'bolalar', 'kid', 'children']):
            matched_dishes = [107, 109, 110]
            if lang == 'uz':
                ai_reply = "Kichkintoylar uchun: tabiiy go'shtli iliq sho'rva, yumshoq patir non, sharbatlar va yoqimli desertlarimiz juda mos keladi."
            elif lang == 'ru':
                ai_reply = "Для детей отлично подойдут лёгкий супчик, мягкая лепёшка, фруктовые десерты и натуральные соки."
            else:
                ai_reply = "For kids, our mild meat soup, soft patir bread, and sweet dessert delicacies are wholesome and kid-approved!"

        elif any(k in low for k in ['desert', 'shirinlik', 'tort', 'choy']):
            matched_dishes = [110]
            if lang == 'uz':
                ai_reply = "Taomdan so'ng xushbo'y zafaronli ko'k choyimiz va sharqona shirinliklarimiz dasturxoningizga o'zgacha fayz bag'ishlaydi!"
            elif lang == 'ru':
                ai_reply = "После основного блюда закажите наш фирменный чай с шафраном и традиционные восточные сладости — идеальное завершение трапезы!"
            else:
                ai_reply = "To conclude your feast, try our fragrant saffron green tea paired with traditional oriental dessert bowls!"

        else:
            matched_dishes = [101, 102]
            if lang == 'uz':
                ai_reply = "Xush kelibsiz! Bugungi maxsus tavsiyamiz: shohona Toshkent to'y palovi va G'ijduvon shashligi. Har ikkisini ham 3D va AR rejimida stolda ko'rishingiz mumkin!"
            elif lang == 'ru':
                ai_reply = "Добро пожаловать! Сегодня рекомендуем попробовать праздничный ташкентский плов и сочный гиждуванский шашлык. Их можно рассмотреть в 3D и AR прямо на столе!"
            else:
                ai_reply = "Welcome! Today we spotlight our signature Tashkent Wedding Plov and Gijduvon Shashlik. Feel free to preview both dishes in interactive 3D and AR!"

    return JsonResponse({
        'success': True,
        'reply': ai_reply,
        'fallback': ai_reply,
        'suggested_dish_ids': matched_dishes
    })


def v1_order_status_api(request, order_id):
    """
    GET /v1/orders/status/<order_id>/ or /v1/orders/<order_id>/
    Buyurtmaning real vaqtda oshxonadagi tayyorlanish bosqichini kuzatish.
    """
    order = Order.objects.filter(id=order_id).first()
    if not order:
        order = Order.objects.filter(order_number=str(order_id)).first()

    if not order:
        return JsonResponse({'error': 'Buyurtma topilmadi'}, status=404)

    progress_map = {
        'pending': 20,
        'confirmed': 40,
        'preparing': 65,
        'cooking': 65,
        'ready': 90,
        'out_for_delivery': 95,
        'delivered': 100,
        'served': 100,
        'completed': 100,
        'cancelled': 0,
    }
    progress = progress_map.get(order.status, 30)

    items_data = []
    for item in order.items.all():
        items_data.append({
            'name': item.product_name,
            'qty': item.quantity,
            'price': float(item.price),
            'total': float(item.total)
        })

    return JsonResponse({
        'success': True,
        'order_id': order.id,
        'order_number': order.order_number,
        'status': order.status,
        'status_display': getattr(order, 'get_status_display', lambda: order.status)(),
        'progress_pct': progress,
        'total': float(order.final_amount or order.total_amount),
        'items': items_data,
        'table': order.table.number if order.table else "5",
        'estimated_cook_min': 15,
        'created_at': order.created_at.strftime('%H:%M, %d.%m.%Y') if hasattr(order, 'created_at') else ''
    })


def table_entry_redirect(request, token):
    """
    GET /t/<token>/
    Stol QR kodini skanerlaganda avtomatik do'kon/restoran 3D menyusiga yo'naltirish.
    """
    from tables_restaurant.models import Table
    import uuid as _uuid
    table_obj = None
    try:
        table_obj = Table.objects.select_related('shop').filter(qr_token=_uuid.UUID(str(token).strip()), is_active=True).first()
    except Exception:
        pass

    if table_obj and table_obj.shop:
        return redirect(f"/m/{table_obj.shop.slug}/?t={token}")

    return redirect(f"/ar/?t={token}")


# =====================================================================
# 3D PRINTER STUDIO & ON-DEMAND MANUFACTURING
# =====================================================================

def print_3d_studio_page(request):
    """
    GET /3d-print/
    3D Printer Xizmatlari portali:
    - NFC yoki QR kod orqali kirilganda 5% Keshbek chegirmasi faollashadi.
    - Tayyor 3D mahsulotlar katalogi va individual buyurtma (on-demand).
    """
    from .models import Print3DProduct, Print3DCapability, Print3DArticle, Print3DMaterial, Print3DFAQ

    ref = request.GET.get('ref', '').lower()
    has_nfc = ref in ('nfc', 'qr', 'nfc_qr', 'stand') or request.session.get('nfc_cashback_applied', False)
    if ref in ('nfc', 'qr', 'nfc_qr', 'stand'):
        request.session['nfc_cashback_applied'] = True

    products = Print3DProduct.objects.filter(is_active=True).order_by('-is_featured', '-created_at')
    
    # Kategoriya filtri
    selected_cat = request.GET.get('cat', 'all')
    if selected_cat != 'all':
        products = products.filter(category=selected_cat)

    categories = [
        ('all', 'Barchasi', '✨'),
        ('figurines', 'Figuralar & Haykallar', '🗿'),
        ('gadgets', 'Telefon & Gadjetlar', '📱'),
        ('spare_parts', 'Ehtiyot qismlar', '⚙️'),
        ('souvenirs', 'Suvenirlar & Brelok', '🎁'),
        ('decor_home', 'Uy & Dekoratsiya', '🏺'),
        ('architecture', 'Maketlar', '🏛️'),
    ]

    capabilities = Print3DCapability.objects.filter(is_active=True).order_by('order', 'id')
    articles = Print3DArticle.objects.filter(is_active=True).order_by('order', 'id')
    materials = Print3DMaterial.objects.filter(is_active=True).order_by('order', 'id')
    faqs = Print3DFAQ.objects.filter(is_active=True).order_by('order', 'id')

    from couriers.taxi_service import get_taxi_services

    context = {
        'products': products,
        'categories': categories,
        'selected_cat': selected_cat,
        'has_nfc_cashback': has_nfc,
        'cashback_percent': 5,
        'delivery_standard_fee': 12000,
        'pickup_address': "Guliston shahar, Sayxun ko'chasi 14 (3D Studio & AR Center)",
        'capabilities': capabilities,
        'articles': articles,
        'materials': materials,
        'faqs': faqs,
        'taxi_services': get_taxi_services(),
    }
    return render(request, 'customer/3d_print_studio.html', context)


@csrf_exempt
def print_3d_create_order_api(request):
    """
    POST /3d-print/order/
    Yangi 3D printer buyurtmasini qabul qilish va adminga Telegram bildirishnoma yuborish.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    import uuid
    from decimal import Decimal
    from .models import Print3DProduct, Print3DOrder
    from notifications.services.print3d_notification_service import notify_admin_new_3d_order

    # POST maydonlari (FormData yoki JSON)
    data = request.POST
    files = request.FILES

    customer_name = (data.get('customer_name') or '').strip()
    customer_phone = (data.get('customer_phone') or '').strip()

    if not customer_name or not customer_phone:
        return JsonResponse({'error': "Ism va telefon raqami to'ldirilishi shart!"}, status=400)

    order_number = f"3DP-{random.randint(10000, 99999)}"
    while Print3DOrder.objects.filter(order_number=order_number).exists():
        order_number = f"3DP-{random.randint(10000, 99999)}"

    product_id = data.get('product_id')
    product = None
    base_amount = Decimal('0')

    if product_id:
        product = Print3DProduct.objects.filter(id=product_id, is_active=True).first()
        if product:
            base_amount = Decimal(str(product.base_price))

    custom_title = (data.get('custom_title') or '').strip()
    custom_desc = (data.get('custom_description') or '').strip()

    # Agar maxsus zakaz bo'lsa va narx belgilanmagan bo'lsa, taxminiy bazaviy narx
    if not product and not base_amount:
        base_amount = Decimal(str(data.get('custom_estimated_price', '45000')))

    qty = int(data.get('quantity', 1) or 1)
    if qty < 1:
        qty = 1
    base_amount = base_amount * qty

    # 5% Keshbek chegirmasi
    source = data.get('source', 'web')
    has_cashback = data.get('has_cashback', 'true').lower() in ('true', '1', 'yes')
    discount_amount = Decimal('0')
    if has_cashback:
        discount_amount = (base_amount * Decimal('0.05')).quantize(Decimal('1'))

    # Yetkazib berish turi (pickup / taxi / delivery)
    delivery_type = data.get('delivery_type', 'pickup')
    delivery_address = (data.get('delivery_address') or '').strip()
    delivery_cost = Decimal('0')

    if delivery_type == 'delivery':
        if (base_amount - discount_amount) >= Decimal('100000'):
            delivery_cost = Decimal('0')
        else:
            delivery_cost = Decimal('12000')
    elif delivery_type == 'taxi':
        # Taksi xarajati to'g'ridan-to'g'ri taksichiga to'lanadi
        delivery_cost = Decimal('0')

    final_amount = max(Decimal('0'), (base_amount - discount_amount) + delivery_cost)

    # Fayl / Rasm / Video yuklash
    custom_file = files.get('custom_file') or files.get('file')
    video_file = files.get('video_file')
    dimension_mode = data.get('dimension_mode', 'auto_detect')
    reference_object = data.get('reference_object', 'none')

    order = Print3DOrder.objects.create(
        order_number=order_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        telegram_chat_id=data.get('telegram_chat_id', ''),
        telegram_username=data.get('telegram_username', ''),
        source=source,
        has_cashback=has_cashback,
        product=product,
        custom_title=custom_title or (product.title if product else "Maxsus 3D buyum"),
        custom_description=custom_desc,
        custom_file=custom_file,
        video_file=video_file,
        dimension_mode=dimension_mode,
        reference_object=reference_object,
        material=data.get('material', 'PLA'),
        color=data.get('color', 'Oq / Standart'),
        quantity=qty,
        base_amount=base_amount,
        discount_amount=discount_amount,
        delivery_cost=delivery_cost,
        final_amount=final_amount,
        delivery_type=delivery_type,
        delivery_address=delivery_address,
        status='new',
    )

    # Adminga Telegram bildirishnoma yuborish
    try:
        notify_admin_new_3d_order(order, request=request)
    except Exception as e:
        logger.error(f"Telegram admin 3D order xabari xatosi: {e}")

    return JsonResponse({
        'success': True,
        'order_number': order.order_number,
        'final_amount': float(order.final_amount),
        'discount_amount': float(order.discount_amount),
        'delivery_cost': float(order.delivery_cost),
        'message': f"Buyurtmangiz muvaffaqiyatli qabul qilindi! Buyurtma raqami: {order.order_number}. 5% keshbek qo'llanildi. Usta tez orada siz bilan bog'lanadi."
    })


@csrf_exempt
def print_3d_mark_ready_api(request, order_number):
    """
    POST /3d-print/order/<order_number>/ready/
    Admin / Usta tomonidan buyurtmani tayyor deb belgilash va mijozga
    avtomatik ravishda tayyor mahsulot rasmi, lokatsiya va dastavka hisobi bilan xabar yuborish.
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST supported")

    from .models import Print3DOrder
    from notifications.services.print3d_notification_service import notify_customer_3d_order_ready

    order = Print3DOrder.objects.filter(order_number=order_number).first()
    if not order:
        return JsonResponse({'error': 'Buyurtma topilmadi'}, status=404)

    # Agar yangi tayyor rasm yuklangan bo'lsa
    if 'finished_photo' in request.FILES:
        order.finished_photo = request.FILES['finished_photo']

    if 'delivery_cost' in request.POST:
        try:
            from decimal import Decimal
            order.delivery_cost = Decimal(str(request.POST.get('delivery_cost')))
            order.final_amount = max(Decimal('0'), (order.base_amount - order.discount_amount) + order.delivery_cost)
        except Exception:
            pass

    order.status = 'ready'
    order.save()

    # Mijozga Telegram orqali xabar yuborish
    notified = False
    try:
        notified = notify_customer_3d_order_ready(order, request=request)
    except Exception as e:
        logger.error(f"Mijozga 3D tayyorlik xabari yuborishda xato: {e}")

    return JsonResponse({
        'success': True,
        'order_number': order.order_number,
        'status': order.status,
        'notified_customer': notified,
        'message': "Buyurtma 'Tayyor' deb belgilandi va mijozga Telegram orqali xabar, rasm va lokatsiya yuborildi!"
    })

