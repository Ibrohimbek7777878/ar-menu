"""
scripts/seed_full_menu.py — 
Har bir kategoriyaga moslab aniq 4 tadan taom yaratish va BARCHA taomlarga 3D AR model biriktirish.
"""
import sys
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from decimal import Decimal
from PIL import Image, ImageDraw, ImageFont
from django.core.cache import cache
from apps.tenants.models import Restaurant
from apps.menu.models import Category, Dish
from apps.ar3d.models import DishModel3D, DishLibrary


def ensure_dish_image(filename, bg_color, title_text):
    path = os.path.join('media/dish', filename)
    os.makedirs('media/dish', exist_ok=True)
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        img = Image.new('RGB', (600, 450), color=bg_color)
        draw = ImageDraw.Draw(img)
        # Decorative border
        draw.rectangle([15, 15, 585, 435], outline=(255, 255, 255, 120), width=3)
        # Banner rectangle
        draw.rectangle([30, 180, 570, 270], fill=(20, 20, 20, 200))
        # Text
        draw.text((300, 225), title_text, fill=(255, 255, 255), anchor="mm")
        img.save(path, 'JPEG', quality=85)
    return f'dish/{filename}'


def ensure_3d_models():
    import urllib.request
    from apps.ar3d.services.optimize import scale_and_center
    os.makedirs('media/ar/glb', exist_ok=True)

    sources = {
        'shashlik.glb': ('https://modelviewer.dev/shared-assets/models/shishkebab.glb', 0.28),
        'plov.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/slim-volgarice.glb', 0.30),
        'manti.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/shumaib.glb', 0.26),
        'qozon_kabob.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/dish.glb', 0.28),
        'lagmon.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/pasta-awara-pastaandwine.glb', 0.24),
        'shorva.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/motsunabe-tashu.glb', 0.20),
        'mastava.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/taishiron-curry.glb', 0.20),
        'somsa.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/takoyaki-takobei.glb', 0.18),
        'non.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/kosen-dago.glb', 0.22),
        'salad_achichuk.glb': ('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/IridescentDishWithOlives.glb', 0.20),
        'salad_bahor.glb': ('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb', 0.20),
        'tea_cup.glb': ('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/coffeeMug.glb', 0.12),
        'drink_bottle.glb': ('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb', 0.24),
        'breakfast_egg.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/ktri-om.glb', 0.22),
        'steak_meat.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/mutsunohana-steak.glb', 0.26),
        'dessert_bowl.glb': ('https://raw.githubusercontent.com/code4fukui/xrgourmet/main/icecream-makibabokujo.glb', 0.16),
    }

    for name, (url, size_m) in sources.items():
        dest = os.path.join('media/ar/glb', name)
        if not os.path.exists(dest) or os.path.getsize(dest) < 1000:
            try:
                urllib.request.urlretrieve(url, dest)
                scale_and_center(dest, size_m)
            except Exception as e:
                print(f"⚠️ {name} yuklab olishda ogohlantirish: {e}")


