"""Brend ranglari: SOF funksiyalar (Django'ga, bazaga, so'rovga bog'liq emas). TZ_MULTITENANT_BRON_BREND_VIDEO_TUR, Bosqich 2.

Maqsad: restoran egasi bitta rang (`#RRGGBB`) tanlaydi — mehmon sayti ham, admin panel ham shu rangdan to'liq token to'plamini oladi
va matn HAR DOIM o'qiladigan bo'ladi (WCAG AA, >= 4.5:1). Rang tanlash xatosi (sariq, oq, juda och rang) saytni o'qib bo'lmaydigan
qilib qo'ymaydi: server rangni AVTOMATIK to'qlashtiradi va buni ochiq aytadi (`adjusted` / `adjusted_from`).

Qoidalar:
- Kun: oq matn asosiy rang ustida (tugma) >= 4.5; asosiy rang matn sifatida krem/oq fonda >= 4.5. Urg'u (`accent`) ham xuddi shunday.
- Tun: tugma foni oq matn bilan >= 4.5 va to'q sirtdan ajraladi; brend MATNI (`text_on_dark`) to'q fonlarda >= 4.5 (alohida, yengilroq hosila).
- To'qlashtirish rang tusini (hue) va to'yinganligini saqlab, faqat yorqinlikni o'zgartiradi: eng kichik zarur o'zgarish (ikkilik qidiruv).
- Chiqarilgan har qiymat FAQAT `#RRGGBB` yoki "r g b" sonlari: CSS'ga joylash XSS'ga yo'l qo'ymaydi (kirishdagi har qanday matn
  `normalize_hex` dan o'tmasa e'tiborga olinmaydi).

Qiymatlar klassik palitra (frontend/src/styles/palette.css) bilan bir xil mantiqda: `hover` = ×0.78, `deep` = ×0.64, tuslar oq bilan aralashma.
"""
import colorsys
import functools
import re

# Faqat `#RGB` yoki `#RRGGBB` (ASCII). '#' majburiy, `rgb()`/nom/alfa yo'q.
_HEX_RE = re.compile(r'#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})')

WHITE = '#FFFFFF'
BLACK = '#000000'
CREAM = '#F7F3EA'               # kun fon (klassik --bg-primary)
DARK_BG = '#0F1511'             # tun fon
DARK_SURFACE = '#17201A'        # tun karta
DARK_SUBTLE = '#1F2A22'         # tun ichki sirt
DARK_HOVER = '#26342B'          # tun hover sirt

MIN_TEXT_CONTRAST = 4.5         # WCAG AA (oddiy matn)
_SEARCH_TARGET = 4.58           # qidiruv maqsadi: 8 bitga yaxlitlashda 4.5 dan tushib ketmasin
_DARK_BUTTON_MIN = 2.5          # tun: tugma foni to'q sirtdan ajralishi (klassik #3E6B4A = 2.7)
_DARK_TEXT_MIN = 6.5            # tun: brend matni (kichik shrift) uchun qulay zaxira bilan; talab >= 4.5, klassik #8FBF9A = 8.0

DEFAULT_PRIMARY = '#2F4836'     # klassik palitra asosiy rangi
DEFAULT_ACCENT = '#A9501A'      # klassik urg'u (terrakota)

# Tayyor palitralarning HAQIQIY asosiy/urg'u ranglari (frontend/src/styles/palette.css va index.css): admin "maxsus"ga o'tganda shundan boshlaydi
PALETTE_COLORS = {
    'classic': {'primary': '#2F4836', 'accent': '#A9501A'},
    'orange': {'primary': '#EA580C', 'accent': '#E11D48'},
}


# Mehmon sahifasi neytral tokenlarini (fon, matn, chegara, holat ranglari) frontend/src/styles beradi (BR3); bu modul FAQAT brend tokenlarini chiqaradi.
CSS_SCOPES = ('guest', 'admin', 'all')


# ── Kirish va asosiy hisoblar ─────────────────────────────────────────────────────────────────────────────

def normalize_hex(value):
    """`#abc` -> `#AABBCC`, `#2f4836` -> `#2F4836`. Qat'iy: faqat matn, '#' majburiy, 3 yoki 6 o'n oltilik raqam. Aks holda None."""
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not _HEX_RE.fullmatch(text):
        return None
    digits = text[1:].upper()
    if len(digits) == 3:
        digits = ''.join(ch * 2 for ch in digits)
    return '#' + digits


