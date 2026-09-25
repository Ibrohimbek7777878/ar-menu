import re
import logging
from django.db.models import F
from .models import ProductLibrary, Product3DModel

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """
    O'zbek va rus tillaridagi so'zlarni to'g'ri normallashtiradi.
    O'zbek tilidagi 'o'' va 'g'' harflarini so'z o'rtasida bo'lib yubormaydi.
    """
    if not text:
        return ""
    text = text.lower()
    # O'zbekcha o' va g' harflarini standartlashtirish
    text = re.sub(r"[oO]['`’ʼʻ]", "o", text)
    text = re.sub(r"[gG]['`’ʼʻ]", "g", text)
    # Belgilar va tinish belgilarini bo'sh joyga almashtirish
    text = re.sub(r"['`’ʼʻ\".,!?()\[\]{}:;\-_/\\#*+~]", " ", text)
    return " ".join(text.split())


DEFAULT_LIBRARY_ITEMS = [
    {
        'key': 'meva-sabzavot',
        'name_uz': 'Mevalar (Meva & Rezavor)',
        'name_ru': 'Фрукты и ягоды',
        'category_key': 'fruits',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb',
        'aliases': ['meva', 'mevalar', 'olma', 'banan', 'banana', 'anor', 'uzum', 'nok', 'shaftoli', 'apelsin', 'mandarin', 'limon', 'qulupnay', 'tarvuz', 'qovun', 'olxori', 'gilos', 'orik'],
        'real_size_cm': 15,
    },
    {
        'key': 'sabzavotlar',
        'name_uz': 'Sabzavotlar va ko\'katlar',
        'name_ru': 'Овощи и зелень',
        'category_key': 'vegetables',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb',
        'aliases': ['sabzavot', 'sabzavotlar', 'pomidor', 'bodring', 'kartoshka', 'piyoz', 'sabzi', 'karam', 'sarimsoq', 'qalampir', 'baqlajon', 'kashnich', 'shivit', 'turp', 'kokat'],
        'real_size_cm': 18,
    },
    {
        'key': 'ichimliklar',
        'name_uz': 'Ichimliklar va Suv',
        'name_ru': 'Напитки и вода',
        'category_key': 'drinks',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/WaterBottle/glTF-Binary/WaterBottle.glb',
        'aliases': ['suv', 'ichimlik', 'ichimliklar', 'choy', 'kofe', 'qahva', 'sharbat', 'sok', 'mineral', 'gazli', 'cola', 'fanta', 'sprite', 'pepsi', 'kompot', 'moxito', 'energy'],
        'real_size_cm': 28,
    },
    {
        'key': 'gosht-mahsulotlari',
        'name_uz': 'Go\'sht va Kolbasa',
        'name_ru': 'Мясо и мясные изделия',
        'category_key': 'meat',
        'glb_url': '/media/products/dish_3d.glb',
        'aliases': ['gosht', 'mol', 'mol goshti', 'qoy', 'qoy goshti', 'tovuq', 'qiyma', 'jigar', 'sosiska', 'kolbasa', 'kabob', 'shashlik', 'lahm', 'dumba'],
        'real_size_cm': 25,
    },
    {
        'key': 'sut-mahsulotlari',
        'name_uz': 'Sut va Qatiq mahsulotlari',
        'name_ru': 'Молочная продукция',
        'category_key': 'dairy',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/WaterBottle/glTF-Binary/WaterBottle.glb',
        'aliases': ['sut', 'qatiq', 'pishloq', 'tvorog', 'qaymoq', 'sariyog', 'suzma', 'ayron', 'kefir', 'sir', 'bryndza'],
        'real_size_cm': 20,
    },
    {
        'key': 'non-pishiriq',
        'name_uz': 'Non va Pishiriqlar',
        'name_ru': 'Хлеб и выпечка',
        'category_key': 'bakery',
        'glb_url': '/media/products/dish_3d.glb',
        'aliases': ['non', 'patir', 'buxanka', 'tandir non', 'somsa', 'lavash', 'shirinlik', 'pechene', 'pechenye', 'tort', 'pirog', 'keks', 'buloq', 'pishiriq'],
        'real_size_cm': 22,
    },
    {
        'key': 'oziq-ovqat',
        'name_uz': 'Oziq-ovqat va Baqqollik',
        'name_ru': 'Бакалея и продукты',
        'category_key': 'grocery',
        'glb_url': '/media/products/dish_3d.glb',
        'aliases': ['oziq ovqat', 'guruch', 'shakar', 'tuz', 'makaron', 'un', 'yog', 'grechka', 'dovuchcha', 'loviya', 'noxat', 'konserva', 'tuxum', 'baqqollik'],
        'real_size_cm': 25,
    },
    {
        'key': 'gigiena',
        'name_uz': 'Gigiena va Kosmetika',
        'name_ru': 'Гигиена и косметика',
        'category_key': 'hygiene',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Lantern/glTF-Binary/Lantern.glb',
        'aliases': ['gigiena', 'sabun', 'sovun', 'shampun', 'tish pastasi', 'chotka', 'krem', 'dezodorant', 'antiseptik', 'salfetka', 'gel', 'kosmetika'],
        'real_size_cm': 15,
    },
    {
        'key': 'uy-rozgor',
        'name_uz': 'Uy-ro\'zg\'or buyumlari',
        'name_ru': 'Хозтовары и быт',
        'category_key': 'household',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Lantern/glTF-Binary/Lantern.glb',
        'aliases': ['uy rozgor', 'idish', 'qozon', 'tova', 'choynak', 'piyola', 'tozalash', 'yuvish', 'poroshok', 'taroq', 'lampa', 'xoztover'],
        'real_size_cm': 30,
    },
    {
        'key': 'bolalar',
        'name_uz': 'Bolalar tovarlari',
        'name_ru': 'Детские товары',
        'category_key': 'kids',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb',
        'aliases': ['bolalar', 'bola', 'pampers', 'taglik', 'emzik', 'butilka', 'botqa', 'oyinchoq'],
        'real_size_cm': 20,
    },
    {
        'key': 'texnika-elektronika',
        'name_uz': 'Elektronika va Aksessuarlar',
        'name_ru': 'Электроника и аксессуары',
        'category_key': 'tech',
        'glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoomBox/glTF-Binary/BoomBox.glb',
        'aliases': ['texnika', 'elektronika', 'telefon', 'gilof', 'chexol', 'planshet', 'noutbuk', 'quloqchin', 'naushnik', 'zaryadnik', 'kabel', 'gadjet'],
        'real_size_cm': 16,
    },
    {
        'key': 'kiyim-poyabzal',
        'name_uz': 'Kiyim va Poyabzal',
        'name_ru': 'Одежда и обувь',
        'category_key': 'fashion',
        'glb_url': 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
        'aliases': ['kiyim', 'koylak', 'futbolka', 'shim', 'kostyum', 'kurtka', 'sviter', 'paypoq', 'krasovka', 'krossovka', 'poyabzal', 'tufli', 'etik', 'shippak'],
        'real_size_cm': 60,
    },
    {
        'key': 'mahalliy-mahsulotlar',
        'name_uz': 'Mahalliy mahsulotlar',
        'name_ru': 'Местные товары',
        'category_key': 'local',
        'glb_url': '/media/products/dish_3d.glb',
        'aliases': ['mahalliy', 'asal', 'quruq meva', 'yongoq', 'mayiz', 'turshak', 'holva', 'sumalak'],
        'real_size_cm': 20,
    },
    {
        'key': 'osh-toshkent',
        'name_uz': 'Osh (To\'y Palovi)',
        'name_ru': 'Плов ташкентский',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/plov.glb',
        'aliases': ['osh', 'palov', 'plov', 'toshkent oshi', 'choyxona oshi', 'toy oshi', 'samarqand oshi'],
        'real_size_cm': 32,
    },
    {
        'key': 'manti',
        'name_uz': 'Qasqon Manti',
        'name_ru': 'Манты',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/manti.glb',
        'aliases': ['manti', 'qovurma manti', 'oshqovoq manti', 'goshtli manti'],
        'real_size_cm': 28,
    },
    {
        'key': 'somsa-goshtli',
        'name_uz': 'Tandir Somsa',
        'name_ru': 'Самса тандырная',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/somsa.glb',
        'aliases': ['somsa', 'tandir somsa', 'qozon somsa', 'goshtli somsa', 'varaqi somsa', 'samsa'],
        'real_size_cm': 16,
    },
    {
        'key': 'lagmon',
        'name_uz': 'Qovurma Lag\'mon',
        'name_ru': 'Лагман жареный',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/lagmon.glb',
        'aliases': ['lagmon', 'qovurma lagmon', 'chozma lagmon', 'uygur lagmon'],
        'real_size_cm': 26,
    },
    {
        'key': 'shashlik',
        'name_uz': 'G\'ijduvon Shashlik',
        'name_ru': 'Шашлык гиждуванский',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/shashlik.glb',
        'aliases': ['shashlik', 'kabob', 'qiyma', 'kuskovoy', 'jigar', 'tovuq shashlik', 'kebab'],
        'real_size_cm': 30,
    },
    {
        'key': 'qozon-kabob',
        'name_uz': 'Qozon Kabob',
        'name_ru': 'Казан-кебаб',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/qozon_kabob.glb',
        'aliases': ['qozon kabob', 'jarkop', 'qovurilgan gosht'],
        'real_size_cm': 28,
    },
    {
        'key': 'shorva',
        'name_uz': 'Qo\'y Go\'shti Sho\'rva',
        'name_ru': 'Шурпа из баранины',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/shorva.glb',
        'aliases': ['shorva', 'sho\'rva', 'kaynatma', 'bolla shorva'],
        'real_size_cm': 22,
    },
    {
        'key': 'mastava',
        'name_uz': 'Mastava',
        'name_ru': 'Мастава',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/mastava.glb',
        'aliases': ['mastava', 'guruchli shorva'],
        'real_size_cm': 22,
    },
    {
        'key': 'non-patir',
        'name_uz': 'Samarqand Patir Non',
        'name_ru': 'Самаркандский патыр',
        'category_key': 'bakery',
        'glb_url': '/media/ar/glb/non.glb',
        'aliases': ['non', 'patir', 'obi non', 'tandir non'],
        'real_size_cm': 24,
    },
    {
        'key': 'salad-achichuk',
        'name_uz': 'Achchiq-Chuchuk Salati',
        'name_ru': 'Салат Ачик-чучук',
        'category_key': 'vegetables',
        'glb_url': '/media/ar/glb/salad_achichuk.glb',
        'aliases': ['achichuk', 'achchiq chuchuk', 'pomidor bodring', 'shakarob'],
        'real_size_cm': 20,
    },
    {
        'key': 'salad-bahor',
        'name_uz': 'Bahor Salati',
        'name_ru': 'Салат Весенний',
        'category_key': 'vegetables',
        'glb_url': '/media/ar/glb/salad_bahor.glb',
        'aliases': ['bahor salat', 'yashil salat', 'sezar'],
        'real_size_cm': 20,
    },
    {
        'key': 'tea-cup',
        'name_uz': 'Zafaronli Ko\'k Choy',
        'name_ru': 'Зеленый чай с шафраном',
        'category_key': 'drinks',
        'glb_url': '/media/ar/glb/tea_cup.glb',
        'aliases': ['choy', 'kok choy', 'qora choy', 'choynak', 'piyola'],
        'real_size_cm': 18,
    },
    {
        'key': 'steak-meat',
        'name_uz': 'Lahm Steyk Go\'sht',
        'name_ru': 'Стейк из говядины',
        'category_key': 'meat',
        'glb_url': '/media/ar/glb/steak_meat.glb',
        'aliases': ['steyk', 'steak', 'antrekot', 'gril gosht'],
        'real_size_cm': 25,
    },
    {
        'key': 'breakfast-egg',
        'name_uz': 'Qovurilgan Tuxum Nonushta',
        'name_ru': 'Яичница на завтрак',
        'category_key': 'national',
        'glb_url': '/media/ar/glb/breakfast_egg.glb',
        'aliases': ['tuxum', 'nonushta', 'omlet', 'qovurma tuxum'],
        'real_size_cm': 20,
    },
    {
        'key': 'dessert-bowl',
        'name_uz': 'Sharqona Shirinlik',
        'name_ru': 'Восточный десерт',
        'category_key': 'bakery',
        'glb_url': '/media/ar/glb/dessert_bowl.glb',
        'aliases': ['desert', 'shirinlik', 'paxlava', 'tort', 'muzqaymoq'],
        'real_size_cm': 18,
    },
    {
        'key': 'drink-bottle',
        'name_uz': 'Salqin Ichimlik',
        'name_ru': 'Прохладительный напиток',
        'category_key': 'drinks',
        'glb_url': '/media/ar/glb/drink_bottle.glb',
        'aliases': ['suv', 'ichimlik', 'cola', 'fanta', 'sharbat', 'kompot'],
        'real_size_cm': 28,
    },
]


