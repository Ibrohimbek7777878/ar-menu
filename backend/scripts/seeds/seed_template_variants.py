"""V9 FAZA 6: har kategoriyaga 3 yangi shablon varianti (d=Soft, e=Mono, f=Neon).
Ishga tushirish: cd backend && ./venv/bin/python manage.py shell < seed_template_variants.py
Natija: 60 → 120 shablon (20 kategoriya × 6). Idempotent — mavjud slug'ni qayta yaratmaydi.
"""
import colorsys

from shops.models import ShopTemplate

CATEGORY_HUES = {
    'minimal': 145, 'modern': 210, 'classic': 35, 'bold': 0, 'elegant': 280,
    'minimalist': 200, 'creative': 320, 'corporate': 220, 'fashion': 340,
    'food': 25, 'electronics': 195, 'grocery': 110, 'pharmacy': 175,
    'beauty': 330, 'sports': 15, 'home': 45, 'automotive': 230,
    'books': 265, 'kids': 55, 'pets': 130,
}

def _hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360.0, l / 100.0, s / 100.0)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))

def palettes(h):
    return {
        'd': {  # Soft — pastel, yumshoq
            'primary': _hsl(h, 55, 45), 'secondary': _hsl((h + 30) % 360, 50, 80),
            'accent': _hsl((h + 30) % 360, 55, 65), 'background': _hsl(h, 60, 97),
            'surface': _hsl(h, 50, 94), 'text_primary': '#1f2937', 'text_secondary': '#6b7280',
        },
        'e': {  # Mono — oq-qora, minimal
            'primary': '#111827', 'secondary': '#4b5563', 'accent': '#6b7280',
            'background': '#ffffff', 'surface': '#f5f5f5',
            'text_primary': '#111111', 'text_secondary': '#6b7280',
        },
        'f': {  # Neon — premium, tunda yorqin
            'primary': _hsl(h, 95, 60), 'secondary': _hsl((h + 150) % 360, 80, 50),
            'accent': _hsl((h + 150) % 360, 95, 55), 'background': '#0b1020',
            'surface': '#141b2e', 'text_primary': '#e2e8f0', 'text_secondary': '#94a3b8',
        },
    }

VARIANTS = {
    'd': ('Soft', dict(
        layout=[
            {'type': 'banner', 'title': 'Yangi kelganlar', 'subtitle': '', 'image': ''},
            {'type': 'hero', 'title': '', 'subtitle': '', 'image': '', 'cta_text': "Katalogga o'tish"},
            {'type': 'product_grid', 'title': 'Mahsulotlar', 'subtitle': '', 'limit': 12, 'product_ids': [], 'product_filter': ''},
            {'type': 'features', 'title': 'Nega biz?', 'items': [
                {'icon': '🚚', 'title': 'Tez yetkazish', 'text': '30 daqiqada'},
                {'icon': '🥬', 'title': 'Yangi mahsulot', 'text': 'Har kuni'},
                {'icon': '💳', 'title': 'Qulay to\'lov', 'text': 'Click/Payme/Naqd'},
            ]},
            {'type': 'info_strip', 'title': 'Aloqa', 'subtitle': ''},
        ], premium=False)),
    'e': ('Mono', dict(
        layout=[
            {'type': 'hero', 'title': '', 'subtitle': '', 'image': '', 'cta_text': "Katalogga o'tish"},
            {'type': 'category_strip', 'title': 'Kategoriyalar', 'subtitle': ''},
            {'type': 'product_grid', 'title': 'Mahsulotlar', 'subtitle': '', 'limit': 12, 'product_ids': [], 'product_filter': ''},
            {'type': 'richtext', 'title': 'Biz haqimizda', 'text': 'Sifat va ishonch — bizning tamoyilimiz.', 'subtitle': ''},
            {'type': 'info_strip', 'title': 'Aloqa', 'subtitle': ''},
        ], premium=False)),
    'f': ('Neon', dict(
        layout=[
            {'type': 'hero', 'title': '', 'subtitle': '', 'image': '', 'cta_text': "Hoziroq buyurtma qiling"},
            {'type': 'banner', 'title': 'Chegirmalar', 'subtitle': 'Faqat bugun', 'image': ''},
            {'type': 'product_grid', 'title': 'Top mahsulotlar', 'subtitle': '', 'limit': 12, 'product_ids': [], 'product_filter': ''},
            {'type': 'features', 'title': 'Afzalliklar', 'items': [
                {'icon': '⚡', 'title': '1 soatda', 'text': 'Express yetkazish'},
                {'icon': '🔥', 'title': 'Kunlik aksiya', 'text': 'Har kuni yangi'},
                {'icon': '🏆', 'title': 'Sifat kafolati', 'text': '100% original'},
            ]},
            {'type': 'cta', 'title': 'Buyurtma berishga tayyormisiz?', 'subtitle': '', 'cta_text': 'Buyurtma berish', 'cta_link': '/catalog/'},
        ], premium=True)),
}

SECTION_DEFAULTS = {
    'hero': {'title': '', 'subtitle': '', 'image': '', 'cta_text': "Katalogga o'tish", 'cta_link': '/catalog/'},
    'banner': {'subtitle': '', 'image': ''},
    'product_grid': {'subtitle': '', 'limit': 12, 'product_ids': [], 'product_filter': ''},
    'category_strip': {'subtitle': ''},
    'features': {}, 'info_strip': {}, 'richtext': {'text': ''},
    'cta': {'subtitle': '', 'cta_text': 'Buyurtma berish', 'cta_link': '/catalog/'},
    'map': {'subtitle': ''}, 'reviews': {'subtitle': ''},
}

created = 0
for cat, hue in CATEGORY_HUES.items():
    cat_name = cat.capitalize()
    for suffix, (label, spec) in VARIANTS.items():
        slug = f"{cat}-{suffix}"
        if ShopTemplate.objects.filter(slug=slug).exists():
            continue
        defaults = SECTION_DEFAULTS
        layout = []
        for sec in spec['layout']:
            s = dict(sec)
            for k, v in defaults.get(s['type'], {}).items():
                s.setdefault(k, v)
            layout.append(s)
        ShopTemplate.objects.create(
            name=f"{cat_name} {suffix.upper()} — {label}",
            slug=slug,
            category=cat,
            default_colors=palettes(hue)[suffix],
            default_layout=layout,
            available_sections=['hero', 'product_grid', 'category_strip', 'banner', 'map', 'reviews', 'cta', 'richtext', 'features', 'info_strip'],
            tags=['v9', label.lower()],
            required_plan='pro' if spec['premium'] else 'basic',
            is_active=True,
            is_premium=spec['premium'],
            is_custom=False,
            sort_order=50 + (ord(suffix) - ord('a')),
        )
        created += 1

print(f"Yaratildi: {created} ta yangi shablon. Jami: {ShopTemplate.objects.count()}")
print(f"Kategoriyalar: {ShopTemplate.objects.values('category').distinct().count()} | Har birida ~{ShopTemplate.objects.count() // max(1, ShopTemplate.objects.values('category').distinct().count())} ta")