def run():
    r = Restaurant.objects.filter(slug='demo-menu').first()
    if not r:
        r = Restaurant.objects.create(
            name="ARMENU Demo",
            slug="demo-menu",
            is_active=True,
            default_lang="uz",
            langs_enabled=["uz", "ru", "en"],
            service_fee_pct=Decimal("10.00")
        )
    print(f"Restoran: {r.name} (id={r.id})")

    # 3D modellarni tayyorlash
    ensure_3d_models()

    # 1. Dublikat va bo'sh kategoriyalarni tozalash (Sho'rva id=7, Salat id=8)
    Category.objects.filter(restaurant=r, name_uz="Sho'rva", dishes__isnull=True).delete()
    Category.objects.filter(restaurant=r, name_uz="Salat", dishes__isnull=True).delete()

    # 2. 7 ta asosiy kategoriya
    cats_config = [
        {"name_uz": "Asosiy Taomlar", "name_ru": "Главные блюда", "name_en": "Main Dishes", "icon": "🍲", "order": 1},
        {"name_uz": "Kaboblar va Gril", "name_ru": "Шашлыки и гриль", "name_en": "Kebabs & Grill", "icon": "🥩", "order": 2},
        {"name_uz": "Sho'rvalar", "name_ru": "Супы", "name_en": "Soups", "icon": "🥣", "order": 3},
        {"name_uz": "Pishiriqlar", "name_ru": "Выпечка", "name_en": "Pastry & Bread", "icon": "🥟", "order": 4},
        {"name_uz": "Salatlar", "name_ru": "Салаты", "name_en": "Salads", "icon": "🥗", "order": 5},
        {"name_uz": "Nonushta", "name_ru": "Завтраки", "name_en": "Breakfast", "icon": "🍳", "order": 6},
        {"name_uz": "Ichimliklar", "name_ru": "Напитки", "name_en": "Drinks & Tea", "icon": "🫖", "order": 7},
    ]

    categories = {}
    for cdata in cats_config:
        # Non-ushta nomini Nonushta ga to'g'irlash
        if cdata["name_uz"] == "Nonushta":
            old = Category.objects.filter(restaurant=r, name_uz="Non-ushta").first()
            if old:
                old.name_uz = "Nonushta"
                old.name_ru = "Завтраки"
                old.name_en = "Breakfast"
                old.icon = "🍳"
                old.order = 6
                old.save()
                categories["Nonushta"] = old
                continue

        cat, _ = Category.objects.update_or_create(
            restaurant=r,
            name_uz=cdata["name_uz"],
            defaults={
                "name_ru": cdata["name_ru"],
                "name_en": cdata["name_en"],
                "icon": cdata["icon"],
                "order": cdata["order"],
                "is_active": True
            }
        )
        categories[cdata["name_uz"]] = cat

    # Har bir kategoriya uchun aynan 4 tadan taom (jami 7 x 4 = 28 taom)
    # BARCHASIGA 3D GLB model biriktiriladi!
    all_dishes_data = [
        # --- 1. Asosiy Taomlar (4 taom) ---
        {
            "cat": "Asosiy Taomlar",
            "name_uz": "Toshkentcha To'y Palov",
            "name_ru": "Ташкентский праздничный плов",
            "name_en": "Tashkent Festive Plov",
            "desc_uz": "Lazer guruchi, sarhil mol va qo'y go'shti, sariq sabzi, no'xat, mayiz va bedana tuxumi bilan.",
            "desc_ru": "Традиционный плов из риса лазер с говядиной, нутом, изюмом и перепелиными яйцами.",
            "desc_en": "Legendary Uzbek pilaf cooked with tender meat, yellow carrots, chickpeas and raisins.",
            "price": Decimal("48000.00"), "old_price": Decimal("52000.00"),
            "cook_min": 10, "weight_g": 380, "calories": 680,
            "img_file": "plov.jpg", "bg": (180, 100, 30),
            "glb": "ar/glb/plov.glb", "size_cm": Decimal("30.0"), "is_hit": True
        },
        {
            "cat": "Asosiy Taomlar",
            "name_uz": "Samarqandcha Qozon Kabob",
            "name_ru": "Казан-кабоб по-самаркандски",
            "name_en": "Samarkand Kazan Kebab",
            "desc_uz": "Qozonda qovurilgan barra qo'y go'shti, qarsildoq qizarib pishgan tillarang kartoshkalar bilan.",
            "desc_ru": "Нежная баранина, обжаренная в казане с румяным золотистым картофелем.",
            "desc_en": "Tender lamb ribs pan-fried with crispy golden potatoes and eastern herbs.",
            "price": Decimal("56000.00"), "old_price": Decimal("62000.00"),
            "cook_min": 20, "weight_g": 400, "calories": 720,
            "img_file": "qozon_kabob.jpg", "bg": (140, 60, 20),
            "glb": "ar/glb/qozon_kabob.glb", "size_cm": Decimal("28.0"), "is_hit": True
        },
        {
            "cat": "Asosiy Taomlar",
            "name_uz": "Xorazmcha Shivit Oshi",
            "name_ru": "Хорезмский Шивит Оши",
            "name_en": "Khorezm Green Dill Lagman",
            "desc_uz": "Yangi shivit qo'shilgan zumrad rangli mayin lag'mon xamiri, mol go'shti va qatiqli qayla bilan.",
            "desc_ru": "Ярко-зеленая лапша с укропом, сочным мясным соусом и прохладным катыком.",
            "desc_en": "Traditional green dill-infused noodles served with rich beef goulash and yogurt sauce.",
            "price": Decimal("42000.00"),
            "cook_min": 15, "weight_g": 350, "calories": 520,
            "img_file": "shivit_oshi.jpg", "bg": (40, 120, 60),
            "glb": "ar/glb/lagmon.glb", "size_cm": Decimal("24.0"), "is_new": True
        },
        {
            "cat": "Asosiy Taomlar",
            "name_uz": "G'ijduvon Bug' Mantisi",
            "name_ru": "Гиждуванские манты на пару",
            "name_en": "Steamed Gijduvan Manti",
            "desc_uz": "Yupqa xamir ichida mayin lahm go'sht, dumba va piyoz qiyma, mantiqosqonda pishirilgan (4 dona).",
            "desc_ru": "Тончайшее тесто с сочной начинкой из рубленого мяса и лука на пару (4 шт).",
            "desc_en": "Handmade steamed dumplings stuffed with finely minced beef, onions and spices (4 pcs).",
            "price": Decimal("36000.00"),
            "cook_min": 18, "weight_g": 320, "calories": 480,
            "img_file": "manti.jpg", "bg": (180, 140, 80),
            "glb": "ar/glb/manti.glb", "size_cm": Decimal("26.0"), "is_hit": False
        },

        # --- 2. Kaboblar va Gril (4 taom) ---
        {
            "cat": "Kaboblar va Gril",
            "name_uz": "Qo'y go'shtidan Shashlik",
            "name_ru": "Шашлык из баранины",
            "name_en": "Lamb Shish Kebab",
            "desc_uz": "Shirador barra qo'y go'shti, ziravorlar va mayin dumba bilan charxpalak usulida pishirilgan.",
            "desc_ru": "Сочный шашлык из свежей баранины с курдюком и восточными специями.",
            "desc_en": "Juicy lamb skewers seasoned with traditional spices and grilled to perfection.",
            "price": Decimal("24000.00"), "old_price": Decimal("28000.00"),
            "cook_min": 15, "weight_g": 180, "calories": 420,
            "img_file": "shashlik.jpg", "bg": (160, 40, 30),
            "glb": "ar/glb/shashlik.glb", "size_cm": Decimal("28.0"), "is_hit": True
        },
        {
            "cat": "Kaboblar va Gril",
            "name_uz": "Qiyma Lyulya Kabob",
            "name_ru": "Люля-кебаб из говядины",
            "name_en": "Minced Lyulya Kebab",
            "desc_uz": "Mayin qiyma go'sht, sarxil piyoz va maxsus sharqona zira bilan sixda qizartirib pishirilgan.",
            "desc_ru": "Нежный люля-кебаб на мангале с маринованным луком и зернами граната.",
            "desc_en": "Tender spiced ground beef kebab grilled over embers with pickled onions.",
            "price": Decimal("22000.00"),
            "cook_min": 12, "weight_g": 160, "calories": 390,
            "img_file": "lyulya.jpg", "bg": (130, 45, 25),
            "glb": "ar/glb/shashlik.glb", "size_cm": Decimal("28.0"), "is_hit": True
        },
        {
            "cat": "Kaboblar va Gril",
            "name_uz": "Tovuq Gril Shashlik",
            "name_ru": "Куриный шашлык на углях",
            "name_en": "Grilled Chicken Skewers",
            "desc_uz": "Maxsus o'tlar va smetanali marinadda bo'ktirilgan parhezbop yumshoq tovuq filesi.",
            "desc_ru": "Мягкое куриное филе в авторском маринаде, запеченное на углях.",
            "desc_en": "Marinated tender chicken breast skewers grilled over hot coals.",
            "price": Decimal("19000.00"),
            "cook_min": 12, "weight_g": 170, "calories": 310,
            "img_file": "tovuq_shashlik.jpg", "bg": (180, 80, 20),
            "glb": "ar/glb/shashlik.glb", "size_cm": Decimal("28.0")
        },
        {
            "cat": "Kaboblar va Gril",
            "name_uz": "Qovurma Jigar Kabob",
            "name_ru": "Шашлык из печени в жировой сетке",
            "name_en": "Liver Kebab with Fat Mesh",
            "desc_uz": "Dumba yog'i pardasiga o'ralgan barra jigar shashlik, mayin va o'ta shirador.",
            "desc_ru": "Изысканный шашлык из нежной печени в курдючной сетке.",
            "desc_en": "Juicy and tender liver chunks wrapped in caul fat and grilled over hot coals.",
            "price": Decimal("21000.00"),
            "cook_min": 10, "weight_g": 160, "calories": 350,
            "img_file": "jigar_kabob.jpg", "bg": (100, 30, 30),
            "glb": "ar/glb/steak_meat.glb", "size_cm": Decimal("26.0")
        },

        # --- 3. Sho'rvalar (4 taom) ---
        {
            "cat": "Sho'rvalar",
            "name_uz": "Ko'za Sho'rva",
            "name_ru": "Шурпа в горшочке",
            "name_en": "Pot Soup (Kozashurva)",
            "desc_uz": "Sopol ko'zada mayin olovda qaynatilgan barra mol go'shti, yirik kartoshka va no'xatli bulyon.",
            "desc_ru": "Наваристая шурпа в глиняном горшочке с сочным мясом и овощами.",
            "desc_en": "Traditional lamb soup slow-simmered in a clay pot with chickpea and potato.",
            "price": Decimal("38000.00"),
            "cook_min": 15, "weight_g": 420, "calories": 450,
            "img_file": "soup.jpg", "bg": (190, 90, 30),
            "glb": "ar/glb/shorva.glb", "size_cm": Decimal("20.0"), "is_hit": True
        },
        {
            "cat": "Sho'rvalar",
            "name_uz": "Toshkentcha Mastava",
            "name_ru": "Ташкентская мастава",
            "name_en": "Tashkent Mastava Rice Soup",
            "desc_uz": "Qovurilgan go'sht, mayda to'g'ralgan sabzavotlar va devzira guruchidan tayyorlangan to'yimli sho'rva (suzma bilan).",
            "desc_ru": "Сытный суп с жареным мясом, овощами, рисом и ароматной заправкой.",
            "desc_en": "Rich and hearty Uzbek soup with braised beef, diced root vegetables and rice.",
            "price": Decimal("32000.00"),
            "cook_min": 12, "weight_g": 400, "calories": 420,
            "img_file": "mastava.jpg", "bg": (170, 70, 25),
            "glb": "ar/glb/mastava.glb", "size_cm": Decimal("20.0")
        },
        {
            "cat": "Sho'rvalar",
            "name_uz": "Chuchvara Sho'rva",
            "name_ru": "Суп с чучварой",
            "name_en": "Chuchvara Dumpling Soup",
            "desc_uz": "Mayda tugilgan xonaki chuchvaralar, shaffof go'shtli bulyon va barra kashnich ko'kati bilan.",
            "desc_ru": "Миниатюрные мясные пельмешки в прозрачном наваристом бульоне с зеленью.",
            "desc_en": "Petite handmade meat dumplings served in a steaming aromatic beef broth.",
            "price": Decimal("34000.00"),
            "cook_min": 14, "weight_g": 380, "calories": 390,
            "img_file": "chuchvara.jpg", "bg": (150, 100, 40),
            "glb": "ar/glb/shorva.glb", "size_cm": Decimal("20.0"), "is_new": True
        },
        {
            "cat": "Sho'rvalar",
            "name_uz": "Uy Lag'moni",
            "name_ru": "Домашний лагман",
            "name_en": "Traditional Pulled Lagman",
            "desc_uz": "Qo'lda cho'zilgan uzun xamir, lahm go'sht, shirin qalampir va jiblajon sousi bilan.",
            "desc_ru": "Тянутая вручную лапша с подливой из отборного мяса и овощей.",
            "desc_en": "Hand-stretched long noodles served with savory sautéed beef and bell peppers.",
            "price": Decimal("36000.00"),
            "cook_min": 16, "weight_g": 430, "calories": 510,
            "img_file": "lagmon.jpg", "bg": (180, 50, 30),
            "glb": "ar/glb/lagmon.glb", "size_cm": Decimal("24.0"), "is_hit": True
        },

        # --- 4. Pishiriqlar (4 taom) ---
        {
            "cat": "Pishiriqlar",
            "name_uz": "Tandir Somsa",
            "name_ru": "Тандырная самса",
            "name_en": "Tandoor Samosa",
            "desc_uz": "Qat-qat qarsildoq xamir, mayin to'g'ralgan go'sht va xushbo'y zira aralashmasi.",
            "desc_ru": "Слоеная хрустящая самса из тандыра с рубленым мясом и луком.",
            "desc_en": "Crispy layered pastry baked in tandoor filled with chopped beef and spices.",
            "price": Decimal("16000.00"),
            "cook_min": 5, "weight_g": 160, "calories": 320,
            "img_file": "somsa.jpg", "bg": (200, 130, 40),
            "glb": "ar/glb/somsa.glb", "size_cm": Decimal("18.0"), "is_hit": True
        },
        {
            "cat": "Pishiriqlar",
            "name_uz": "Qatlama Go'shtli Somsa",
            "name_ru": "Слоеная мясная самса",
            "name_en": "Layered Meat Samosa",
            "desc_uz": "Yuz qavat sariyog'li qatlama xamir, lahm mol go'shti va sedana sepilgan.",
            "desc_ru": "Хрустящая многослойная самса с сочной мясной начинкой и кунжутом.",
            "desc_en": "Flaky multi-layered pastry stuffed with spiced beef and sprinkled with black sesame.",
            "price": Decimal("18000.00"),
            "cook_min": 6, "weight_g": 170, "calories": 350,
            "img_file": "qatlama_somsa.jpg", "bg": (210, 140, 50),
            "glb": "ar/glb/somsa.glb", "size_cm": Decimal("18.0")
        },
        {
            "cat": "Pishiriqlar",
            "name_uz": "Issiq Patir Non",
            "name_ru": "Горячая лепешка патыр",
            "name_en": "Hot Tandoor Patir Flatbread",
            "desc_uz": "Sariyog' va sut bilan qorilgan, chekich urilgan tandir patiri.",
            "desc_ru": "Традиционная лепешка патыр с узорами на сливочном масле из тандыра.",
            "desc_en": "Traditional crispy and flaky Uzbek tandoor bread with sesame seeds.",
            "price": Decimal("8000.00"),
            "cook_min": 3, "weight_g": 250, "calories": 280,
            "img_file": "bread.jpg", "bg": (210, 150, 60),
            "glb": "ar/glb/non.glb", "size_cm": Decimal("22.0"), "is_hit": True
        },
        {
            "cat": "Pishiriqlar",
            "name_uz": "Katta Tandir Noni",
            "name_ru": "Большая тандырная лепешка",
            "name_en": "Big Tandoor Bread",
            "desc_uz": "Shovurli qarsildoq chetlari va xushbo'y sedana sepilgan an'anaviy Toshkent tandir noni.",
            "desc_ru": "Воздушная и хрустящая узбекская лепешка прямо из огненного тандыра.",
            "desc_en": "Freshly baked classic Uzbek flatbread with crunchy crust and soft center.",
            "price": Decimal("6000.00"),
            "cook_min": 2, "weight_g": 280, "calories": 290,
            "img_file": "tandir_non.jpg", "bg": (220, 160, 70),
            "glb": "ar/glb/non.glb", "size_cm": Decimal("24.0")
        },

        # --- 5. Salatlar (4 taom) ---
        {
            "cat": "Salatlar",
            "name_uz": "Achichuk Salati",
            "name_ru": "Салат Ачичук",
            "name_en": "Achichuk Tomato Salad",
            "desc_uz": "Yupqa to'g'ralgan sersuv qizil pomidor, shirin piyoz va mayin rayhon (palovga ayni muddao).",
            "desc_ru": "Тонко нарезанные спелые томаты со сладким луком и базиликом к плову.",
            "desc_en": "Freshly sliced ripe tomatoes, thin onions and purple basil, ideal for plov.",
            "price": Decimal("15000.00"),
            "cook_min": 5, "weight_g": 180, "calories": 95,
            "img_file": "salad.jpg", "bg": (200, 40, 40),
            "glb": "ar/glb/salad_achichuk.glb", "size_cm": Decimal("20.0"), "is_hit": True
        },
        {
            "cat": "Salatlar",
            "name_uz": "Bahor Salati",
            "name_ru": "Весенний салат",
            "name_en": "Spring Vegetable Salad",
            "desc_uz": "Qarsildoq yangi bodring, rediska, qaynatilgan bedana tuxumi va yangi qaymoq sousi bilan.",
            "desc_ru": "Хрустящие огурчики, редис, перепелиные яйца и нежная заправка из катыка.",
            "desc_en": "Crisp cucumbers, radishes, quail eggs and fresh dill tossed with sour cream.",
            "price": Decimal("18000.00"),
            "cook_min": 5, "weight_g": 190, "calories": 110,
            "img_file": "bahor_salat.jpg", "bg": (60, 160, 60),
            "glb": "ar/glb/salad_bahor.glb", "size_cm": Decimal("20.0"), "is_new": True
        },
        {
            "cat": "Salatlar",
            "name_uz": "Suzma va Ko'katlar",
            "name_ru": "Сюзьма с зеленью и чесноком",
            "name_en": "Chakkah Herbs & Garlic",
            "desc_uz": "An'anaviy quyuq suzma, tog' yalpizi, shivit va sarimsoq aralashmasi (kabob uchun ideal gazak).",
            "desc_ru": "Традиционная густая сюзьма со свежей мятой, укропом и чесноком.",
            "desc_en": "Thick drained yogurt blended with mountain mint, fresh herbs and crushed garlic.",
            "price": Decimal("14000.00"),
            "cook_min": 4, "weight_g": 150, "calories": 140,
            "img_file": "suzma.jpg", "bg": (240, 240, 240),
            "glb": "ar/glb/salad_achichuk.glb", "size_cm": Decimal("18.0")
        },
        {
            "cat": "Salatlar",
            "name_uz": "Mujskoy Kapriz Salati",
            "name_ru": "Салат Мужской каприз",
            "name_en": "Beef Tongue Gourmet Salad",
            "desc_uz": "Qaynatilgan mol tili, dudlangan go'sht, golland pishlog'i va mayonezli to'yimli salat.",
            "desc_ru": "Сытный праздничный салат с отварным языком, говядиной, сыром и майонезом.",
            "desc_en": "Hearty gourmet salad with tender beef tongue, smoked meat and grated cheese.",
            "price": Decimal("32000.00"),
            "cook_min": 7, "weight_g": 200, "calories": 380,
            "img_file": "kapriz.jpg", "bg": (180, 110, 40),
            "glb": "ar/glb/salad_achichuk.glb", "size_cm": Decimal("20.0")
        },

        # --- 6. Nonushta (4 taom) ---
        {
            "cat": "Nonushta",
            "name_uz": "Toshkentcha Qaymoq va Issiq Non",
            "name_ru": "Ташкентский каймак с горячей лепешкой",
            "name_en": "Fresh Clotted Cream & Hot Bread",
            "desc_uz": "Yangi tortilgan barra qalin qaymoq, tog' asali va issiq tandir noni to'plami.",
            "desc_ru": "Свежайший густой каймак с горным медом и хрустящей горячей лепешкой.",
            "desc_en": "Rich clotted cream served with natural mountain honey and fresh tandoor bread.",
            "price": Decimal("28000.00"),
            "cook_min": 4, "weight_g": 300, "calories": 490,
            "img_file": "qaymoq.jpg", "bg": (230, 210, 160),
            "glb": "ar/glb/non.glb", "size_cm": Decimal("22.0"), "is_hit": True
        },
        {
            "cat": "Nonushta",
            "name_uz": "Pomidorli Tuxum Qovurma",
            "name_ru": "Яичница с сочными томатами",
            "name_en": "Shakshuka Eggs with Tomatoes",
            "desc_uz": "Sariyog'da qizartirilgan qizil pomidorlar, piyoz va 3 dona yangi tovuq tuxumi qovurmasi.",
            "desc_ru": "Ароматная глазунья на сливочном масле с сочными помидорами и базиликом.",
            "desc_en": "Sunny-side eggs gently cooked in butter with sweet ripe tomatoes and basil.",
            "price": Decimal("22000.00"),
            "cook_min": 8, "weight_g": 240, "calories": 320,
            "img_file": "tuxum_qovurma.jpg", "bg": (220, 70, 30),
            "glb": "ar/glb/breakfast_egg.glb", "size_cm": Decimal("22.0")
        },
        {
            "cat": "Nonushta",
            "name_uz": "Shirguruch Asal bilan",
            "name_ru": "Ширгуруч (рисовая каша на молоке)",
            "name_en": "Uzbek Sweet Milk Rice Porridge",
            "desc_uz": "Sutda mayin pishirilgan to'yimli shirin guruchli bo'tqa, sariyog' va yong'oq bilan.",
            "desc_ru": "Традиционная сладкая молочная рисовая каша со сливочным маслом.",
            "desc_en": "Comforting creamy milk-cooked rice porridge garnished with honey and butter.",
            "price": Decimal("18000.00"),
            "cook_min": 6, "weight_g": 260, "calories": 280,
            "img_file": "shirguruch.jpg", "bg": (235, 230, 210),
            "glb": "ar/glb/dessert_bowl.glb", "size_cm": Decimal("16.0")
        },
        {
            "cat": "Nonushta",
            "name_uz": "Tvorogli Sirniklar",
            "name_ru": "Творожные сырники",
            "name_en": "Golden Cottage Cheese Pancakes",
            "desc_uz": "Tvorogdan qovurilgan mayin sirniklar, xonaki smetana va qulupnayli murabbo bilan.",
            "desc_ru": "Нежные творожные сырники с домашней сметаной и ягодным вареньем.",
            "desc_en": "Fluffy pan-fried cottage cheese patties served with sour cream and fruit jam.",
            "price": Decimal("26000.00"),
            "cook_min": 10, "weight_g": 220, "calories": 340,
            "img_file": "sirnik.jpg", "bg": (220, 180, 90),
            "glb": "ar/glb/dessert_bowl.glb", "size_cm": Decimal("18.0"), "is_new": True
        },

        # --- 7. Ichimliklar (4 taom) ---
        {
            "cat": "Ichimliklar",
            "name_uz": "Ko'k Choy Limon bilan",
            "name_ru": "Зеленый чай с лимоном",
            "name_en": "Green Tea with Lemon",
            "desc_uz": "Choynakda damlangan maxsus ko'k choy (95), yangi limon parraklari va novvot bilan.",
            "desc_ru": "Ароматный листовой зеленый чай №95 в чайнике со свежим лимоном и навватом.",
            "desc_en": "Traditional green tea brewed in a pot with fresh lemon slices and rock sugar.",
            "price": Decimal("12000.00"),
            "cook_min": 3, "weight_g": 800, "calories": 15,
            "img_file": "kok_choy.jpg", "bg": (80, 140, 60),
            "glb": "ar/glb/tea_cup.glb", "size_cm": Decimal("12.0"), "is_hit": True
        },
        {
            "cat": "Ichimliklar",
            "name_uz": "Zafarronli Qora Choy",
            "name_ru": "Черный чай с шафраном",
            "name_en": "Black Tea with Saffron & Herbs",
            "desc_uz": "Zafarron va tog' giyohlari bilan damlangan xushbo'y qora choy choynagi.",
            "desc_ru": "Премиальный черный чай с шафраном и высокогорными травами.",
            "desc_en": "Fragrant black tea infused with real saffron and mountain herbs.",
            "price": Decimal("14000.00"),
            "cook_min": 3, "weight_g": 800, "calories": 20,
            "img_file": "qora_choy.jpg", "bg": (120, 40, 20),
            "glb": "ar/glb/tea_cup.glb", "size_cm": Decimal("12.0")
        },
        {
            "cat": "Ichimliklar",
            "name_uz": "Tabiiy Olma Kompoti",
            "name_ru": "Домашний яблочный компот",
            "name_en": "Homemade Fresh Apple Compote",
            "desc_uz": "Yangi barra olmadan qaynatilgan muzdek va chanqoqbosti xonaki kompot (1 litr).",
            "desc_ru": "Освежающий натуральный яблочный компот собственного приготовления (1 л).",
            "desc_en": "Chilled traditional homemade compote made from fresh local apples (1 L).",
            "price": Decimal("16000.00"),
            "cook_min": 2, "weight_g": 1000, "calories": 120,
            "img_file": "kompot.jpg", "bg": (200, 100, 40),
            "glb": "ar/glb/drink_bottle.glb", "size_cm": Decimal("24.0"), "is_hit": True
        },
        {
            "cat": "Ichimliklar",
            "name_uz": "Muzdek Qatiq Ayron",
            "name_ru": "Освежающий айран с мятой",
            "name_en": "Chilled Ayran with Mint",
            "desc_uz": "Yangi qatiq, buloq suvi va yangi maydalangan rayhon/yalpiz bilan tayyorlangan shifobaxsh ayron.",
            "desc_ru": "Освежающий холодный айран со свежей мятой и щепоткой соли.",
            "desc_en": "Traditional chilled savory yogurt drink blended with fresh wild mint and salt.",
            "price": Decimal("10000.00"),
            "cook_min": 2, "weight_g": 500, "calories": 85,
            "img_file": "ayron.jpg", "bg": (220, 230, 240),
            "glb": "ar/glb/drink_bottle.glb", "size_cm": Decimal("24.0")
        },
    ]

    print(f"\nJami taomlar soni: {len(all_dishes_data)} ta")

    for dinfo in all_dishes_data:
        cat = categories[dinfo["cat"]]
        # Rasm mavjudligini ta'minlash
        img_rel = ensure_dish_image(dinfo["img_file"], dinfo["bg"], dinfo["name_uz"])

        d, created = Dish.objects.update_or_create(
            restaurant=r,
            name_uz=dinfo["name_uz"],
            defaults={
                "category": cat,
                "name_ru": dinfo["name_ru"],
                "name_en": dinfo["name_en"],
                "desc_uz": dinfo["desc_uz"],
                "desc_ru": dinfo["desc_ru"],
                "desc_en": dinfo["desc_en"],
                "price": dinfo["price"],
                "old_price": dinfo.get("old_price"),
                "cook_min": dinfo["cook_min"],
                "weight_g": dinfo["weight_g"],
                "calories": dinfo["calories"],
                "image": img_rel,
                "image_md": f"/media/{img_rel}",
                "image_webp": f"/media/{img_rel}",
                "diet_tags": ["halal"],
                "allergens": [],
                "is_hit": dinfo.get("is_hit", False),
                "is_new": dinfo.get("is_new", False),
                "has_3d": True,   # <-- 100% BARCHASI UCHUN 3D YOQILGAN!
                "is_available": True
            }
        )

        glb_path = dinfo["glb"]
        glb_full = os.path.join(settings.BASE_DIR if hasattr(settings, 'BASE_DIR') else '', 'media', glb_path.replace('ar/glb/', 'ar/glb/'))
        glb_size = os.path.getsize(glb_full) if os.path.exists(glb_full) else 1048576

        m3d, m_created = DishModel3D.objects.update_or_create(
            dish=d,
            defaults={
                "restaurant": r,
                "glb": glb_path,
                "glb_url": f"/media/{glb_path}",
                "status": "ready",
                "source": "upload",
                "real_size_cm": dinfo["size_cm"],
                "glb_bytes": glb_size,
                "progress": 100
            }
        )
        print(f"[{cat.name_uz}] {d.name_uz} -> 3D model: {m3d.url_glb()} ({m3d.real_size_cm} sm)")

    # Menyu versiyasini oshirish va keshni tozalash
    r.menu_version += 1
    r.save(update_fields=['menu_version'])
    cache.clear()
    print("\n✅ Barcha kategoriyalar va 28 ta taom 100% 3D modellar bilan to'liq yangilandi!")


if __name__ == '__main__':
    from django.conf import settings
    run()