def seed_product_library():
    """Barcha toifalar uchun 3D modellarni bazaga yuklaydi yoki yangilaydi."""
    for item in DEFAULT_LIBRARY_ITEMS:
        ProductLibrary.objects.update_or_create(
            key=item['key'],
            defaults={
                'name_uz': item['name_uz'],
                'name_ru': item.get('name_ru', ''),
                'category_key': item.get('category_key', 'national'),
                'glb_url': item['glb_url'],
                'aliases': item.get('aliases', []),
                'real_size_cm': item.get('real_size_cm', 25),
                'is_active': True,
            }
        )


def match_library_model(product_name: str, category_name: str = None):
    """
    Mahsulot nomi yoki kategoriyasiga mos keluvchi 3D kutubxona modelini topadi.
    1. Mahsulot nomi bo'yicha (aliases, key, nomlar)
    2. Mahsulot toifasi bo'yicha (kategoriya nomi)
    """
    if not product_name and not category_name:
        return None

    # Kutubxona bo'sh bo'lsa yoki kam bo'lsa to'ldirish
    if ProductLibrary.objects.filter(is_active=True).count() < 12:
        seed_product_library()

    p_norm = normalize_text(product_name)
    words = set(p_norm.split()) if p_norm else set()

    active_libs = list(ProductLibrary.objects.filter(is_active=True))

    # 1-BOSQICH: Mahsulot nomi bo'yicha to'g'ridan-to'g'ri moslik
    if p_norm:
        for lib in active_libs:
            # A) Aliases tekshirish
            if lib.aliases:
                for alias in lib.aliases:
                    a_norm = normalize_text(alias)
                    if not a_norm:
                        continue
                    # To'liq so'z, substring yoki so'z to'plami mosligi
                    if a_norm in p_norm or (len(a_norm.split()) == 1 and a_norm in words):
                        return lib
                    # Stem mosligi (masalan 'olma' in 'olmalar', 'banan' in 'banana')
                    for w in words:
                        if len(w) >= 4 and len(a_norm) >= 4 and (w.startswith(a_norm) or a_norm.startswith(w)):
                            return lib

            # B) Key tekshirish (masalan 'meva-sabzavot')
            k_norm = normalize_text(lib.key)
            if k_norm and k_norm in p_norm:
                return lib
            for kw in k_norm.split():
                if len(kw) >= 3 and kw in words:
                    return lib

            # C) Nomlar (UZ / RU)
            u_norm = normalize_text(lib.name_uz)
            if u_norm and u_norm in p_norm:
                return lib
            for uw in u_norm.split():
                if len(uw) >= 4 and uw in words:
                    return lib

            if lib.name_ru:
                r_norm = normalize_text(lib.name_ru)
                if r_norm and r_norm in p_norm:
                    return lib
                for rw in r_norm.split():
                    if len(rw) >= 4 and rw in words:
                        return lib

    # 2-BOSQICH: Kategoriya nomi bo'yicha moslik
    if category_name:
        c_norm = normalize_text(category_name)
        c_words = set(c_norm.split())

        for lib in active_libs:
            # Kategoriya key mosligi
            k_norm = normalize_text(lib.key)
            if k_norm and (k_norm in c_norm or any(kw in c_words for kw in k_norm.split() if len(kw) >= 3)):
                return lib

            # Kategoriya nomlari mosligi
            u_norm = normalize_text(lib.name_uz)
            if u_norm and (u_norm in c_norm or any(uw in c_words for uw in u_norm.split() if len(uw) >= 4)):
                return lib

            # Kategoriya aliases
            if lib.aliases:
                for alias in lib.aliases:
                    a_norm = normalize_text(alias)
                    if a_norm and (a_norm in c_norm or a_norm in c_words):
                        return lib

    return None