def hex_to_rgb(value):
    """(r, g, b) 0..255. Yaroqsiz qiymat — ValueError."""
    color = normalize_hex(value)
    if color is None:
        raise ValueError(f'Yaroqsiz rang: {value!r}')
    return int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)


def rgb_to_hex(r, g, b):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(c)))) for c in (r, g, b))


def _linear(channel):
    c = channel / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(value):
    r, g, b = hex_to_rgb(value)
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def contrast_ratio(first, second):
    """WCAG kontrast nisbati (1..21)."""
    la, lb = relative_luminance(first), relative_luminance(second)
    hi, lo = (la, lb) if la >= lb else (lb, la)
    return (hi + 0.05) / (lo + 0.05)


def mix(base, other, amount):
    """`base` ga `other` ni `amount` (0..1) ulushda aralashtiradi."""
    amount = max(0.0, min(1.0, amount))
    a, b = hex_to_rgb(base), hex_to_rgb(other)
    return rgb_to_hex(*(x + (y - x) * amount for x, y in zip(a, b)))


def scale(value, factor):
    """Barcha kanallarni `factor` ga ko'paytiradi (qoraytirish: factor < 1)."""
    r, g, b = hex_to_rgb(value)
    return rgb_to_hex(r * factor, g * factor, b * factor)


def rgb_triplet(value):
    """`"47 72 54"` — `rgb(var(--brand-primary-rgb) / 0.3)` uchun."""
    return '%d %d %d' % hex_to_rgb(value)


# ── Yorqinlikni moslash (rang tusi va to'yinganligi saqlanadi) ───────────────────────────────────────────

def _with_lightness(value, lightness):
    h, _l, s = colorsys.rgb_to_hls(*(c / 255.0 for c in hex_to_rgb(value)))
    r, g, b = colorsys.hls_to_rgb(h, max(0.0, min(1.0, lightness)), s)
    return rgb_to_hex(r * 255, g * 255, b * 255)


def _lightness(value):
    return colorsys.rgb_to_hls(*(c / 255.0 for c in hex_to_rgb(value)))[1]


def _move_until(value, accepts, lighter):
    """`accepts(rang)` rost bo'lguncha `value` ni yorqinroq (lighter) yoki to'qroq qiladi. Boshlang'ich rang qabul qilinsa — o'zi.
    Eng kichik o'zgarishni ikkilik qidiruv topadi; 8 bitga yaxlitlash chegarada xato bermasligi uchun oxirida tekshiriladi."""
    if accepts(value):
        return value
    end = 1.0 if lighter else 0.0
    if not accepts(_with_lightness(value, end)):
        return _with_lightness(value, end)             # bunday holat bo'lmasligi kerak (oq/qora hamma narsadan ajraladi)
    bad, good = _lightness(value), end
    for _ in range(40):
        mid = (bad + good) / 2.0
        if accepts(_with_lightness(value, mid)):
            good = mid
        else:
            bad = mid
    candidate = _with_lightness(value, good)
    step = 0.002 if lighter else -0.002
    guard = 0
    while not accepts(candidate) and guard < 200:      # yaxlitlash natijasida chegaradan sal pastga tushgan bo'lsa
        good = max(0.0, min(1.0, good + step))
        candidate = _with_lightness(value, good)
        guard += 1
    return candidate


def ensure_contrast(color, backgrounds, minimum=MIN_TEXT_CONTRAST, lighter=False):
    """`color` har bir fon bilan >= `minimum` kontrastga ega bo'lguncha kerak bo'lsa to'qlashtiradi (yoki yorqinlashtiradi).
    -> (natija, o'zgartirildimi)."""
    color = normalize_hex(color)
    if color is None:
        raise ValueError('Yaroqsiz rang')
    if all(contrast_ratio(color, bg) >= minimum for bg in backgrounds):
        return color, False
    target = max(minimum, _SEARCH_TARGET)
    result = _move_until(color, lambda c: all(contrast_ratio(c, bg) >= target for bg in backgrounds), lighter)
    return result, result != color


# ── Token to'plami ────────────────────────────────────────────────────────────────────────────────────────

def _light_tints(color):
    return {'light': mix(color, WHITE, 0.91), 'subtle': mix(color, WHITE, 0.84),
            'tint_2': mix(color, WHITE, 0.74), 'tint_3': mix(color, WHITE, 0.58)}


