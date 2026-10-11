#!/usr/bin/env python
"""
Seed script for Agro & Food Master Catalog and Starter Packs.
Populates standard products for Guliston market:
- Sabzavotlar va ko'katlar (Vegetables & Greens)
- Mevalar va poliz (Fruits & Melons)
- Go'sht va parranda (Meat & Poultry)
- Sut va qatiq mahsulotlari (Dairy)
- Don va dukkaklilar (Grains & Legumes)
- Supermarket baqqollik (Grocery FMCG)
"""
import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from products.models import AgroMasterProduct, AgroStarterPack, AgroStarterPackItem
from categories.models import Category

def seed():
    print("Seeding Agro & Food Master Catalog...")

    cat_food, _ = Category.objects.get_or_create(
        name="Oziq-ovqat",
        defaults={"name_uz": "Oziq-ovqat", "name_ru": "Продукты", "icon": "fastfood"}
    )

    ITEMS = [
        # --- Sabzavotlar & Ko'katlar ---
        {
            "name": "Kartoshka (mahalliy)", "name_uz": "Kartoshka", "name_ru": "Картофель",
            "sector": "vegetable", "unit": "kg", "price": 4500, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80"
        },
        {
            "name": "Piyoz sariq", "name_uz": "Piyoz sariq", "name_ru": "Лук репчатый",
            "sector": "vegetable", "unit": "kg", "price": 2500, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80"
        },
        {
            "name": "Sabzi qizil", "name_uz": "Sabzi qizil", "name_ru": "Морковь красная",
            "sector": "vegetable", "unit": "kg", "price": 3000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&q=80"
        },
        {
            "name": "Sabzi sariq (oshbop)", "name_uz": "Sabzi sariq", "name_ru": "Морковь желтая",
            "sector": "vegetable", "unit": "kg", "price": 3500, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1445282768818-728615cc910a?w=500&q=80"
        },
        {
            "name": "Pomidor Yusupov", "name_uz": "Pomidor Yusupov", "name_ru": "Помидоры Юсуповские",
            "sector": "vegetable", "unit": "kg", "price": 8000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80"
        },
        {
            "name": "Pomidor pushti", "name_uz": "Pomidor pushti", "name_ru": "Помидоры розовые",
            "sector": "vegetable", "unit": "kg", "price": 9000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1546470427-e26264be0b11?w=500&q=80"
        },
        {
            "name": "Bodring bodringcha", "name_uz": "Bodring", "name_ru": "Огурцы",
            "sector": "vegetable", "unit": "kg", "price": 6000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=500&q=80"
        },
        {
            "name": "Karam oq", "name_uz": "Karam oq", "name_ru": "Капуста белокочанная",
            "sector": "vegetable", "unit": "kg", "price": 3000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=500&q=80"
        },
        {
            "name": "Bulg'or qalampiri", "name_uz": "Bulg'or qalampiri", "name_ru": "Перец болгарский",
            "sector": "vegetable", "unit": "kg", "price": 14000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80"
        },
        {
            "name": "Baqlajon", "name_uz": "Baqlajon", "name_ru": "Баклажаны",
            "sector": "vegetable", "unit": "kg", "price": 5000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80"
        },
        {
            "name": "Qovoq shirin", "name_uz": "Qovoq", "name_ru": "Тыква",
            "sector": "vegetable", "unit": "kg", "price": 4000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=500&q=80"
        },
        {
            "name": "Sarimsoqpiyoz", "name_uz": "Sarimsoqpiyoz", "name_ru": "Чеснок",
            "sector": "vegetable", "unit": "kg", "price": 25000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=500&q=80"
        },
        {
            "name": "Kashnich yangi", "name_uz": "Kashnich", "name_ru": "Кинза свежая",
            "sector": "vegetable", "unit": "bog", "price": 1500, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1628773822503-930a8449774d?w=500&q=80"
        },
        {
            "name": "Shivit (ukrop)", "name_uz": "Shivit", "name_ru": "Укроп свежий",
            "sector": "vegetable", "unit": "bog", "price": 1500, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1606914506443-43d99d1469e3?w=500&q=80"
        },
        {
            "name": "Rayhon binafsha", "name_uz": "Rayhon", "name_ru": "Базилик фиолетовый",
            "sector": "vegetable", "unit": "bog", "price": 2000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=500&q=80"
        },
        {
            "name": "Ko'k piyoz", "name_uz": "Ko'k piyoz", "name_ru": "Лук зеленый",
            "sector": "vegetable", "unit": "bog", "price": 2000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=500&q=80"
        },

        # --- Mevalar va Poliz ---
        {
            "name": "Tarvuz Sirdaryo", "name_uz": "Tarvuz", "name_ru": "Арбуз Сырдарьинский",
            "sector": "fruit", "unit": "kg", "price": 2500, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&q=80"
        },
        {
            "name": "Qovun Obi Novvot", "name_uz": "Qovun Obi Novvot", "name_ru": "Дыня Оби Навват",
            "sector": "fruit", "unit": "dona", "price": 18000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&q=80"
        },
        {
            "name": "Olma Besh Yulduz", "name_uz": "Olma Besh Yulduz", "name_ru": "Яблоки Пять Звезд",
            "sector": "fruit", "unit": "kg", "price": 12000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80"
        },
        {
            "name": "Nok Asal", "name_uz": "Nok", "name_ru": "Груши",
            "sector": "fruit", "unit": "kg", "price": 16000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=500&q=80"
        },
        {
            "name": "Uzum Qora Kishmish", "name_uz": "Uzum Kishmish", "name_ru": "Виноград Кишмиш черный",
            "sector": "fruit", "unit": "kg", "price": 18000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500&q=80"
        },
        {
            "name": "Shaftoli Anjirshaftoli", "name_uz": "Shaftoli", "name_ru": "Персики инжирные",
            "sector": "fruit", "unit": "kg", "price": 20000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1629828874514-c1e5103f2150?w=500&q=80"
        },
        {
            "name": "Anor Quva", "name_uz": "Anor", "name_ru": "Гранат",
            "sector": "fruit", "unit": "kg", "price": 25000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1541344999736-83eca872f241?w=500&q=80"
        },
        {
            "name": "Gilos qizil", "name_uz": "Gilos", "name_ru": "Черешня красная",
            "sector": "fruit", "unit": "kg", "price": 25000, "is_seasonal": True,
            "image_url": "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=500&q=80"
        },

        # --- Go'sht va Parranda ---
        {
            "name": "Mol go'shti (lahm)", "name_uz": "Mol go'shti lahm", "name_ru": "Говядина мякоть",
            "sector": "meat", "unit": "kg", "price": 95000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500&q=80"
        },
        {
            "name": "Mol go'shti (suyakli)", "name_uz": "Mol go'shti suyakli", "name_ru": "Говядина с костью",
            "sector": "meat", "unit": "kg", "price": 82000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1558030006-450675393462?w=500&q=80"
        },
        {
            "name": "Qo'y go'shti (saralangan)", "name_uz": "Qo'y go'shti", "name_ru": "Баранина отборная",
            "sector": "meat", "unit": "kg", "price": 98000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80"
        },
        {
            "name": "Mol go'shti qiymasi", "name_uz": "Mol qiymasi", "name_ru": "Фарш говяжий",
            "sector": "meat", "unit": "kg", "price": 85000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=500&q=80"
        },
        {
            "name": "Tovuq butun (halol)", "name_uz": "Tovuq butun", "name_ru": "Курица тушка халяль",
            "sector": "meat", "unit": "kg", "price": 32000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&q=80"
        },
        {
            "name": "Tovuq filesi", "name_uz": "Tovuq filesi", "name_ru": "Филе куриное",
            "sector": "meat", "unit": "kg", "price": 46000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&q=80"
        },
        {
            "name": "Tuxum xonaki (sarig'i to'q)", "name_uz": "Tuxum xonaki", "name_ru": "Яйца домашние",
            "sector": "meat", "unit": "dona", "price": 1800, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&q=80"
        },

        # --- Sut va Qatiq ---
        {
            "name": "Qishloq suti (tabiiy)", "name_uz": "Qishloq suti", "name_ru": "Молоко деревенское",
            "sector": "dairy", "unit": "litr", "price": 8000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80"
        },
        {
            "name": "Qatiq quyuq", "name_uz": "Qatiq quyuq", "name_ru": "Катык домашний",
            "sector": "dairy", "unit": "litr", "price": 9000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80"
        },
        {
            "name": "Suzma yangi", "name_uz": "Suzma", "name_ru": "Сузьма свежая",
            "sector": "dairy", "unit": "kg", "price": 18000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=500&q=80"
        },
        {
            "name": "Qaymoq separatsiya", "name_uz": "Qaymoq", "name_ru": "Каймак",
            "sector": "dairy", "unit": "kg", "price": 65000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=500&q=80"
        },
        {
            "name": "Sariyog' qo'lbola", "name_uz": "Sariyog'", "name_ru": "Масло сливочное домашнее",
            "sector": "dairy", "unit": "kg", "price": 90000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&q=80"
        },
        {
            "name": "Sho'r qurt", "name_uz": "Sho'r qurt", "name_ru": "Курт соленый",
            "sector": "dairy", "unit": "kg", "price": 45000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=500&q=80"
        },

        # --- Don va Dukkaklilar ---
        {
            "name": "Guruch Lazer (Oliy)", "name_uz": "Guruch Lazer", "name_ru": "Рис Лазер",
            "sector": "grain", "unit": "kg", "price": 24000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80"
        },
        {
            "name": "Guruch Alanga", "name_uz": "Guruch Alanga", "name_ru": "Рис Аланга",
            "sector": "grain", "unit": "kg", "price": 18000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=500&q=80"
        },
        {
            "name": "Guruch Devzira (Chust)", "name_uz": "Guruch Devzira", "name_ru": "Рис Девзира",
            "sector": "grain", "unit": "kg", "price": 28000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80"
        },
        {
            "name": "Mosh toza saralangan", "name_uz": "Mosh", "name_ru": "Маш отборный",
            "sector": "grain", "unit": "kg", "price": 16000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&q=80"
        },
        {
            "name": "Qizil loviya", "name_uz": "Qizil loviya", "name_ru": "Фасоль красная",
            "sector": "grain", "unit": "kg", "price": 18000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&q=80"
        },
        {
            "name": "No'xat oq yirik", "name_uz": "No'xat", "name_ru": "Нут белый крупный",
            "sector": "grain", "unit": "kg", "price": 22000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&q=80"
        },

        # --- Supermarket & Baqqollik ---
        {
            "name": "Samarqand noni", "name_uz": "Samarqand noni", "name_ru": "Лепешка Самаркандская",
            "sector": "bakery", "unit": "dona", "price": 6000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80"
        },
        {
            "name": "Tandir patir non", "name_uz": "Tandir patir", "name_ru": "Патыр тандырный",
            "sector": "bakery", "unit": "dona", "price": 5000, "is_seasonal": False,
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80"
        },
        {
            "name": "O'simlik yog'i Paxta 1L", "name_uz": "Paxta yog'i 1L", "name_ru": "Масло хлопковое 1л",
            "sector": "grocery", "unit": "dona", "price": 16000, "barcode": "4780010010012",
            "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80"
        },
        {
            "name": "Pista yog'i Oila Tanlovi 5L", "name_uz": "Pista yog'i 5L", "name_ru": "Масло подсолнечное 5л",
            "sector": "grocery", "unit": "dona", "price": 85000, "barcode": "4780010010029",
            "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80"
        },
        {
            "name": "Shakar oq (Xorazm)", "name_uz": "Shakar oq", "name_ru": "Сахар белый",
            "sector": "grocery", "unit": "kg", "price": 12000, "barcode": "4780010010036",
            "image_url": "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&q=80"
        },
        {
            "name": "Makfa un oliy nav 2kg", "name_uz": "Makfa un 2kg", "name_ru": "Мука Макфа 2кг",
            "sector": "grocery", "unit": "dona", "price": 22000, "barcode": "4601112001015",
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80"
        },
        {
            "name": "Choy Ko'k 95 (100g)", "name_uz": "Choy Ko'k 95", "name_ru": "Чай Зеленый 95",
            "sector": "drinks", "unit": "dona", "price": 11000, "barcode": "4780020020018",
            "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80"
        },
        {
            "name": "Dena Olma sharbati 1L", "name_uz": "Dena Olma 1L", "name_ru": "Сок Дена Яблоко 1л",
            "sector": "drinks", "unit": "dona", "price": 13000, "barcode": "4780040040019",
            "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&q=80"
        },
        {
            "name": "Chortoq 0.5L gazlangan suv", "name_uz": "Chortoq 0.5L", "name_ru": "Чорток 0.5л",
            "sector": "drinks", "unit": "dona", "price": 5000, "barcode": "4780050050013",
            "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&q=80"
        },
    ]

    saved_items = {}
    for item in ITEMS:
        p, _ = AgroMasterProduct.objects.update_or_create(
            name=item["name"],
            defaults={
                "name_uz": item["name_uz"],
                "name_ru": item["name_ru"],
                "sector": item["sector"],
                "unit": item["unit"],
                "default_market_price": Decimal(str(item["price"])),
                "image_url": item.get("image_url", ""),
                "barcode": item.get("barcode"),
                "is_seasonal": item.get("is_seasonal", False),
                "is_organic": True,
                "category": cat_food,
            }
        )
        saved_items[p.name] = p

    print(f"Created {len(saved_items)} Agro Master Products.")

    # --- STARTER PACKS ---
    PACKS = [
        {
            "name": "Dehqon Bozori — Sabzavot va Ko'katlar TOP-15",
            "sector": "vegetable",
            "description": "Guliston dehqon bozorining eng xaridorgir yangi uzilgan sabzavot va ko'katlari.",
            "icon": "eco",
            "sort_order": 1,
            "items": [
                "Kartoshka (mahalliy)", "Piyoz sariq", "Sabzi qizil", "Sabzi sariq (oshbop)",
                "Pomidor Yusupov", "Bodring bodringcha", "Karam oq", "Bulg'or qalampiri",
                "Sarimsoqpiyoz", "Kashnich yangi", "Shivit (ukrop)", "Ko'k piyoz"
            ]
        },
        {
            "name": "Dehqon Bozori — Mevalar va Poliz TOP-10",
            "sector": "fruit",
            "description": "Sirdaryoning shirin qovun-tarvuzlari va yangi mavsumiy mevalari.",
            "icon": "nutrition",
            "sort_order": 2,
            "items": [
                "Tarvuz Sirdaryo", "Qovun Obi Novvot", "Olma Besh Yulduz", "Nok Asal",
                "Uzum Qora Kishmish", "Shaftoli Anjirshaftoli", "Anor Quva", "Gilos qizil"
            ]
        },
        {
            "name": "Qassobxona & Go'sht Do'koni TOP-7",
            "sector": "meat",
            "description": "Yangi so'yilgan halol mol, qo'y va tovuq go'shtlari, qiyma va tuxum.",
            "icon": "set_meal",
            "sort_order": 3,
            "items": [
                "Mol go'shti (lahm)", "Mol go'shti (suyakli)", "Qo'y go'shti (saralangan)",
                "Mol go'shti qiymasi", "Tovuq butun (halol)", "Tovuq filesi", "Tuxum xonaki (sarig'i to'q)"
            ]
        },
        {
            "name": "Tabiiy Sut va Qatiq Mahsulotlari TOP-6",
            "sector": "dairy",
            "description": "Qishloqning toza tabiiy suti, qaymoq, suzma, qatiq va qo'lbola sariyog'.",
            "icon": "local_drink",
            "sort_order": 4,
            "items": [
                "Qishloq suti (tabiiy)", "Qatiq quyuq", "Suzma yangi", "Qaymoq separatsiya",
                "Sariyog' qo'lbola", "Sho'r qurt"
            ]
        },
        {
            "name": "Don, Dukkaklilar va Guruch Bozori TOP-6",
            "sector": "grain",
            "description": "Oshbop Lazer, Alanga va Devzira guruchlari, mosh va no'xat.",
            "icon": "grass",
            "sort_order": 5,
            "items": [
                "Guruch Lazer (Oliy)", "Guruch Alanga", "Guruch Devzira (Chust)",
                "Mosh toza saralangan", "Qizil loviya", "No'xat oq yirik"
            ]
        },
        {
            "name": "Supermarket & Baqqollik TOP-10",
            "sector": "grocery",
            "description": "Har bir xonadonga har kuni kerak bo'ladigan oziq-ovqat va ichimliklar.",
            "icon": "shopping_cart",
            "sort_order": 6,
            "items": [
                "Samarqand noni", "Tandir patir non", "O'simlik yog'i Paxta 1L", "Pista yog'i Oila Tanlovi 5L",
                "Shakar oq (Xorazm)", "Makfa un oliy nav 2kg", "Choy Ko'k 95 (100g)", "Dena Olma sharbati 1L", "Chortoq 0.5L gazlangan suv"
            ]
        },
    ]

    for pdata in PACKS:
        pack, _ = AgroStarterPack.objects.update_or_create(
            name=pdata["name"],
            defaults={
                "sector": pdata["sector"],
                "description": pdata["description"],
                "icon": pdata["icon"],
                "sort_order": pdata["sort_order"],
                "is_active": True,
            }
        )
        for item_name in pdata["items"]:
            mp = saved_items.get(item_name)
            if mp:
                AgroStarterPackItem.objects.update_or_create(
                    pack=pack,
                    master_product=mp,
                    defaults={
                        "suggested_price": mp.default_market_price,
                        "default_stock": Decimal("50.0") if mp.unit != 'dona' else Decimal("30.0")
                    }
                )

    print(f"Created {len(PACKS)} Agro Starter Packs with all items.")
    print("Agro & Food Master Catalog Seeding Complete!")

if __name__ == '__main__':
    seed()