def auto_attach_library_3d(product, force=False, fallback_to_image=True):
    """
    Mahsulotga 3D model biriktiradi:
    1. Kutubxonadan nom va kategoriya bo'yicha mos model qidiradi.
    2. Topilmasa va rasm bo'lsa — rasmdan avtomatik 3D GLB model yaratadi.
    3. Hech biri bo'lmasa — umumiy do'kon 3D modelini ulaydi.
    Hech qachon xatosiz va bo'sh qoldirmasdan 100% muvaffaqiyatli ishlaydi.
    """
    if not force and product.has_3d and product.ar_model:
        return False, None

    category_name = product.category.name if product.category else None
    matched = match_library_model(product.name, category_name=category_name)

    if matched and matched.glb_url:
        product.ar_model = matched.glb_url
        product.has_3d = True
        product.save(update_fields=['ar_model', 'has_3d'])

        ProductLibrary.objects.filter(pk=matched.pk).update(used_by_count=F('used_by_count') + 1)
        Product3DModel.objects.update_or_create(
            product=product,
            defaults={
                'library': matched,
                'status': 'ready',
                'source': f'library:{matched.key}',
                'real_size_cm': matched.real_size_cm,
            }
        )
        return True, matched

    # 2. Rasmdan 3D generatsiya qilish
    if fallback_to_image and product.image:
        try:
            from .generator import create_3d_for_product
            ok, model_url = create_3d_for_product(product)
            if ok:
                return True, None
        except Exception as e:
            logger.warning(f"Rasmdan 3D yaratishda xato ({product.name}): {e}")

    # 3. Zaxira (Fallback) umumiy 3D model
    fallback_lib = (
        ProductLibrary.objects.filter(is_active=True, key='oziq-ovqat').first()
        or ProductLibrary.objects.filter(is_active=True).first()
    )
    fallback_url = fallback_lib.glb_url if fallback_lib and fallback_lib.glb_url else '/media/products/dish_3d.glb'

    product.ar_model = fallback_url
    product.has_3d = True
    product.save(update_fields=['ar_model', 'has_3d'])

    Product3DModel.objects.update_or_create(
        product=product,
        defaults={
            'library': fallback_lib,
            'status': 'ready',
            'source': 'auto_fallback',
            'real_size_cm': getattr(fallback_lib, 'real_size_cm', 25) if fallback_lib else 25,
        }
    )
    return True, fallback_lib
