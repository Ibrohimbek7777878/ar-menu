"""
⚡ 3 tilli maydonlar bilan ishlash. Bo'sh tarjima → fallback.
Ishlatish:
    t(dish, 'name', 'ru')  → dish.name_ru yoki dish.name_uz
    tdict(dish, 'name')    → {'uz': ..., 'ru': ..., 'en': ...}
"""
LANGS = ('uz', 'ru', 'en')
DEFAULT_LANG = 'uz'
FALLBACK_CHAIN = ('uz', 'ru', 'en')       # ⚡ zanjir tartibi


def normalize_lang(lang) -> str:
    """'ru-RU', 'RU', None → 'ru' / 'uz'"""
    if not lang:
        return DEFAULT_LANG
    code = str(lang).strip().lower().replace('_', '-').split('-')[0]
    if code in ('oz', 'uz'):
        return 'uz'
    return code if code in LANGS else DEFAULT_LANG


def t(obj, field: str, lang: str = DEFAULT_LANG) -> str:
    """
    obj.<field>_<lang> ni qaytaradi. Bo'sh bo'lsa fallback zanjiri bo'yicha izlaydi.
    Hech narsa topilmasa — bo'sh satr (None EMAS).
    """
    lang = normalize_lang(lang)
    val = getattr(obj, f'{field}_{lang}', None)
    if val:
        return val
    for fb in FALLBACK_CHAIN:
        if fb == lang:
            continue
        val = getattr(obj, f'{field}_{fb}', None)
        if val:
            return val
    return ''


def tdict(obj, field: str) -> dict:
    """Barcha tillar — admin panel uchun"""
    return {lg: (getattr(obj, f'{field}_{lg}', '') or '') for lg in LANGS}


def pick_lang(request, restaurant=None) -> str:
    """
    ⚡ Til aniqlash — 4 bosqich (V-070 da to'ldiriladi):
      1. ?lang=  query
      2. cookie  armenu_lang
      3. Accept-Language header
      4. restoran default_lang
    """
    q = request.GET.get('lang') if hasattr(request, 'GET') else None
    if q:
        code = normalize_lang(q)
        if restaurant is None or code in (restaurant.langs_enabled or LANGS):
            return code

    ck = request.COOKIES.get('armenu_lang') if hasattr(request, 'COOKIES') else None
    if ck:
        return normalize_lang(ck)

    hdr = request.headers.get('Accept-Language', '') if hasattr(request, 'headers') else ''
    for part in hdr.split(','):
        code = normalize_lang(part.split(';')[0])
        if code in LANGS:
            if restaurant is None or code in (restaurant.langs_enabled or LANGS):
                return code

    return normalize_lang(getattr(restaurant, 'default_lang', DEFAULT_LANG))


def missing_translations(obj, fields, langs=LANGS) -> dict:
    """Admin uchun: qaysi tarjima yo'q — {'name': ['ru'], 'desc': ['ru','en']}"""
    out = {}
    for f in fields:
        gaps = [lg for lg in langs if not getattr(obj, f'{f}_{lg}', '')]
        if gaps:
            out[f] = gaps
    return out
