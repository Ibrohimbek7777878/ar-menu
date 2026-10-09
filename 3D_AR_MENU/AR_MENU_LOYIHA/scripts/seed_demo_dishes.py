"""
seed_demo_dishes.py — demo-menu restoranini haqiqiy milliy taomlar,
fotosuratlar va 3D AR model bilan boyitish.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from decimal import Decimal
from django.core.cache import cache
from apps.tenants.models import Restaurant
from apps.menu.models import Category, Dish, DishModifier
from apps.ar3d.models import DishModel3D

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

    # 1. Kategoriyalarni yaratish yoki yangilash
    cats_data = [
        {"name_uz": "Asosiy Taomlar", "name_ru": "Главные блюда", "name_en": "Main Dishes", "icon": "🍲", "order": 1},
        {"name_uz": "Kaboblar va Gril", "name_ru": "Шашлыки и гриль", "name_en": "Kebabs & Grill", "icon": "🥩", "order": 2},
        {"name_uz": "Sho'rvalar", "name_ru": "Супы", "name_en": "Soups", "icon": "🥣", "order": 3},
        {"name_uz": "Pishiriqlar", "name_ru": "Выпечка", "name_en": "Pastry & Bread", "icon": "🥟", "order": 4},
        {"name_uz": "Salatlar", "name_ru": "Салаты", "name_en": "Salads", "icon": "🥗", "order": 5},
    ]

    categories = {}
    for cdata in cats_data:
        cat, _ = Category.objects.get_or_create(
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

    # Eski generik taomlarni tozalash (Non-ushta 1..3, Sho'rva 1..3, Salat 1..3)
    Dish.objects.filter(restaurant=r, name_uz__startswith="Non-ushta").delete()
    Dish.objects.filter(restaurant=r, name_uz__startswith="Sho'rva 1").delete()
    Dish.objects.filter(restaurant=r, name_uz__startswith="Sho'rva 2").delete()
    Dish.objects.filter(restaurant=r, name_uz__startswith="Sho'rva 3").delete()
    Dish.objects.filter(restaurant=r, name_uz__startswith="Salat 1").delete()
    Dish.objects.filter(restaurant=r, name_uz__startswith="Salat 2").delete()
    Dish.objects.filter(restaurant=r, name_uz__startswith="Salat 3").delete()

    dishes_data = [
        {
            "cat": "Kaboblar va Gril",
            "name_uz": "Qo'y go'shtidan Shashlik",
            "name_ru": "Шашлык из баранины",
            "name_en": "Lamb Shish Kebab",
            "desc_uz": "Shirador barra qo'y go'shti, ziravorlar va mayin dumba bilan charxpalak usulida pishirilgan.",
            "desc_ru": "Сочный шашлык из свежей баранины с курдюком и восточными специями.",
            "desc_en": "Juicy lamb skewers seasoned with traditional spices and grilled to perfection.",
            "price": Decimal("24000.00"),
            "old_price": Decimal("28000.00"),
            "cook_min": 18,
            "weight_g": 180,
            "calories": 420,
            "image": "dish/shashlik.jpg",
            "image_md": "/media/dish/shashlik.jpg",
            "image_webp": "/media/dish/shashlik.jpg",
            "diet_tags": ["halal"],
            "allergens": [],
            "is_hit": True,
            "is_new": False,
            "has_3d": True,
            "glb_path": "ar/glb/shashlik.glb",
            "glb_url": "/media/ar/glb/shashlik.glb",
            "real_size_cm": Decimal("28.0")
        },
        {
            "cat": "Asosiy Taomlar",
            "name_uz": "Toshkentcha To'y Palov",
            "name_ru": "Ташкентский праздничный плов",
            "name_en": "Tashkent Festive Plov",
            "desc_uz": "Lazer guruchi, sarhil mol va qo'y go'shti, no'xat, mayiz va bedana tuxumi bilan.",
            "desc_ru": "Традиционный плов из риса лазер с говядиной, бараниной, нутом, изюмом и перепелиными яйцами.",
            "desc_en": "Legendary Uzbek pilaf cooked with tender meat, yellow carrots, chickpeas and raisins.",
            "price": Decimal("45000.00"),
            "cook_min": 10,
            "weight_g": 350,
            "calories": 680,
            "image": "dish/plov.jpg",
            "image_md": "/media/dish/plov.jpg",
            "image_webp": "/media/dish/plov.jpg",
            "diet_tags": ["halal"],
            "allergens": ["eggs"],
            "is_hit": True,
            "is_new": False,
            "has_3d": False,
        },
        {
            "cat": "Pishiriqlar",
            "name_uz": "Tandir Somsa",
            "name_ru": "Тандырная самса",
            "name_en": "Tandoor Samosa",
            "desc_uz": "Qat-qat qarsildoq xamir, mayin to'g'ralgan go'sht va xushbo'y piyoz aralashmasi.",
            "desc_ru": "Слоеная хрустящая самса из тандыра с рубленым мясом и луком.",
            "desc_en": "Crispy layered pastry baked in tandoor filled with chopped beef and spices.",
            "price": Decimal("16000.00"),
            "cook_min": 5,
            "weight_g": 160,
            "calories": 320,
            "image": "dish/somsa.jpg",
            "image_md": "/media/dish/somsa.jpg",
            "image_webp": "/media/dish/somsa.jpg",
            "diet_tags": ["halal"],
            "allergens": ["gluten"],
            "is_hit": True,
            "is_new": False,
            "has_3d": False,
        },
        {
            "cat": "Sho'rvalar",
            "name_uz": "Ko'za Sho'rva",
            "name_ru": "Шурпа в горшочке",
            "name_en": "Pot Soup (Kozashurva)",
            "desc_uz": "Sopol ko'zada mayin olovda qaynatilgan mol go'shti va yangi sabzavotlar bulyoni.",
            "desc_ru": "Ароматный наваристый суп в глиняном горшочке с нежным мясом и свежими овощами.",
            "desc_en": "Rich and hearty lamb soup slow-cooked in a clay pot with seasonal vegetables.",
            "price": Decimal("38000.00"),
            "cook_min": 15,
            "weight_g": 400,
            "calories": 450,
            "image": "dish/soup.jpg",
            "image_md": "/media/dish/soup.jpg",
            "image_webp": "/media/dish/soup.jpg",
            "diet_tags": ["halal"],
            "allergens": [],
            "is_hit": False,
            "is_new": True,
            "has_3d": False,
        },
        {
            "cat": "Salatlar",
            "name_uz": "Achichuk Salati",
            "name_ru": "Салат Ачичук",
            "name_en": "Achichuk Salad",
            "desc_uz": "Yupqa to'g'ralgan qizil pomidor, shirin piyoz va mayin rayhon.",
            "desc_ru": "Тонко нарезанные сочные томаты с луком и свежим базиликом к плову.",
            "desc_en": "Freshly sliced ripe tomatoes, thin onions and basil, ideal accompaniment for plov.",
            "price": Decimal("15000.00"),
            "cook_min": 5,
            "weight_g": 180,
            "calories": 95,
            "image": "dish/salad.jpg",
            "image_md": "/media/dish/salad.jpg",
            "image_webp": "/media/dish/salad.jpg",
            "diet_tags": ["halal", "vegan", "vegetarian", "low_cal"],
            "allergens": [],
            "is_hit": True,
            "is_new": False,
            "has_3d": False,
        },
        {
            "cat": "Pishiriqlar",
            "name_uz": "Issiq Patir Non",
            "name_ru": "Горячая лепешка патыр",
            "name_en": "Hot Tandoor Flatbread",
            "desc_uz": "Sariyog'li qarsildoq xamirdan tandirda yopilgan an'anaviy o'zbek noni.",
            "desc_ru": "Традиционная лепешка с узорами, выпеченная в тандыре со сливочным маслом.",
            "desc_en": "Traditional crispy and flaky Uzbek tandoor bread with sesame seeds.",
            "price": Decimal("8000.00"),
            "cook_min": 3,
            "weight_g": 250,
            "calories": 280,
            "image": "dish/bread.jpg",
            "image_md": "/media/dish/bread.jpg",
            "image_webp": "/media/dish/bread.jpg",
            "diet_tags": ["halal", "vegetarian"],
            "allergens": ["gluten", "sesame"],
            "is_hit": False,
            "is_new": False,
            "has_3d": False,
        }
    ]

    for dinfo in dishes_data:
        cat = categories[dinfo["cat"]]
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
                "image": dinfo["image"],
                "image_md": dinfo["image_md"],
                "image_webp": dinfo["image_webp"],
                "diet_tags": dinfo["diet_tags"],
                "allergens": dinfo["allergens"],
                "is_hit": dinfo.get("is_hit", False),
                "is_new": dinfo.get("is_new", False),
                "has_3d": dinfo.get("has_3d", False),
                "is_available": True
            }
        )
        print(f"Taom: {d.name_uz} (has_3d={d.has_3d}, created={created})")

        # Shashlik uchun 3D modelni biriktirish
        if dinfo.get("has_3d"):
            m3d, m_created = DishModel3D.objects.update_or_create(
                dish=d,
                defaults={
                    "restaurant": r,
                    "glb": dinfo["glb_path"],
                    "glb_url": dinfo["glb_url"],
                    "status": "ready",
                    "source": "upload",
                    "real_size_cm": dinfo["real_size_cm"],
                    "glb_bytes": 1606716
                }
            )
            print(f"  -> 3D Model bog'landi: {m3d.id}, status={m3d.status}, glb_url={m3d.url_glb()}")

    # Menyu versiyasini oshirish va keshni tozalash
    r.menu_version += 1
    r.save(update_fields=['menu_version'])
    cache.clear()
    print("✅ Menyu yangilandi va kesh tozalandi!")

if __name__ == '__main__':
    run()
