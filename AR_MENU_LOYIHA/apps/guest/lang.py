"""
Til aniqlash tartibi (M-01 §2.6):
  1. URL  ?lang=en
  2. Cookie armenu_lang
  3. Accept-Language header
  4. Restaurant.default_lang
"""
SUPPORTED = ('uz', 'ru', 'en')
LANG_COOKIE = 'armenu_lang'
LANG_COOKIE_MAX_AGE = 365 * 24 * 3600


def _norm(code: str) -> str | None:
    if not code:
        return None
    c = code.strip().lower().replace('_', '-').split('-')[0]
    if c in SUPPORTED:
        return c
    # keng tarqalgan taxalluslar
    return {'uzb': 'uz', 'rus': 'ru', 'eng': 'en'}.get(c)


def _from_header(header: str) -> str | None:
    """'ru-RU,ru;q=0.9,en;q=0.8' → 'ru' (q bo'yicha tartiblangan)"""
    if not header:
        return None
    parts = []
    for chunk in header.split(','):
        bits = chunk.split(';q=')
        code = bits[0]
        try:
            q = float(bits[1]) if len(bits) > 1 else 1.0
        except ValueError:
            q = 1.0
        parts.append((q, code))
    for _, code in sorted(parts, key=lambda p: -p[0]):
        lang = _norm(code)
        if lang:
            return lang
    return None


def detect_lang(request, restaurant=None) -> str:
    return (
        _norm(request.GET.get('lang'))
        or _norm(request.COOKIES.get(LANG_COOKIE))
        or _from_header(request.headers.get('Accept-Language', ''))
        or _norm(getattr(restaurant, 'default_lang', None))
        or 'uz'
    )


def set_lang_cookie(response, lang: str):
    response.set_cookie(LANG_COOKIE, lang, max_age=LANG_COOKIE_MAX_AGE,
                        samesite='Lax', path='/')
    return response
