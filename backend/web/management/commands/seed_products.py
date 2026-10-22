import os
import random
import string
from decimal import Decimal
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils.text import slugify

from categories.models import Category
from shops.models import Shop
from products.models import Product


PRODUCTS_DATA = {
    'Mevalar': [
        ('Olma', 12000, 'Qizil olma, yangi', 85),
        ('Banan', 18000, 'Ekvador banani', 120),
        ('Uzum', 15000, 'Qizil uzum, shirin', 90),
        ('Anor', 20000, 'Paxta anori', 150),
        ('Kartoshka', 8000, 'Mahalliy kartoshka', 60),
        ('Nok', 14000, 'Beda nok', 100),
        ('Qovun', 25000, 'Shirin qovun', 200),
        ('Tuzboshi', 10000, 'Yangi tuzboshi', 70),
        ('Apelsin', 16000, 'Marokash apelsini', 110),
        ('Mandarin', 17000, 'Xitoy mandarini', 105),
        ('Gilos', 30000, 'Yangi gilos', 250),
        ('Qulupnay', 35000, 'Tog'' qulupnayi', 280),
    ],
    'Sabzavotlar': [
        ('Pomidor', 9000, 'Yangi pomidor', 65),
        ('Bodring', 10000, 'ISS bodring', 70),
        ('Karam', 7000, 'Oq karam', 50),
        ('Sabzi', 6000, 'Qizil sabzi', 45),
        ('Piyoz', 5000, 'Oq piyoz', 35),
        ('Sarimsoq', 25000, 'Mahalliy sarimsoq', 200),
        ('Qalampir', 15000, 'Qizil qalampir', 100),
        ('Baqlajon', 12000, 'Yashil baqlajon', 85),
        ('Kabachok', 8000, 'Yosh kabachok', 60),
        ('Makkajo''xori', 10000, 'Yangi makkajo''xori', 75),
        ('Lavlagi', 7000, 'Qizil lavlagi', 50),
        ('Sho''rva', 9000, 'Aralash sabzavotlar', 65),
    ],
    "Go'sht": [
        ("Mol go'shti", 85000, "Yangi mol go'shti", 600),
        ("Qo''y go'shti", 95000, "Qo''y go'shti", 700),
        ("Tovuq go'shti", 35000, "Tozalangan tovuq", 250),
        ("Mol jigar", 45000, "Mol jigar, yangi", 350),
        ("Ko''krak", 40000, "Tovuq ko''krak", 280),
        ("Qiyma", 75000, "Aralash qiyma", 550),
        ("Kotlet", 65000, "Tayyor kotlet", 450),
        ("Kabob", 90000, "Tayyor kabob", 650),
        ("Sujuk", 110000, "Qora sujuk", 800),
        ("Kolbasa", 55000, "Mol kolbasa", 400),
        ("Baliq", 60000, "Dengiz baliq", 450),
        ("Moloyoq", 70000, "Moloyoq", 500),
    ],
    'Sut mahsulotlari': [
        ('Sut', 8000, 'Yangi sut, 1L', 60),
        ('Qatiq', 6000, 'Uy qatiq', 45),
        ('Pishloq', 45000, 'Golland pishloq', 350),
        ('Kaymak', 55000, 'Tabiiy kaymak', 400),
        ('Smetana', 12000, 'Smetana 200g', 85),
        ('Tvorog', 25000, 'Yangi tvorog', 180),
        ('Makaron', 9000, 'Makaron 500g', 65),
        ('Yog''', 35000, 'Sariyog'', 200g', 250),
        ('Kefir', 7000, 'Kefir 1L', 50),
        ('Muzqaymoq', 15000, 'Vanil muzqaymoq', 100),
        ('Shokolad', 20000, 'Sut shokolad', 140),
        ('Banan smuzi', 18000, 'Banan va sut', 130),
    ],
    'Non va pishiriq': [
        ('Non', 3000, 'Issiq tandir non', 20),
        ('Lepeshka', 2500, 'Tandir lepeshka', 18),
        ('Somsa', 5000, 'Go''shtli somsa', 35),
        ('Samsa', 4500, 'Qiymali samsa', 30),
        ('Bulochka', 2000, 'Shirin bulochka', 15),
        ('Pechenye', 8000, 'Shokoladli pechenye', 60),
        ('Tort', 65000, 'Napoleon tort', 500),
        ('Pirog', 35000, 'Qatiqli pirog', 250),
        ('Qatiq', 4000, 'Quruq qatiq', 28),
        ('Shirinlik', 12000, 'Halva', 85),
        ('Kruassan', 10000, 'Butter kruassan', 70),
        ('Muffin', 8000, 'Blueberry muffin', 55),
    ],
    'Ichimliklar': [
        ('Suv', 3000, 'Ichimlik suvi 1.5L', 20),
        ('Sharbat', 12000, 'Anjir sharbati', 85),
        ('Kola', 8000, 'Coca-Cola 1L', 55),
        ('Choy', 15000, 'Kopir oq choy', 100),
        ('Kofe', 35000, 'Nescafe Gold', 250),
        ('Sok', 10000, 'Olma sok', 70),
        ('Kvas', 7000, 'Uy kvasi', 50),
        ('Ayran', 5000, 'Tuzli ayran', 35),
        ('Kombucha', 12000, 'Kombucha 500ml', 85),
        ('Energetik', 10000, 'Red Bull', 70),
        ('Pivo', 15000, 'Corona Extra', 100),
        ('Vino', 45000, 'Grenache qizil', 350),
    ],
    'Oziq-ovqat': [
        ('Guruch', 18000, 'Devzira guruch', 130),
        ('Makaron', 7000, 'Barilla makaron', 50),
        ('Konserva', 9000, 'Pomidor konserva', 65),
        ('Zaytun moyi', 45000, 'Italiya zaytun moyi', 350),
        ('Asal', 65000, 'Tabiiy asal', 500),
        ('Nugat', 55000, 'Ferrero Rocher', 400),
        ('Muesli', 25000, 'Granola muesli', 180),
        ('Kashkadaydon', 12000, 'Kashkadaydon 500g', 85),
        ('Shakar', 8000, 'Oq shakar 1kg', 60),
        ('Tuz', 3000, 'Osh tuzi 1kg', 20),
        ('Un', 12000, 'Yuqori sifatli un', 85),
        ('Makaron sos', 15000, 'Barilla sos', 100),
    ],
    'Gigiena': [
        ('Sovun', 8000, 'Dove sovun', 55),
        ('Shampun', 25000, 'Head & Shoulders', 180),
        ('Tish pastasi', 15000, 'Colgate tish pastasi', 100),
        ('Salfetka', 5000, 'Kleenex salfetka', 35),
        ('Qog''oz', 4000, 'A4 qog''oz', 28),
        ('Post', 12000, 'Nivea post', 85),
        ('Dezodorant', 20000, 'Rexona dezodorant', 140),
        ('Krém', 30000, 'Nivea krém', 220),
        ('Pampers', 55000, 'Pampers 3-6 oy', 400),
        ('Makas', 8000, 'Makas 200g', 55),
        ('Paxta', 3000, 'Paxta 100g', 20),
        ('Soch taragich', 10000, 'Tangle Teezer', 70),
    ],
    "Uy-ro'zg'or": [
        ('Salfetka', 7000, 'Mikrofibra salfetka', 50),
        ('Qozon', 85000, 'Granit qozon', 600),
        ('Tartib', 15000, 'Plastik tartib', 100),
        ('Chelak', 20000, 'Plastik chelak', 140),
        ('Supurgi', 12000, 'Supurgi', 85),
        ('Kimyoviy', 18000, 'Oshqozon', 130),
        ('G''ildirak', 25000, 'Kir yuvish mashinasi', 180),
        ('Dazmol', 65000, 'Tefal dazmol', 450),
        ('Qog''oz', 8000, 'Salfetka qog''oz', 55),
        ('Harorat', 30000, 'Termometr', 220),
        ('Chiroq', 45000, 'LED chiroq', 350),
        ('Cho''tka', 10000, 'Toza cho''tka', 70),
    ],
    'Mahalliy mahsulotlar': [
        ('Halva', 25000, 'Toshkent halvasi', 180),
        ('Sumalak', 30000, 'Sumalak', 220),
        ('Chak-chak', 40000, 'Tatar chak-chak', 300),
        ('Parvona', 20000, 'Parvona non', 140),
        ('Kurut', 55000, 'Quritilgan mevalar', 400),
        ('Lavash', 5000, 'Tandir lavash', 35),
        ('Manti', 35000, 'Qo''y manti', 250),
        ('Shashlik', 80000, 'Tovuq shashlik', 600),
        ('Osh', 25000, 'Masta osh', 180),
        ('Qaynatma', 15000, 'Gilos qaynatma', 100),
        ('Kompot', 10000, 'O''rik kompot', 70),
        ('Chuchvara', 30000, 'Qo''y chuchvara', 220),
    ],
    'Bolalar': [
        ('Sut', 9000, 'Nan 1+ sut', 65),
        ('Pampers', 60000, 'Pampers Premium', 450),
        ('Shirinlik', 12000, 'Misha konfet', 85),
        ('Pirojnoe', 8000, 'Bola pirojnoe', 55),
        ('Sok', 7000, 'Fruski sok', 50),
        ('Makaron', 5000, 'Barilla mini', 35),
        ('Muzqaymoq', 10000, 'Mishka muzqaymoq', 70),
        ('Kartoshka', 6000, 'Kartoshka chips', 42),
        ('Kolbasa', 25000, 'Bolalar kolbasa', 180),
        ('Kefir', 6000, 'Biolactis kefir', 42),
        ('Yogurt', 5000, 'Danone yogurt', 35),
        ('Non', 4000, 'Bola non', 28),
    ],
    'Texnika': [
        ('Telefon', 2500000, 'Samsung Galaxy A54', 18000),
        ('Noutbuk', 5500000, 'Lenovo IdeaPad', 40000),
        ('Quloqchin', 180000, 'Sony WH-1000XM5', 1300),
        ('Sovutgich', 8000000, 'Indesit sovutgich', 58000),
        ('Kir yuvish', 6500000, 'LG kir yuvish', 47000),
        ('Mikroto''lqin', 900000, 'Samsung mikroto''lqin', 6500),
        ('Chiroq', 250000, 'LED lampochka', 1800),
        ('Blenderni', 350000, 'Bosch blender', 2500),
        ('Dazmol', 450000, 'Philips dazmol', 3200),
        ('Suv isitish', 600000, 'Ariston suv isitish', 4300),
        ('Konditsioner', 7000000, 'Samsung konditsioner', 50000),
        ('Televizor', 4000000, 'LG Smart TV 55"', 29000),
    ],
}


