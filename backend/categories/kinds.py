"""Taom bo'limining turi: mehmon taom oynasidagi "Qo'shimcha" tavsiyalari shunga asoslanadi.

Asosiy taom -> salatlar, salat -> shirinliklar, shirinlik -> ichimliklar, ichimlik -> shirinliklar (frontend/src/utils/recommendations.ts).
Egasi turni admin paneldan tanlaydi; bo'sh (avtomatik) bo'lsa tur bo'lim NOMIDAN aniqlanadi (o'zbek, rus, ingliz so'zlari), topilmasa 'other'.
"""
import re

KIND_CHOICES = [
    ('', 'Avtomatik (nomidan aniqlanadi)'),
    ('main', 'Asosiy taom'),
    ('salad', 'Salat va gazak'),
    ('dessert', 'Shirinlik'),
    ('drink', 'Ichimlik'),
    ('other', 'Boshqa'),
]
KINDS = tuple(value for value, _ in KIND_CHOICES if value)

# Tekshirish tartibi muhim: "Salat & Gazak" salatga, "Shirinliklar" shirinlikka tushsin. Bo'g'in boshi (prefix) bo'yicha mos keladi.
_PREFIXES = (
    ('dessert', ('shirin', 'desert', 'dessert', 'десерт', 'сладк', 'sweet', 'tort', 'pirojn', 'пирожн', 'muzqaymoq',
                 'морожен', 'kek', 'cake')),
    ('drink', ('ichimlik', 'drink', 'напит', 'choy', 'чай', 'qahva', 'kofe', 'coffee', 'кофе', 'sharbat', 'juice', 'kompot',
               'компот', 'limonad', 'лимонад', 'cola', 'кола', 'smuzi', 'smoothie', 'морс', 'kokteyl', 'коктейл')),
    ('salad', ('salat', 'salad', 'салат', 'gazak', 'закуск', 'zakusk', 'snack', 'mezze')),
    ('main', ('asosiy', 'birinchi', 'ikkinchi', 'milliy', 'taom', 'shorva', 'main', 'grill', 'основн', 'перв', 'втор',
              'горяч', 'блюд', 'мясн', 'kabob', 'shashlik')),
)
# Qisqa so'zlar faqat to'liq mos kelganda (prefix bo'lsa "sokin", "tea" -> "team" kabi xatolar chiqadi)
_EXACT = (
    ('drink', ('sok', 'сок', 'suv', 'вода', 'water', 'tea', 'mors')),
)

_APOSTROPHES = re.compile(r"['`ʼʻ‘’]")
_NON_LETTERS = re.compile(r'[^\w]+', re.UNICODE)


def guess_kind(*names):
    """Bo'lim nomlaridan (nom, name_uz, name_ru, name_en) turini aniqlaydi: main | salad | dessert | drink | other."""
    text = _APOSTROPHES.sub('', ' '.join(n for n in names if n).lower())
    tokens = [t for t in _NON_LETTERS.split(text) if t]
    for kind, prefixes in _PREFIXES:
        if any(tok.startswith(p) for tok in tokens for p in prefixes):
            return kind
        for exact_kind, words in _EXACT:
            if exact_kind == kind and any(tok in words for tok in tokens):
                return kind
    return 'other'
