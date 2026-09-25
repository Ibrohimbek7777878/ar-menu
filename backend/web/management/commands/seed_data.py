from django.core.management.base import BaseCommand
from categories.models import Category
from shops.models import Shop
from products.models import Product
from couriers.models import Courier
from notifications.models import Banner, AppSetting


class Command(BaseCommand):
    help = "Demo ma'lumotlarni yuklash"

    def handle(self, *args, **options):
        # Categories
        cats_data = [
            ('Mevalar', 'Mevalar', 'Фрукты', 'Fruits', 'apple', '#F97316'),
            ('Sabzavotlar', 'Sabzavotlar', 'Овощи', 'Vegetables', 'broccoli', '#22C55E'),
            ("Go'sht", "Go'sht", 'Мясо', 'Meat', 'restaurant', '#EF4444'),
            ('Sut mahsulotlari', 'Sut mahsulotlari', 'Молочные', 'Dairy', 'local_cafe', '#F59E0B'),
            ('Non va pishiriq', 'Non va pishiriq', 'Хлеб', 'Bakery', 'bakery_dining', '#92400E'),
            ('Ichimliklar', 'Ichimliklar', 'Напитки', 'Drinks', 'local_bar', '#3B82F6'),
            ('Oziq-ovqat', 'Oziq-ovqat', 'Продукты', 'Grocery', 'inventory_2', '#16A34A'),
            ('Gigiena', 'Gigiena', 'Гигиена', 'Hygiene', 'clean_hands', '#A855F7'),
            ("Uy-ro'zg'or", "Uy-ro'zg'or", 'Быт', 'Home', 'home', '#64748B'),
            ('Mahalliy mahsulotlar', 'Mahalliy', 'Местные', 'Local', 'star', '#6366F1'),
            ('Bolalar', 'Bolalar', 'Детские', 'Baby', 'child_care', '#EC4899'),
            ('Texnika', 'Texnika', 'Техника', 'Tech', 'devices', '#0EA5E9'),
        ]
        categories = {}
        for name, uz, ru, en, icon, color in cats_data:
            cat, _ = Category.objects.get_or_create(
                name=name, defaults={
                    'name_uz': uz, 'name_ru': ru, 'name_en': en,
                    'icon': icon, 'color': color, 'is_active': True
                }
            )
            categories[name] = cat
        self.stdout.write(self.style.SUCCESS(f'{len(categories)} ta kategoriya yaratildi'))

        # Shop
        shop, _ = Shop.objects.get_or_create(
            name='Guliston Mahalliy Do\'kon',
            defaults={
                'slug': 'guliston-mahalliy',
                'description': 'Gulistondagi eng yaxshi mahalliy do\'kon. Tez yetkazish, arzon narxlar.',
                'address': 'Gulistondagi markaziy ko\'cha, 15-uy',
                'phone': '+998901234567',
                'latitude': 40.4867,
                'longitude': 68.7736,
                'category': categories.get('Oziq-ovqat'),
                'is_open': True,
                'is_featured': True,
                'is_verified': True,
                'min_order': 20000,
                'delivery_fee': 6000,
                'free_delivery_from': 50000,
            }
        )
        shop2, _ = Shop.objects.get_or_create(
            name='Nonxon Guliston',
            defaults={
                'slug': 'nonxon-guliston',
                'description': 'An\'anaviy o\'zbek nonlari va pishiriqlari',
                'address': 'Gulistondagi BOO ko\'cha, 28-uy',
                'phone': '+998902345678',
                'latitude': 40.4890,
                'longitude': 68.7750,
                'category': categories.get('Non va pishiriq'),
                'is_open': True,
                'is_featured': True,
                'is_verified': True,
                'min_order': 10000,
                'delivery_fee': 5000,
                'free_delivery_from': 30000,
            }
        )
        self.stdout.write(self.style.SUCCESS('2 ta do\'kon yaratildi'))

        # Products
        products_data = [
            ('Non (1 dona)', 'non-1-dona', 2500, None, 'dona', 'Nonxon', categories.get('Non va pishiriq'), shop2, True, 'Qo\'l bilan pishirilgan an\'anaviy non', 0.8, 265, 9.0, 3.3, 49.0),
            ('Olma (1 kg)', 'olma-1-kg', 12000, 15000, 'kg', 'Mahalliy', categories.get('Mevalar'), shop, True, 'Yangi uzilgan olma', 1.0, 52, 0.3, 0.2, 14.0),
            ('Banana (1 kg)', 'banana-1-kg', 18000, 22000, 'kg', 'Import', categories.get('Mevalar'), shop, True, 'Ekvador bananlari', 1.0, 89, 1.1, 0.3, 23.0),
            ('Pomidor (1 kg)', 'pomidor-1-kg', 8000, None, 'kg', 'Mahalliy', categories.get('Sabzavotlar'), shop, True, 'Yangi pomidor', 1.0, 18, 0.9, 0.2, 3.9),
            ('Bodring (1 kg)', 'bodring-1-kg', 7000, None, 'kg', 'Mahalliy', categories.get('Sabzavotlar'), shop, True, 'Yangi bodring', 1.0, 15, 0.7, 0.1, 3.6),
            ("Mol go'shti (1 kg)", 'mol-goshti-1-kg', 85000, 95000, 'kg', 'Mahalliy', categories.get("Go'sht"), shop, True, "Yangi mol go'shti", 1.0, 250, 26.0, 15.0, 0.0),
            ("Qo'y go'shti (1 kg)", 'qoy-goshti-1-kg', 90000, None, 'kg', 'Mahalliy', categories.get("Go'sht"), shop, True, "Toza qo'y go'shti", 1.0, 294, 25.0, 21.0, 0.0),
            ('Sut (1 l)', 'sut-1-l', 12000, 14000, 'dona', 'Sut Mahsulotlari', categories.get('Sut mahsulotlari'), shop, True, 'Yangi sut', 1.0, 61, 3.2, 4.8, 4.8),
            ('Pishloq (1 kg)', 'pishloq-1-kg', 65000, None, 'kg', 'Mahalliy', categories.get('Sut mahsulotlari'), shop, True, 'Mahalliy pishloq', 1.0, 350, 25.0, 27.0, 1.3),
            ('Guruch (1 kg)', 'guruch-1-kg', 15000, 18000, 'kg', 'Lazzat', categories.get('Oziq-ovqat'), shop, True, 'Devzira guruch', 1.0, 350, 7.0, 0.7, 80.0),
            ('Shakar (1 kg)', 'shakar-1-kg', 11000, None, 'kg', 'Mahalliy', categories.get('Oziq-ovqat'), shop, True, 'Oq shakar', 1.0, 387, 0.0, 0.0, 100.0),
            ('Tuz (1 kg)', 'tuz-1-kg', 3000, None, 'kg', 'Mahalliy', categories.get('Oziq-ovqat'), shop, True, 'Osh tuzi', 1.0, 0, 0.0, 0.0, 0.0),
            ('Makaron (1 kg)', 'makaron-1-kg', 9000, None, 'kg', 'Barilla', categories.get('Oziq-ovqat'), shop, True, 'Italiya makaroni', 1.0, 350, 12.0, 1.5, 72.0),
            ('Choy (100 g)', 'choy-100g', 8000, 10000, 'dona', 'Madaniyat', categories.get('Ichimliklar'), shop, True, 'Qora choy', 0.1, 0, 0.0, 0.0, 0.0),
            ('Suv (1.5 l)', 'suv-1-5l', 3000, None, 'dona', 'Hydrosphere', categories.get('Ichimliklar'), shop, True, 'Ichimlik suvi', 1.5, 0, 0.0, 0.0, 0.0),
            ('Sabun (1 dona)', 'sabun-1', 5000, 7000, 'dona', 'Lifebuoy', categories.get('Gigiena'), shop, True, 'Antibakterial sabun', 0.1, 0, 0.0, 0.0, 0.0),
            ('Pampers (1 quti)', 'pampers-1', 55000, 65000, 'dona', 'Pampers', categories.get('Bolalar'), shop, True, 'Bolalar tagliklari', 1.0, 0, 0.0, 0.0, 0.0),
        ]
        count = 0
        for name, slug, price, old_price, unit, brand, cat, shop_obj, avail, desc, weight, cal, prot, fat, carbs in products_data:
            if cat:
                Product.objects.get_or_create(
                    slug=slug, defaults={
                        'name': name, 'price': price, 'old_price': old_price,
                        'unit': unit, 'brand': brand, 'category': cat,
                        'shop': shop_obj, 'is_available': avail,
                        'description': desc, 'weight': weight,
                        'calories': cal, 'protein': prot, 'fat': fat, 'carbs': carbs,
                    }
                )
                count += 1
        self.stdout.write(self.style.SUCCESS(f'{count} ta mahsulot yaratildi'))

        # Couriers
        Courier.objects.get_or_create(phone='+998903456789', defaults={
            'name': 'Abdulloh Karimov', 'status': 'active', 'vehicle_type': 'Mototsikl'
        })
        Courier.objects.get_or_create(phone='+998904567890', defaults={
            'name': 'Sardor Raximov', 'status': 'active', 'vehicle_type': 'Velosiped'
        })
        self.stdout.write(self.style.SUCCESS('2 ta kuryer yaratildi'))

        self.stdout.write(self.style.SUCCESS('Demo data tayyor!'))