def create_product_image(product_name, bg_color, text_color):
    img = Image.new('RGB', (600, 600), bg_color)
    draw = ImageDraw.Draw(img)
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except (IOError, OSError):
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    words = product_name.split()
    y_start = 240
    for i, word in enumerate(words):
        bbox = draw.textbbox((0, 0), word, font=font_large)
        tw = bbox[2] - bbox[0]
        draw.text(((600 - tw) / 2, y_start + i * 60), word, fill=text_color, font=font_large)
    bbox = draw.textbbox((0, 0), 'Online Store', font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((600 - tw) / 2, 520), 'Online Store Guliston', fill=text_color, font=font_small)
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    return ContentFile(buffer.getvalue())


COLORS = [
    ('#dcfce7', '#166534'),
    ('#dbeafe', '#1e40af'),
    ('#fef3c7', '#92400e'),
    ('#ede9fe', '#5b21b6'),
    ('#fce7f3', '#9d174d'),
    ('#e0f2fe', '#075985'),
    ('#f0fdf4', '#166534'),
    ('#fef2f2', '#991b1b'),
]


class Command(BaseCommand):
    help = "Har bir kategoriyada 10+ mahsulot yaratadi"

    def handle(self, *args, **options):
        shop, _ = Shop.objects.get_or_create(
            name='Online Store',
            defaults={
                'slug': 'online-store',
                'address': 'Guliston shahar, Markaziy ko\'cha 1',
                'phone': '+998901234567',
                'latitude': 40.4885,
                'longitude': 69.7428,
                'is_open': True,
                'rating': 4.5,
            }
        )

        shop2, _ = Shop.objects.get_or_create(
            name='Guliston Maxsus',
            defaults={
                'slug': 'guliston-maksus',
                'address': 'Guliston shahar, Mustaqillik ko\'cha 15',
                'phone': '+998907654321',
                'latitude': 40.4900,
                'longitude': 69.7500,
                'is_open': True,
                'rating': 4.3,
            }
        )

        shops = [shop, shop2]
        created = 0

        for cat_name, products_list in PRODUCTS_DATA.items():
            category = Category.objects.filter(name=cat_name).first()
            if not category:
                self.stdout.write(f'  ⚠ Kategoriya topilmadi: {cat_name}')
                continue

            for i, (name, price, desc, cal) in enumerate(products_list):
                slug = slugify(f'{name}-{cat_name}-{i}', allow_unicode=True)
                if Product.all_objects.filter(slug=slug).exists():
                    slug = slugify(f'{name}-{cat_name}-{i}-{random.randint(100,999)}', allow_unicode=True)

                if Product.objects.filter(name=name, category=category).exists():
                    continue

                bg, fg = random.choice(COLORS)
                img_file = create_product_image(name, bg, fg)

                product = Product(
                    name=name,
                    slug=slug,
                    description=desc,
                    price=Decimal(str(price)),
                    old_price=Decimal(str(int(price * random.uniform(1.1, 1.4)))) if random.random() > 0.5 else None,
                    unit='dona',
                    category=category,
                    shop=random.choice(shops),
                    brand=random.choice(['Mahalliy', 'Import', 'Premium', '']),
                    country_of_origin=random.choice(["O'zbekiston", 'Turkiya', 'Rossiya', 'Xitoy', 'Qozog''iston']),
                    is_available=True,
                    stock=random.randint(10, 200),
                    is_organic=random.random() > 0.7,
                    is_halal=True,
                    calories=cal,
                    rating=round(random.uniform(3.5, 5.0), 1),
                    reviews_count=random.randint(0, 50),
                    is_featured=random.random() > 0.7,
                    tags=cat_name,
                )
                product.image.save(f'{slug}.jpg', img_file, save=True)
                created += 1
                self.stdout.write(f'  ✅ {name} — {price} so\'m [{cat_name}]')

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Jami {created} ta mahsulot yaratildi!'))