def _fit_light(color):
    """Asosiy/urg'u rang kunda: oq va krem fonda matn sifatida o'qiladigan (>= 4.5) eng yaqin rang -> (rang, o'zgardimi).
    Bu ayni vaqtda oq matn bu rang ustida (tugma) >= 4.5 degani. Qoida ataylab shu (egasi talabi): tayyor ranglar (#0F766E, #C2410C ...)
    ogohlantirishsiz o'tadi. Eslatma: brend matni o'zining juda och tusida (`-subtle`) chegara ranglarda (oq bilan 4.5-5.9) 4.0-4.4 bo'lishi mumkin."""
    def accepts(c, minimum):
        return all(contrast_ratio(c, bg) >= minimum for bg in (WHITE, CREAM))

    if accepts(color, MIN_TEXT_CONTRAST):
        return color, False
    result = _move_until(color, lambda c: accepts(c, _SEARCH_TARGET), lighter=False)
    return result, result != color


def _dark_button(color):
    """Tunda tugma foni: oq matn bilan >= 4.5 saqlanadi, to'q sirtdan >= 2.5 ajraladi (juda to'q rang yorqinlashtiriladi)."""
    def accepts(c):
        return contrast_ratio(c, DARK_SURFACE) >= _DARK_BUTTON_MIN

    result = _move_until(color, accepts, lighter=True)
    if contrast_ratio(WHITE, result) < MIN_TEXT_CONTRAST:      # ikkala talab sig'masa, oq matn o'qilishi muhimroq
        result, _ = ensure_contrast(result, (WHITE,))
    return result


def _dark_text(color, tint_base):
    """Tunda brend MATNI/ikonkasi: to'q fonlarda >= 4.5 (kerak bo'lsa yorqinlashtiriladi)."""
    surfaces = (DARK_BG, DARK_SURFACE, DARK_SUBTLE, DARK_HOVER,
                mix(DARK_SURFACE, tint_base, 0.14), mix(DARK_SURFACE, tint_base, 0.30))
    return ensure_contrast(color, surfaces, minimum=_DARK_TEXT_MIN, lighter=True)[0]


def derive_brand(primary, accent=None):
    """
    Asosiy (va ixtiyoriy urg'u) rangdan HAMMA hosilalar. `primary`/`accent` yaroqsiz yoki bo'sh bo'lsa (bazadagi buzuq qiymat ham):
    asosiy — klassik yashil, urg'u — asosiy rangdan hosila (bir xil rang, kontrast tekshirilgan).

    Qaytadi (o'zgartirmang — keshlangan):
      primary, primary_from, primary_adjusted     | accent, accent_from, accent_adjusted, accent_auto
      text_on_light  — brend matni kun fonida (krem/oq/och tus) >= 4.5
      text_on_dark   — brend matni tun fonida >= 4.5
      light_guest / light_admin / dark_guest / dark_admin — CSS o'zgaruvchilari lug'atlari (nom -> qiymat); mehmon va admin tokenlari ALOHIDA
    """
    return _derive(normalize_hex(primary) or DEFAULT_PRIMARY, normalize_hex(accent))


