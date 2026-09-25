import random
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings
from products.models import Product
from categories.models import Category
from shops.models import Shop
from notifications.models import Review
from accounts.models import Customer
from PIL import Image, ImageDraw, ImageFont
import io
import math


SHOPS_DATA = [
    {
        'name': 'Baraka Market',
        'slug': 'baraka-market',
        'description': 'Guliston markazidagi eng ishonchli do\'kon. Barcha turdagi oziq-ovqat mahsulotlari, kundalik ehtiyojlar. Har kuni yangi mahsulotlar.',
        'address': 'Guliston shahri, Mustaqillik ko\'chasi 45',
        'phone': '+998901234567',
        'working_hours': '06:00 - 23:00',
        'min_order': 25000,
        'delivery_fee': 10000,
        'free_delivery_from': 50000,
        'rating': 4.7,
        'is_verified': True,
        'is_featured': True,
        'is_open': True,
        'latitude': 40.4875,
        'longitude': 66.8435,
    },
    {
        'name': 'Nonxon Market',
        'slug': 'nonxon-market',
        'description': 'Non va pishiriqlar bo\'yicha mutaxassis. Har kuni ertalab yangi non pishiriladi. Milliy an\'anaviy lazzat.',
        'address': 'Guliston shahri, Bunyodkor ko\'chasi 12',
        'phone': '+998902345678',
        'working_hours': '05:00 - 22:00',
        'min_order': 20000,
        'delivery_fee': 8000,
        'free_delivery_from': 40000,
        'rating': 4.5,
        'is_verified': True,
        'is_featured': True,
        'is_open': True,
        'latitude': 40.4795,
        'longitude': 66.8500,
    },
    {
        'name': 'Online Store',
        'slug': 'online-store',
        'description': 'Online buyurtmalar uchun maxsus do\'kon. Tez yetkazib berish, keng assortiment, qulay narxlar.',
        'address': 'Guliston shahri, Yangi Yo\'l ko\'chasi 78',
        'phone': '+998903456789',
        'working_hours': '08:00 - 21:00',
        'min_order': 30000,
        'delivery_fee': 12000,
        'free_delivery_from': 60000,
        'rating': 4.5,
        'is_verified': True,
        'is_featured': True,
        'is_open': True,
        'latitude': 40.4810,
        'longitude': 66.8350,
    },
    {
        'name': 'Guliston Maxsus',
        'slug': 'guliston-maksus',
        'description': 'Maxsus mahsulotlar va import mahsulotlar. Yuqori sifat, keng tanlov. Premium do\'kon.',
        'address': 'Guliston shahri, Davlatobod ko\'chasi 34',
        'phone': '+998904567890',
        'working_hours': '07:00 - 22:00',
        'min_order': 35000,
        'delivery_fee': 15000,
        'free_delivery_from': 70000,
        'rating': 4.3,
        'is_verified': True,
        'is_featured': True,
        'is_open': True,
        'latitude': 40.4920,
        'longitude': 66.8520,
    },
]