@functools.lru_cache(maxsize=512)
def _derive(requested_primary, requested_accent):
    p, p_adjusted = _fit_light(requested_primary)
    accent_auto = requested_accent is None
    a, a_adjusted = _fit_light(requested_accent or p)

    tints = _light_tints(p)
    a_light, a_subtle = mix(a, WHITE, 0.90), mix(a, WHITE, 0.80)
    p_hover, p_deep = scale(p, 0.78), scale(p, 0.64)

    light_guest = {
        '--brand-primary': p, '--brand-primary-hover': p_hover, '--brand-primary-light': tints['light'],
        '--brand-primary-subtle': tints['subtle'], '--brand-tint-2': tints['tint_2'], '--brand-tint-3': tints['tint_3'],
        '--brand-warm': a, '--brand-deep': p_deep, '--brand-primary-rgb': rgb_triplet(p),
        '--brand-accent': a, '--brand-accent-light': a_light, '--brand-accent-subtle': a_subtle,
        # Eski Django shablon (tma/base_tma.html) o'zgaruvchilari: ular ham brend rangiga ergashsin
        '--primary-green': p, '--primary-green-hover': p_hover, '--primary-green-light': tints['light'],
        '--accent-terracotta': a, '--accent-gold': a,
    }
    light_admin = {
        # Admin panel tokenlari (admins/shared/src/ui/tokens.css): tugma, urg'u, brend matni
        '--action': p, '--action-hover': p_hover, '--accent-amber': a, '--accent-amber-bg': a_light,
        '--accent-amber-border': a_subtle, '--brand': p, '--brand-hover': p_hover, '--brand-bg': tints['light'],
        '--brand-border': tints['tint_2'], '--focus-ring': p,
    }

    p_dark = _dark_button(p)
    text_dark = _dark_text(p, p_dark)
    a_text_dark = _dark_text(a, a)
    d_light, d_subtle = mix(DARK_SURFACE, p_dark, 0.14), mix(DARK_SURFACE, p_dark, 0.30)
    d_tint2, d_tint3 = mix(DARK_SURFACE, p_dark, 0.60), mix(DARK_SURFACE, p_dark, 0.90)
    d_hover = scale(p_dark, 0.85)
    d_deep = mix(text_dark, WHITE, 0.25)
    d_a_light, d_a_subtle = mix(DARK_SURFACE, a, 0.12), mix(DARK_SURFACE, a, 0.22)

    dark_guest = {
        '--brand-primary': p_dark, '--brand-primary-hover': d_hover, '--brand-primary-light': d_light,
        '--brand-primary-subtle': d_subtle, '--brand-tint-2': d_tint2, '--brand-tint-3': d_tint3,
        '--brand-warm': a_text_dark, '--brand-deep': d_deep, '--brand-primary-rgb': rgb_triplet(p_dark),
        '--brand-accent-light': d_a_light, '--brand-accent-subtle': d_a_subtle,
        '--dk-brand-text': text_dark, '--dk-accent-text': a_text_dark,
        '--primary-green': p_dark, '--primary-green-hover': d_hover, '--primary-green-light': d_light,
        '--accent-terracotta': a_text_dark, '--accent-gold': a_text_dark,
    }
    dark_admin = {
        '--action': p_dark, '--action-hover': d_hover, '--accent-amber': a_text_dark, '--accent-amber-bg': d_a_light,
        '--accent-amber-border': d_a_subtle, '--brand': text_dark, '--brand-hover': d_deep, '--brand-bg': d_light,
        '--brand-border': d_tint2, '--focus-ring': text_dark,
    }
    return {
        'primary': p, 'primary_from': requested_primary, 'primary_adjusted': p_adjusted,
        'accent': a, 'accent_from': requested_accent, 'accent_adjusted': a_adjusted, 'accent_auto': accent_auto,
        'text_on_light': p, 'text_on_dark': text_dark, 'accent_text_on_dark': a_text_dark,
        'light_guest': light_guest, 'light_admin': light_admin, 'dark_guest': dark_guest, 'dark_admin': dark_admin,
        # Qulaylik uchun: qaysi tokenlar qaysi sahifaga — build_brand_css(scope) tanlaydi
    }


# ── CSS ───────────────────────────────────────────────────────────────────────────────────────────────────

_SAFE_VALUE = re.compile(r'#[0-9A-F]{6}|\d{1,3} \d{1,3} \d{1,3}')


def _declarations(tokens):
    # Ikkinchi himoya qatlami: qiymat faqat #RRGGBB yoki "r g b" bo'lsa chiqadi (derive_brand boshqasini bermaydi)
    return ''.join(f'{name}:{value};' for name, value in tokens.items()
                   if re.fullmatch(r'--[a-z0-9-]+', name) and _SAFE_VALUE.fullmatch(value))


def build_brand_css(primary, accent=None, scope='all'):
    """
    `<style id="brand-vars">` ichidagi matn: kun va tun bloklari. Faqat `#RRGGBB` va sonlar (XSS imkonsiz).
    `scope`: 'guest' (mehmon sayti: --brand-*, --dk-brand-text ..., eski shablon o'zgaruvchilari), 'admin' (/ra/ va kirish sahifasi: --action,
    --accent-amber, --brand ...), 'all' (ikkalasi). Neytral tokenlar (fon, matn, chegara, holat) HECH QAYSI doirada chiqmaydi: ularni sahifaning
    o'z stillari beradi (mehmon: frontend/src/styles; admin: admins/shared/src/ui/tokens.css).
    """
    if scope not in CSS_SCOPES:
        scope = 'all'
    return _css(normalize_hex(primary) or DEFAULT_PRIMARY, normalize_hex(accent), scope)


@functools.lru_cache(maxsize=1024)
def _css(primary, accent, scope):
    derived = _derive(primary, accent)
    light, dark = {}, {}
    if scope in ('guest', 'all'):
        light.update(derived['light_guest'])
        dark.update(derived['dark_guest'])
    if scope in ('admin', 'all'):
        light.update(derived['light_admin'])
        dark.update(derived['dark_admin'])
    return (f"html[data-palette='custom']{{{_declarations(light)}}}\n"
            f"html[data-palette='custom'][data-theme='dark']{{{_declarations(dark)}}}")