PRODUCTS_DATA = {
    'Non va pishiriq': [
        {'name': 'Oq non', 'price': 3500, 'old_price': 4000, 'description': 'Yangi pishirilgan oq non. Kuniga 3 marta yangilanadi. Issiq va yumshoq.', 'brand': 'Nonxon', 'rating': 4.8, 'reviews_count': 45, 'tags': 'non, oq non, yangi non'},
        {'name': 'Jamg\'arma non', 'price': 4000, 'description': 'An\'anaviy jamg\'arma non. Qattiq va mazali. Uzoq saqlanadi.', 'brand': 'Nonxon', 'rating': 4.6, 'reviews_count': 32, 'tags': 'non, jamg\'arma, an\'anaviy'},
        {'name': 'Lepeshka', 'price': 5000, 'old_price': 6000, 'description': 'Milliy lepeshka. Yangi va issiq. Tandirda pishirilgan.', 'brand': 'Baraka', 'rating': 4.7, 'reviews_count': 28, 'tags': 'non, lepeshka, tandir'},
        {'name': 'Qora non', 'price': 4500, 'description': 'Qora non. Sog\'liq uchun foydali. Donli.', 'brand': 'Nonxon', 'rating': 4.5, 'reviews_count': 20, 'tags': 'non, qora non, donli'},
        {'name': 'Samsa', 'price': 8000, 'description': 'Qiymali samsa. 8 dona. Tandirda pishirilgan.', 'brand': 'Baraka', 'rating': 4.9, 'reviews_count': 55, 'tags': 'pishiriq, samsa, tandir'},
        {'name': 'Bu\'loch', 'price': 6000, 'old_price': 7000, 'description': 'Shirin bu\'loch. Bolalar ham yoqtiradi. Yumshoq.', 'brand': 'Nonxon', 'rating': 4.4, 'reviews_count': 18, 'tags': 'pishiriq, bu\'loch, shirin'},
        {'name': 'Non (qora)', 'price': 4500, 'description': 'Qora non. Taroqdonli. Sog\'liq uchun foydali.', 'brand': 'Nonxon', 'rating': 4.5, 'reviews_count': 20, 'tags': 'non, qora non'},
        {'name': 'Patir non', 'price': 5500, 'description': 'Qalin patir non. Yog\'li va mazali.', 'brand': 'Baraka', 'rating': 4.6, 'reviews_count': 22, 'tags': 'non, patir, qalin'},
        {'name': 'Somonchi non', 'price': 3000, 'description': 'Yupqa somonchi non. Yengil va mazali.', 'brand': 'Nonxon', 'rating': 4.3, 'reviews_count': 15, 'tags': 'non, somonchi, yupqa'},
        {'name': 'Kulcha', 'price': 2500, 'description': 'Kichik kulchalar. 5 dona. Bolalar uchun.', 'brand': 'Baraka', 'rating': 4.4, 'reviews_count': 25, 'tags': 'pishiriq, kulcha, bolalar'},
        {'name': 'Shirma', 'price': 7000, 'description': 'Shirin shirma. Bayram uchun.', 'brand': 'Nonxon', 'rating': 4.7, 'reviews_count': 30, 'tags': 'pishiriq, shirma, shirin'},
        {'name': 'Qattiq non', 'price': 3500, 'description': 'Qattiq non. Uzoq saqlanadi. Sayohat uchun.', 'brand': 'Baraka', 'rating': 4.2, 'reviews_count': 12, 'tags': 'non, qattiq, sayohat'},
    ],
    'Sut va tuxum': [
        {'name': 'Tuxum 10 dona', 'price': 12000, 'old_price': 14000, 'description': 'Yangi tuxum. Tabiiy. Tovuq xo\'jaligidan.', 'brand': 'Baraka', 'rating': 4.7, 'reviews_count': 42, 'tags': 'tuxum, sut, yangi'},
        {'name': 'Sut 1L', 'price': 8500, 'description': 'Yangi sut. 1 litr. Pasterizatsiya qilingan.', 'brand': 'Nur', 'rating': 4.6, 'reviews_count': 38, 'tags': 'sut, yangi sut, 1 litr'},
        {'name': 'Yog\'urt 500g', 'price': 6000, 'description': 'Tabiiy yog\'urt. Sog\'liq uchun foydali.', 'brand': 'Nur', 'rating': 4.5, 'reviews_count': 25, 'tags': 'sut, yog\'urt, tabiiy'},
        {'name': 'Qaymoq 200g', 'price': 9000, 'old_price': 10000, 'description': 'Yog\'li qaymoq. Choy uchun.', 'brand': 'Nur', 'rating': 4.8, 'reviews_count': 30, 'tags': 'sut, qaymoq, yog\'li'},
        {'name': 'Smetana 300g', 'price': 7500, 'description': 'Smetana. Mazali. Salatlar uchun.', 'brand': 'Eurosmedana', 'rating': 4.4, 'reviews_count': 22, 'tags': 'sut, smetana, salat'},
        {'name': 'Pishloq 500g', 'price': 28000, 'old_price': 32000, 'description': 'Quruq pishloq. Sifatli. Uzoq saqlanadi.', 'brand': 'Selskiy', 'rating': 4.7, 'reviews_count': 35, 'tags': 'sut, pishloq, quruq'},
        {'name': 'Tuxum 30 dona', 'price': 34000, 'description': 'Katta quti tuxum. 30 dona. Iqtisodiy.', 'brand': 'Baraka', 'rating': 4.6, 'reviews_count': 28, 'tags': 'tuxum, katta quti'},
        {'name': 'Sut 2L', 'price': 15000, 'old_price': 17000, 'description': 'Katta shisha sut. 2 litr.', 'brand': 'Nur', 'rating': 4.5, 'reviews_count': 20, 'tags': 'sut, 2 litr, katta'},
        {'name': 'Bryndza 300g', 'price': 18000, 'description': 'Tuzlangan bryndza. Non bilan.', 'brand': 'Selskiy', 'rating': 4.4, 'reviews_count': 18, 'tags': 'sut, pishloq, bryndza'},
        {'name': 'Kefir 1L', 'price': 6500, 'description': 'Foydali kefir. Hazm qilish uchun.', 'brand': 'Nur', 'rating': 4.3, 'reviews_count': 16, 'tags': 'sut, kefir, foydali'},
        {'name': 'Kumush sut 1L', 'price': 7000, 'old_price': 8000, 'description': 'Yarim yog\'li sut.', 'brand': 'Nur', 'rating': 4.5, 'reviews_count': 19, 'tags': 'sut, kumush, yarim yog\'li'},
        {'name': 'Tvorog 400g', 'price': 11000, 'description': 'Yangi tvorog. Sog\'liq uchun.', 'brand': 'Selskiy', 'rating': 4.6, 'reviews_count': 15, 'tags': 'sut, tvorog, yangi'},
    ],
    'Sut mahsulotlari': [
        {'name': 'Ayran 1L', 'price': 5000, 'description': 'Sovuq ayran. Ichishga tayyor. Yozgi ichimlik.', 'brand': 'Nur', 'rating': 4.3, 'reviews_count': 20, 'tags': 'ichimlik, ayran, sovuq'},
        {'name': 'Kefir 1L', 'price': 6500, 'old_price': 7500, 'description': 'Foydali kefir. Probiotik.', 'brand': 'Nur', 'rating': 4.4, 'reviews_count': 18, 'tags': 'sut, kefir, probiotik'},
        {'name': 'Tvorog 400g', 'price': 11000, 'description': 'Yangi tvorog. Oqsolda boy.', 'brand': 'Selskiy', 'rating': 4.6, 'reviews_count': 15, 'tags': 'sut, tvorog, oqsol'},
        {'name': 'Moloko 3.2% 1L', 'price': 9000, 'description': 'To\'liq sut. 3.2% yog\'.', 'brand': 'Nur', 'rating': 4.5, 'reviews_count': 22, 'tags': 'sut, to\'liq, 3.2%'},
    ],
    'Choy va kofe': [
        {'name': 'Nescafe 250g', 'price': 35000, 'old_price': 40000, 'description': 'Qayta qovurilgan kofe. Achchiq va mazali. Nescafe klassik.', 'brand': 'Nescafe', 'rating': 4.8, 'reviews_count': 50, 'tags': 'kofe, nescafe, qayta qovurilgan'},
        {'name': 'Ahmad choy 100g', 'price': 12000, 'description': 'Ceylon qora choyi. Ahmad Tea.', 'brand': 'Ahmad', 'rating': 4.6, 'reviews_count': 40, 'tags': 'choy, ahmad, ceylon'},
        {'name': 'Yashil choy 100g', 'price': 15000, 'old_price': 18000, 'description': 'Yashil choy. Foydali. Antioksidant.', 'brand': 'Ahmad', 'rating': 4.5, 'reviews_count': 35, 'tags': 'choy, yashil, antioksidant'},
        {'name': 'Jacobs kofe 200g', 'price': 25000, 'description': 'Hazm qilinadigan kofe. Jacobs Monarch.', 'brand': 'Jacobs', 'rating': 4.7, 'reviews_count': 28, 'tags': 'kofe, jacobs, monarch'},
        {'name': 'Oq shakar 1kg', 'price': 14000, 'description': 'Oq shakar. Sifatli. 1 kilogramm.', 'brand': 'Mahalliy', 'rating': 4.4, 'reviews_count': 25, 'tags': 'shakar, oq, 1kg'},
        {'name': 'Qora choy 200g', 'price': 8000, 'description': 'Qora choynak choyi. Klassik.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 22, 'tags': 'choy, qora, klassik'},
        {'name': 'Kofe 3in1 (20 paket)', 'price': 18000, 'old_price': 22000, 'description': 'Kofe + sut + shakar. Qulay paketlar.', 'brand': 'Nescafe', 'rating': 4.2, 'reviews_count': 18, 'tags': 'kofe, 3in1, paket'},
        {'name': 'Shakar 500g', 'price': 8000, 'description': 'Oq shakar. Yarm kilogramm.', 'brand': 'Mahalliy', 'rating': 4.4, 'reviews_count': 20, 'tags': 'shakar, oq, 500g'},
    ],
    'Shirinliklar': [
        {'name': 'Roshen konfet 500g', 'price': 22000, 'old_price': 25000, 'description': 'Aralash konfet. Roshen. Bayram uchun.', 'brand': 'Roshen', 'rating': 4.7, 'reviews_count': 45, 'tags': 'shirinlik, konfet, roshen'},
        {'name': 'Alpen Gold shokolad 100g', 'price': 8000, 'description': 'Qora shokolad. 72% kakao.', 'brand': 'Alpen Gold', 'rating': 4.8, 'reviews_count': 38, 'tags': 'shokolad, qora, 72%'},
        {'name': 'Takeda pechene 200g', 'price': 7500, 'old_price': 9000, 'description': 'Yumshoq pechene. Takeda.', 'brand': 'Takeda', 'rating': 4.5, 'reviews_count': 30, 'tags': 'pechene, takeda, yumshoq'},
        {'name': 'Halva 300g', 'price': 18000, 'description': 'Tutor halva. An\'anaviy. Eritish.', 'brand': 'Mahalliy', 'rating': 4.6, 'reviews_count': 22, 'tags': 'halva, tutor, an\'anaviy'},
        {'name': 'Meva konfet 300g', 'price': 15000, 'description': 'Meva lazzatli konfetlar.', 'brand': 'Roshen', 'rating': 4.4, 'reviews_count': 20, 'tags': 'konfet, meva, shirin'},
        {'name': 'Somonlik 200g', 'price': 5000, 'description': 'Shokoladli somonlik. Bolalar uchun.', 'brand': 'Alpen Gold', 'rating': 4.3, 'reviews_count': 15, 'tags': 'shirinlik, somonlik, bolalar'},
        {'name': 'Rexona shokolad 90g', 'price': 6500, 'old_price': 7500, 'description': 'Sutli shokolad. Rexona.', 'brand': 'Roshen', 'rating': 4.5, 'reviews_count': 25, 'tags': 'shokolad, sutli, rexona'},
        {'name': 'Kruassan', 'price': 4000, 'description': 'Yumshoq kruassan. 2 dona.', 'brand': 'Nonxon', 'rating': 4.6, 'reviews_count': 18, 'tags': 'pishiriq, kruassan, fransuz'},
        {'name': 'Pechene 300g', 'price': 9000, 'description': 'Klassik pechene. Qattiq.', 'brand': 'Takeda', 'rating': 4.4, 'reviews_count': 16, 'tags': 'pechene, klassik, qattiq'},
        {'name': 'Marmelad 200g', 'price': 8500, 'old_price': 10000, 'description': 'Meva marmelad. Turli xildagi.', 'brand': 'Roshen', 'rating': 4.3, 'reviews_count': 14, 'tags': 'shirinlik, marmelad, meva'},
    ],
    'Ichimliklar': [
        {'name': 'OxirZamon suv 1.5L', 'price': 3000, 'description': 'Toza ichimlik suvi. 1.5 litr.', 'brand': 'OxirZamon', 'rating': 4.3, 'reviews_count': 55, 'tags': 'ichimlik, suv, toza'},
        {'name': 'Nur sok 1L', 'price': 8000, 'old_price': 9500, 'description': 'Olma sok. 100% tabiiy.', 'brand': 'Nur', 'rating': 4.5, 'reviews_count': 28, 'tags': 'ichimlik, sok, olma'},
        {'name': 'Coca-Cola 1.5L', 'price': 7500, 'description': 'Coca-Cola. Klassik. 1.5 litr.', 'brand': 'Coca-Cola', 'rating': 4.7, 'reviews_count': 50, 'tags': 'ichimlik, koka-kola, gazli'},
        {'name': 'Kompot 1.5L', 'price': 4000, 'description': 'Mevali kompot. Tabiiy.', 'brand': 'OxirZamon', 'rating': 4.2, 'reviews_count': 20, 'tags': 'ichimlik, kompot, mevali'},
        {'name': 'Fanta 1.5L', 'price': 7000, 'description': 'Fanta apelsin. Gazli ichimlik.', 'brand': 'Coca-Cola', 'rating': 4.5, 'reviews_count': 35, 'tags': 'ichimlik, fanta, gazli'},
        {'name': 'Sprite 1.5L', 'price': 7000, 'old_price': 7500, 'description': 'Sprite. Limon-lime.', 'brand': 'Coca-Cola', 'rating': 4.4, 'reviews_count': 30, 'tags': 'ichimlik, sprite, gazli'},
        {'name': 'Choy 1.5L', 'price': 3500, 'description': 'Shokotali ichimlik. Bolalar uchun.', 'brand': 'OxirZamon', 'rating': 4.1, 'reviews_count': 15, 'tags': 'ichimlik, shokolad, bolalar'},
        {'name': 'Sok 1L (nok)', 'price': 7500, 'description': 'Nok soki. 100% mevali.', 'brand': 'Nur', 'rating': 4.6, 'reviews_count': 22, 'tags': 'ichimlik, sok, nok'},
        {'name': 'Suv 0.5L', 'price': 2000, 'description': 'Kichik shisha suv. Sayohat uchun.', 'brand': 'OxirZamon', 'rating': 4.3, 'reviews_count': 40, 'tags': 'ichimlik, suv, kichik'},
        {'name': 'Meyve suyuqligi 1L', 'price': 9000, 'old_price': 10500, 'description': 'Aralash meva sok.', 'brand': 'Nur', 'rating': 4.4, 'reviews_count': 18, 'tags': 'ichimlik, sok, aralash'},
    ],
    'Oziq-ovqat': [
        {'name': 'Guruch 1kg', 'price': 18000, 'old_price': 20000, 'description': 'Devzira guruch. Sifatli. Qizilo\'rda.', 'brand': 'Mahalliy', 'rating': 4.8, 'reviews_count': 42, 'tags': 'ovqat, guruch, devzira'},
        {'name': 'Makaron 500g', 'price': 5500, 'description': 'Italyan makaroni. Spagetti.', 'brand': 'Barilla', 'rating': 4.5, 'reviews_count': 30, 'tags': 'ovqat, makaron, spagetti'},
        {'name': 'Kartoshka 1kg', 'price': 6000, 'description': 'Yangi kartoshka. Mahalliy.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 25, 'tags': 'sabzavot, kartoshka, yangi'},
        {'name': 'Piyoz 1kg', 'price': 3500, 'old_price': 4500, 'description': 'Oq piyoz. Yangi.', 'brand': 'Mahalliy', 'rating': 4.2, 'reviews_count': 18, 'tags': 'sabzavot, piyoz, oq'},
        {'name': 'Tuz 1kg', 'price': 2500, 'description': 'Ovqat tuzi. Refined.', 'brand': 'Mahalliy', 'rating': 4.4, 'reviews_count': 20, 'tags': 'ovqat, tuz, refined'},
        {'name': 'Kungaboqar moyi 1L', 'price': 15000, 'description': 'Kungaboqar moyi. Zarafshon.', 'brand': 'Zarafshon', 'rating': 4.6, 'reviews_count': 35, 'tags': 'ovqat, moy, kungaboqar'},
        {'name': 'Baliq konserva', 'price': 12000, 'old_price': 14000, 'description': 'Konservalangan baliq. Sardina.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 16, 'tags': 'ovqat, baliq, konserva'},
        {'name': 'Tomato sous 400g', 'price': 6000, 'description': 'Pomidor sousi. Spagetti uchun.', 'brand': 'Barilla', 'rating': 4.4, 'reviews_count': 22, 'tags': 'ovqat, sous, pomidor'},
        {'name': 'Asal 500g', 'price': 45000, 'old_price': 50000, 'description': 'Tabiiy asal. Cho\'l.', 'brand': 'Mahalliy', 'rating': 4.8, 'reviews_count': 30, 'tags': 'ovqat, asal, tabiiy'},
        {'name': 'Quruq mevalar 300g', 'price': 22000, 'description': 'Aralash quruq mevalar.', 'brand': 'Mahalliy', 'rating': 4.5, 'reviews_count': 20, 'tags': 'ovqat, quruq mevalar, aralash'},
        {'name': 'Konservalangi loviya 400g', 'price': 5500, 'description': 'Loviya konservasi. Qayta ishlangan.', 'brand': 'Mahalliy', 'rating': 4.2, 'reviews_count': 14, 'tags': 'ovqat, loviya, konserva'},
        {'name': 'Qushqo\'nil 1L', 'price': 16000, 'description': 'Qushqo\'nil moyi. Zaytun.', 'brand': 'Mahalliy', 'rating': 4.7, 'reviews_count': 25, 'tags': 'ovqat, moy, qushqo\'nil'},
    ],
    'Go\'sht': [
        {'name': 'Mol go\'shti 1kg', 'price': 85000, 'old_price': 95000, 'description': 'Yangi mol go\'shti. Halol. Go\'shtxonadan.', 'brand': 'Mahalliy', 'rating': 4.8, 'reviews_count': 40, 'tags': 'go\'sht, mol, halol'},
        {'name': 'Tovuq go\'shti 1kg', 'price': 35000, 'description': 'Tovuq go\'shti. Toza. Tovuq fermasidan.', 'brand': 'Mahalliy', 'rating': 4.6, 'reviews_count': 35, 'tags': 'go\'sht, tovuq, toza'},
        {'name': 'Qiyma 500g', 'price': 45000, 'old_price': 50000, 'description': 'Aralash qiyma. Mol + qo\'yi.', 'brand': 'Mahalliy', 'rating': 4.7, 'reviews_count': 28, 'tags': 'go\'sht, qiyma, aralash'},
        {'name': 'Kolbasa 300g', 'price': 18000, 'description': 'Pishirilgan kolbasa. Klassik.', 'brand': 'Mahalliy', 'rating': 4.4, 'reviews_count': 22, 'tags': 'go\'sht, kolbasa, pishirilgan'},
        {'name': 'Qo\'yi go\'shti 1kg', 'price': 75000, 'description': 'Yangi qo\'yi go\'shti. Halol.', 'brand': 'Mahalliy', 'rating': 4.7, 'reviews_count': 32, 'tags': 'go\'sht, qo\'yi, halol'},
        {'name': 'Tovuq karkas 1kg', 'price': 28000, 'old_price': 32000, 'description': 'Butun tovuq. Pishirish uchun.', 'brand': 'Mahalliy', 'rating': 4.5, 'reviews_count': 26, 'tags': 'go\'sht, tovuq, butun'},
        {'name': 'Sujuk 500g', 'price': 32000, 'description': 'An\'anaviy sujuk. Achchiq.', 'brand': 'Mahalliy', 'rating': 4.6, 'reviews_count': 20, 'tags': 'go\'sht, sujuk, an\'anaviy'},
        {'name': 'Kartoshka fri 500g', 'price': 15000, 'old_price': 18000, 'description': 'Muzlatilgan kartoshka fri.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 18, 'tags': 'go\'sht, fri, kartoshka'},
    ],
    'Meva va sabzavot': [
        {'name': 'Qizil olma 1kg', 'price': 12000, 'old_price': 14000, 'description': 'Qizil olma. Shirin. Qashqadaryo.', 'brand': 'Mahalliy', 'rating': 4.7, 'reviews_count': 35, 'tags': 'meva, olma, qizil'},
        {'name': 'Banana 1kg', 'price': 18000, 'description': 'Import banana. Ekvador.', 'brand': 'Import', 'rating': 4.8, 'reviews_count': 40, 'tags': 'meva, banana, import'},
        {'name': 'Pomidor 1kg', 'price': 8000, 'description': 'Yangi pomidor. Issiqxona.', 'brand': 'Mahalliy', 'rating': 4.5, 'reviews_count': 28, 'tags': 'sabzavot, pomidor, yangi'},
        {'name': 'Bodring 1kg', 'price': 7000, 'old_price': 8500, 'description': 'Yangi bodring. Salat uchun.', 'brand': 'Mahalliy', 'rating': 4.6, 'reviews_count': 25, 'tags': 'sabzavot, bodring, yangi'},
        {'name': 'Sabzi 1kg', 'price': 5000, 'description': 'Yangi sabzi. Sharqona.', 'brand': 'Mahalliy', 'rating': 4.4, 'reviews_count': 20, 'tags': 'sabzavot, sabzi, yangi'},
        {'name': 'Karam 1kg', 'price': 4500, 'description': 'Oq karam. Salat uchun.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 18, 'tags': 'sabzavot, karam, oq'},
        {'name': 'Uzum 1kg', 'price': 15000, 'old_price': 18000, 'description': 'Yangi uzum. Qizil.', 'brand': 'Mahalliy', 'rating': 4.8, 'reviews_count': 38, 'tags': 'meva, uzum, qizil'},
        {'name': 'Anor 1kg', 'price': 20000, 'description': 'Yangi anor. Shirin.', 'brand': 'Mahalliy', 'rating': 4.7, 'reviews_count': 30, 'tags': 'meva, anor, shirin'},
        {'name': 'Mandarin 1kg', 'price': 14000, 'old_price': 16000, 'description': 'Mandarin. Yozgi.', 'brand': 'Mahalliy', 'rating': 4.5, 'reviews_count': 25, 'tags': 'meva, mandarin, yozgi'},
        {'name': 'Banan 1kg', 'price': 16000, 'description': 'Banana. Yangi.', 'brand': 'Import', 'rating': 4.6, 'reviews_count': 22, 'tags': 'meva, banana'},
        {'name': 'Nok 1kg', 'price': 10000, 'description': 'Yangi nok. Sariq.', 'brand': 'Mahalliy', 'rating': 4.4, 'reviews_count': 16, 'tags': 'meva, nok, sariq'},
        {'name': 'Gilos 1kg', 'price': 25000, 'old_price': 30000, 'description': 'Yangi gilos. Yozgi.', 'brand': 'Mahalliy', 'rating': 4.9, 'reviews_count': 35, 'tags': 'meva, gilos, yozgi'},
    ],
    'Uy-ro\'zg\'or': [
        {'name': 'BioMax kir yuvish kukuni 3kg', 'price': 85000, 'old_price': 95000, 'description': 'Kir yuvish kukuni. BioMax. 3 kilogramm.', 'brand': 'BioMax', 'rating': 4.7, 'reviews_count': 30, 'tags': 'uy-ro\'zg\'or, kir yuvish, kukun'},
        {'name': 'Gubka 3 dona', 'price': 3000, 'description': 'Idish yuvish gubkasi. 3 dona.', 'brand': 'Mahalliy', 'rating': 4.2, 'reviews_count': 15, 'tags': 'uy-ro\'zg\'or, gubka, idish'},
        {'name': 'Toilet qog\'ozi 4 rulon', 'price': 12000, 'old_price': 14000, 'description': 'Tualet qog\'ozi. 4 rulon.', 'brand': 'BioMax', 'rating': 4.5, 'reviews_count': 25, 'tags': 'uy-ro\'zg\'or, qog\'oz, tualet'},
        {'name': 'Moylagich 500ml', 'price': 7000, 'description': 'Idishlarni yuvish uchun moylagich.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 12, 'tags': 'uy-ro\'zg\'or, moylagich, idish'},
        {'name': 'Plastik paket 100 dona', 'price': 5000, 'description': 'Oziq-ovqat uchun plastik paketlar.', 'brand': 'Mahalliy', 'rating': 4.1, 'reviews_count': 10, 'tags': 'uy-ro\'zg\'or, paket, plastik'},
        {'name': 'Salfetka 100 dona', 'price': 4000, 'old_price': 5000, 'description': 'Qog\'oz salfetka. 100 dona.', 'brand': 'BioMax', 'rating': 4.4, 'reviews_count': 18, 'tags': 'uy-ro\'zg\'or, salfetka, qog\'oz'},
    ],
    'Gigiena': [
        {'name': 'Colgate tish pastasi 100ml', 'price': 15000, 'description': 'Fluoridli tish pastasi. Colgate.', 'brand': 'Colgate', 'rating': 4.7, 'reviews_count': 35, 'tags': 'gigiena, tish pastasi, colgate'},
        {'name': 'Pantene shampun 400ml', 'price': 22000, 'old_price': 25000, 'description': 'Har kuni ishlatish uchun shampun.', 'brand': 'Pantene', 'rating': 4.6, 'reviews_count': 28, 'tags': 'gigiena, shampun, pantene'},
        {'name': 'Dove sabun 100g', 'price': 5000, 'description': 'Antibakterial sabun. Dove.', 'brand': 'Dove', 'rating': 4.5, 'reviews_count': 22, 'tags': 'gigiena, sabun, dove'},
        {'name': 'Dezodorant 150ml', 'price': 18000, 'description': 'Erkaklar uchun dezodorant.', 'brand': 'Nivea', 'rating': 4.4, 'reviews_count': 20, 'tags': 'gigiena, dezodorant, erkak'},
        {'name': 'Papel 100 dona', 'price': 8000, 'old_price': 10000, 'description': 'Papel. 100 dona.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 15, 'tags': 'gigiena, papel, qog\'oz'},
        {'name': 'Shampun 200ml', 'price': 12000, 'description': 'Kuchsiz soch uchun shampun.', 'brand': 'Pantene', 'rating': 4.5, 'reviews_count': 18, 'tags': 'gigiena, shampun, kuchsiz'},
    ],
    'Mahalliy mahsulotlar': [
        {'name': 'Qashqadaryo asali 500g', 'price': 55000, 'old_price': 60000, 'description': 'Tabiiy asal. Qashqadaryo viloyatidan.', 'brand': 'Mahalliy', 'rating': 4.9, 'reviews_count': 45, 'tags': 'mahalliy, asal, qashqadaryo'},
        {'name': 'Qo\'qon devzirasi 2kg', 'price': 38000, 'description': 'Qo\'qon devzirasi guruchi.', 'brand': 'Mahalliy', 'rating': 4.8, 'reviews_count': 35, 'tags': 'mahalliy, guruch, qo\'qon'},
        {'name': 'Surxondaryo anori', 'price': 22000, 'old_price': 25000, 'description': 'Surxondaryodan yangi anor.', 'brand': 'Mahalliy', 'rating': 4.7, 'reviews_count': 30, 'tags': 'mahalliy, anor, surxondaryo'},
        {'name': 'Farg\'ona uzumi 1kg', 'price': 18000, 'description': 'Farg\'ona vodiysi uzumi.', 'brand': 'Mahalliy', 'rating': 4.8, 'reviews_count': 32, 'tags': 'mahalliy, uzum, farg\'ona'},
    ],
    'Bolalar': [
        {'name': 'Nutrilon 400g', 'price': 65000, 'old_price': 72000, 'description': 'Chaqaloq uchun sut aralashmasi.', 'brand': 'Nutrilon', 'rating': 4.8, 'reviews_count': 40, 'tags': 'bolalar, sut, chaqaloq'},
        {'name': 'Bolalar pechenesi 200g', 'price': 8000, 'description': 'Bolalar uchun yumshoq pechene.', 'brand': 'Takeda', 'rating': 4.5, 'reviews_count': 25, 'tags': 'bolalar, pechene, yumshoq'},
        {'name': 'Bolalar sok 1L', 'price': 9000, 'old_price': 10500, 'description': 'Bolalar uchun meva sok.', 'brand': 'Nur', 'rating': 4.6, 'reviews_count': 22, 'tags': 'bolalar, sok, meva'},
        {'name': 'Pampers 30 dona', 'price': 45000, 'description': 'Bolalar tagliklari. 30 dona.', 'brand': 'Pampers', 'rating': 4.7, 'reviews_count': 35, 'tags': 'bolalar, taglik, pampers'},
    ],
    'Texnika': [
        {'name': 'Batareya AA 4 dona', 'price': 8000, 'description': 'AA batareya. 4 dona.', 'brand': 'Duracell', 'rating': 4.5, 'reviews_count': 20, 'tags': 'texnika, batareya, duracell'},
        {'name': 'Chiroq (LED)', 'price': 15000, 'old_price': 18000, 'description': 'LED chiroq. Yorqin.', 'brand': 'Mahalliy', 'rating': 4.3, 'reviews_count': 12, 'tags': 'texnika, chiroq, led'},
    ],
}

CUSTOMER_NAMES = [
    'Aziz Karimov', 'Bobur Alimov', 'Sardor Raximov', 'Dilshod Toshmatov',
    'Jasur Ergashev', 'Kamoliddin Nazarov', 'Malika Yuldasheva', 'Nodira Karimova',
    'Ozoda Mirzayeva', 'Gulnora Abduvaliyeva', 'Suhrob Jumayev', 'Timur Tursunov',
    'Farruh Ruziyev', 'Baxtiyor Eshonqulov', 'Sherzod Mamatqulov', 'Akbar Turg\'unov',
    'Nodirbek Xolmatov', 'Sarvar Abdujalilov', 'Oybek Toshmatov', 'Javlon Anvarov',
    'Gulsanam Karimova', 'Nilufar Alimova', 'Dilnoza Raximova', 'Malohat Eshonqulova',
    'Barno Mamatqulova', 'Shahnoza Mirzayeva', 'Guzal Ergasheva', 'Zilola Turg\'unova',
    'Nargiza Xolmatova', 'Feruza Abdujalilova', 'Shohista Ruziyeva', 'Mohlaroyim Toshmatova',
]

REVIEW_COMMENTS = [
    'Juda yaxshi mahsulot! Davom eting.',
    'Sifati zo\'r. Tavsiya qilaman.',
    'Narxi munosib. Yana olaman.',
    'Tez yetkazishdi. Rahmat!',
    'Mazali ekan. Bolalar ham yoqtirishdi.',
    'Yaxshi sifat. Doimiy buyurtma qilaman.',
    'Rahmat, juda qulay xizmat.',
    'Yangi mahsulot ekani ko\'rinib turadi.',
    'Do\'konga yaqin. Qulay.',
    'Narx arzon, sifat yuqori.',
    'Doimo shu do\'kondan olaman.',
    'Tavsiya qilaman, ishonchli do\'kon.',
    'Yetkazish tez. 30 daqiqada yetdi.',
    'Mahsulot yangi. Rangi chiroyli.',
    'Yana ko\'proq olaman.',
    'Chuqur mahsulot. Sifatli.',
    'Do\'kon xizmati a\'lo.',
    'Narx ham, sifat ham zo\'r.',
    'Har doim yangi mahsulotlar bor.',
    'Qulay yetkazish xizmati.',
]


def _generate_product_image(name, bg_color, text_color='#FFFFFF', size=(600, 600)):
    img = Image.new('RGB', size, bg_color)
    draw = ImageDraw.Draw(img)
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), name, font=font_large)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (size[0] - w) // 2
    y = (size[1] - h) // 2 - 20
    draw.text((x, y), name, fill=text_color, font=font_large)
    sub = 'Online Store Guliston'
    bbox2 = draw.textbbox((0, 0), sub, font=font_small)
    w2 = bbox2[2] - bbox2[0]
    draw.text(((size[0] - w2) // 2, y + h + 20), sub, fill=text_color, font=font_small)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    return ContentFile(buf.getvalue(), f'{name[:30].replace(" ", "_")}.jpg')


BG_COLORS = [
    '#16a34a', '#2563eb', '#dc2626', '#f59e0b', '#8b5cf6',
    '#0891b2', '#059669', '#d946ef', '#ea580c', '#4f46e5',
]


class Command(BaseCommand):
    help = 'To\'liq seed: do\'konlar, mahsulotlar, sharhlar'

    def handle(self, *args, **options):
        self.stdout.write('Do\'konlar yaratilmoqda...')
        shops = []
        for data in SHOPS_DATA:
            shop, created = Shop.objects.update_or_create(
                slug=data['slug'], defaults=data
            )
            shops.append(shop)
            status = 'YANGI' if created else 'YANGILANDI'
            self.stdout.write(f'  {status}: {shop.name}')

        self.stdout.write(f'\nKategoriyalar tekshirilmoqda...')
        categories = {}
        for cat in Category.objects.filter(is_active=True):
            categories[cat.name] = cat
        if not categories:
            self.stdout.write(self.style.WARNING('Kategoriyalar topilmadi!'))

        self.stdout.write(f'\nMahsulotlar yaratilmoqda...')
        created_count = 0
        for cat_name, products_list in PRODUCTS_DATA.items():
            category = None
            for cn, cat in categories.items():
                if cat_name.lower() in cn.lower() or cn.lower() in cat_name.lower():
                    category = cat
                    break
            if not category and categories:
                category = list(categories.values())[random.randint(0, len(categories) - 1)]

            for pdata in products_list:
                if Product.objects.filter(name=pdata['name']).exists():
                    self.stdout.write(f'  SKIP: {pdata["name"]}')
                    continue

                shop = random.choice(shops)
                color = BG_COLORS[hash(pdata['name']) % len(BG_COLORS)]
                img_file = _generate_product_image(pdata['name'], color)

                product = Product(
                    name=pdata['name'],
                    description=pdata.get('description', ''),
                    price=pdata['price'],
                    old_price=pdata.get('old_price'),
                    unit='dona',
                    category=category,
                    shop=shop,
                    brand=pdata.get('brand', ''),
                    country_of_origin='O\'zbekiston',
                    is_available=True,
                    stock=random.randint(10, 200),
                    is_organic=random.random() > 0.7,
                    is_halal=True,
                    rating=pdata.get('rating', 0),
                    reviews_count=pdata.get('reviews_count', 0),
                    is_featured=random.random() > 0.5,
                    tags=pdata.get('tags', cat_name),
                )
                product.save()
                product.image.save(img_file.name, img_file, save=True)
                created_count += 1
                self.stdout.write(f'  + {product.name} ({shop.name})')

        self.stdout.write(self.style.SUCCESS(f'\n{created_count} ta mahsulot yaratildi'))

        self.stdout.write(f'\nSharhlar yaratilmoqda...')
        all_products = list(Product.objects.filter(is_available=True))
        all_customers = []
        for i, name in enumerate(CUSTOMER_NAMES):
            phone = f'+99890{random.randint(1000000, 9999999)}'
            customer, _ = Customer.objects.get_or_create(
                phone=phone, defaults={'name': name}
            )
            all_customers.append(customer)

        review_count = 0
        for _ in range(80):
            product = random.choice(all_products)
            customer = random.choice(all_customers)
            review = Review.objects.create(
                product=product,
                customer=customer,
                rating=random.randint(3, 5),
                comment=random.choice(REVIEW_COMMENTS),
            )
            review_count += 1

        self.stdout.write(self.style.SUCCESS(f'{review_count} ta sharh yaratildi'))

        self.stdout.write(self.style.SUCCESS('\n=== TAYYOR ==='))
        self.stdout.write(f'  Do\'konlar: {len(shops)}')
        self.stdout.write(f'  Mahsulotlar: {Product.objects.count()}')
        self.stdout.write(f'  Sharhlar: {Review.objects.count()}')
