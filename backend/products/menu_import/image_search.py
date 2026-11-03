"""Taom nomi bo'yicha internetdan namuna rasm qidirish (TZ_OMMAVIY_MENYU_KIRITISH, 5-band).

Manbalar (ikkalasi ham kalitsiz, ochiq): Openverse (`api.openverse.org`) va Wikimedia Commons (`commons.wikimedia.org`).
Google/Bing rasm qidiruvi scrape QILINMAYDI (shartlarni buzadi, mualliflik huquqi).

Qoidalar:
  * faqat tijoriy ishlatish va o'zgartirishga ruxsat beruvchi litsenziyalar: CC0, Public Domain (PDM), CC BY, CC BY-SA.
    `nd`/`nc`, noma'lum va "non-free" belgilangan fayllar natijaga umuman kirmaydi;
  * kichik (qisqa tomoni < 400 px) rasmlar tushiriladi; rasm manzili https bo'lishi va yuklashga ruxsat etilgan hostda turishi shart
    (aks holda foydalanuvchi tanlay olmaydigan variantni ko'rardi) — `image_fetch.allowed_hosts()`;
  * tashqi javobga ishonilmaydi: maydon turlari, uzunlik, https, HTML tozalash (muallif nomi Commons'da HTML bo'lib keladi);
  * bir manba yiqilsa ikkinchisi natija beradi; ikkalasi yiqilsa `ImageSearchUnavailable` (503);
  * natija 1 soat keshlanadi (Django cache); restoranga soatiga 60 ta tashqi qidiruv (kesh urilgan so'rov hisoblanmaydi);
  * `pick` uchun har bir natijaning to'liq yozuvi (manzil, litsenziya, muallif) serverda 2 soat saqlanadi: brauzer yuborgan
    "litsenziya"/"manzil" ga ishonilmaydi (CC BY-NC rasmni "cc0" deb yuborib bo'lmaydi).
"""
import hashlib
import html
import json
import logging
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, wait
from urllib.parse import unquote, urlsplit

import requests
from django.core.cache import cache

from products.menu_import.image_fetch import MAX_BYTES, USER_AGENT, host_allowed

logger = logging.getLogger(__name__)

OPENVERSE_URL = 'https://api.openverse.org/v1/images/'
COMMONS_URL = 'https://commons.wikimedia.org/w/api.php'

SOURCE_TIMEOUT = 8                 # soniya, har bir manba uchun
MAX_RESULTS = 12
FETCH_LIMIT = 20                   # har manbadan so'raladigan natija (filtrdan keyin 12 ta qolishi uchun zaxira)
MIN_SIDE = 400                     # px, qisqa tomon
WIKIMEDIA_FULL_WIDTH = 1280        # Commons'da ruxsat etilgan "thumbnail step"; menyu uchun yetarli, fayl esa ~300 KB
QUERY_MAX = 100
SEARCH_CACHE_TTL = 3600
PARTIAL_CACHE_TTL = 120            # bir manba yiqilgan bo'lsa to'liqsiz natija uzoq saqlanmaydi
PICK_REGISTRY_TTL = 7200           # tanlash yozuvi qidiruv keshidan uzoqroq yashaydi
SEARCH_RATE_LIMIT = 60             # restoranga soatiga tashqi qidiruv
PICK_RATE_LIMIT = 150              # restoranga soatiga tanlangan rasm yuklash
MAX_JSON_BYTES = 1_500_000
TITLE_MAX = 150
CREATOR_MAX = 120
CREDIT_CREATOR_MAX = 80             # mehmon oynasidagi qisqa yozuvdagi muallif nomi chegarasi
URL_MAX = 500                      # source_url / license_url (Product.image_source_url max_length)
IMAGE_URL_MAX = 1000               # full / thumb

ALLOWED_LICENSES = ('cc0', 'pdm', 'by', 'by-sa')
LICENSE_LABELS = {'cc0': 'CC0', 'pdm': 'PDM', 'by': 'CC BY', 'by-sa': 'CC BY-SA'}
_FALLBACK_LICENSE_URLS = {
    'cc0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'pdm': 'https://creativecommons.org/publicdomain/mark/1.0/',
    'by': 'https://creativecommons.org/licenses/by/4.0/',
    'by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
}
_BITMAP_MIMES = ('image/jpeg', 'image/png', 'image/webp')
_OPENVERSE_TYPES = ('jpg', 'jpeg', 'png', 'webp')


class ImageSearchError(Exception):
    status = 400
    code = 'image_search_error'

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class ImageQueryError(ImageSearchError):
    status = 400
    code = 'bad_query'


class ImageSearchRateLimited(ImageSearchError):
    status = 429
    code = 'rate_limited'

    def __init__(self, message, retry_after=60):
        super().__init__(message)
        self.retry_after = retry_after


class ImageSearchUnavailable(ImageSearchError):
    status = 503
    code = 'search_unavailable'


class ImagePickNotFound(ImageSearchError):
    status = 404
    code = 'result_not_found'


class _SourceError(Exception):
    """Bitta manba javob bermadi (tarmoq, HTTP xato, buzuq JSON)."""


# ─── O'zbekcha taom nomi → inglizcha qidiruv so'zi ───────────────────────────────────────────────
# Kalit: taom nomi (apostrof va registr ahamiyatsiz; bir nechta so'zli kalit — ketma-ket so'zlar). Qiymat: qidiruv so'zi,
# ixtiyoriy zaxira so'z "|" dan keyin ("plov pilaf|plov": birinchisidan natija chiqmasa ikkinchisi bilan qayta qidiriladi).
#
# MUHIM (haqiqiy sinovdan): yalang'och taom nomi inglizcha qidiruvda chalkashadi — "manti" -> mantis (ninachi) va Manti shahri (Yuta),
# "lagman" -> shved "lagman" (huquqshunos unvoni) va siyosatchi Lagman. Shuning uchun noaniq nomlarga taom turini bildiruvchi so'z
# qo'shilgan ("manti dumplings", "lagman noodles", "samsa pastry"). Yangi nom qo'shsangiz, uni avval qidiruvda sinab ko'ring.
_DISH_TERMS = {
    # Osh va guruchli taomlar
    "palov": "plov pilaf|plov", "osh": "plov pilaf|plov", "plov": "plov pilaf|plov", "devzira": "plov pilaf|plov",
    "shirguruch": "rice pudding", "shir guruch": "rice pudding", "sutli osh": "rice pudding", "dolma": "dolma",
    "halim": "haleem stew", "xalim": "haleem stew", "bo'tqa": "porridge", "botqa": "porridge", "grechka": "buckwheat porridge",
    # Sho'rva va suyuq taomlar
    "sho'rva": "shurpa soup", "shorva": "shurpa soup", "shurpa": "shurpa soup", "mastava": "mastava soup", "mastoba": "mastava soup",
    "lag'mon": "lagman noodles", "lagman": "lagman noodles", "norin": "norin noodles", "naryn": "norin noodles",
    "borsh": "borscht", "solyanka": "solyanka soup", "chuchvara": "chuchvara dumplings",
    "manti": "manti dumplings", "xonim": "khanum roll", "hanum": "khanum roll", "xasip": "hasip sausage", "hasip": "hasip sausage",
    "pelmeni": "pelmeni dumplings", "vareniki": "vareniki dumplings", "tuxum barak": "dumplings",
    # Go'shtli va kabob
    "qozon kabob": "kazan kebab", "qozon kabab": "kazan kebab", "qozon kebab": "kazan kebab", "kabob": "kebab", "kabab": "kebab",
    "kebab": "kebab", "kebob": "kebab", "shashlik": "shashlik kebab", "shaslik": "shashlik kebab", "tandir kabob": "tandoor kebab",
    "tandir kabab": "tandoor kebab", "tandir go'sht": "tandoor lamb", "lyulya": "lula kebab", "lyulya kabob": "lula kebab",
    "lula": "lula kebab", "jiz": "fried meat", "jiz biz": "fried meat", "jizbiz": "fried meat", "qovurma": "fried meat",
    "dimlama": "dimlama stew", "qurutob": "qurutob", "qazi": "horse sausage", "kotlet": "cutlet", "bifshteks": "beefsteak",
    "steyk": "steak", "go'sht": "meat dish", "tovuq": "chicken dish", "baliq": "fish dish", "kartoshka fri": "french fries",
    "fri": "french fries", "kartoshka": "potato dish", "makaron": "pasta", "pasta": "pasta",
    # Non va xamirli taomlar
    "non": "uzbek bread|flatbread", "obi non": "uzbek bread tandoor|uzbek bread", "patir": "patir bread|uzbek bread",
    "lepyoshka": "uzbek bread|flatbread", "lepeshka": "uzbek bread|flatbread", "somsa": "samsa pastry", "samsa": "samsa pastry",
    "ko'k somsa": "green samsa", "pishiriq": "fried dough", "chebureki": "chebureki", "cheburek": "chebureki", "lavash": "lavash bread",
    "shaurma": "shawarma", "shawarma": "shawarma", "burger": "hamburger", "gamburger": "hamburger", "cheeseburger": "cheeseburger",
    "chizburger": "cheeseburger", "hot dog": "hot dog", "xot dog": "hot dog", "pitsa": "pizza", "pizza": "pizza",
    # Salat va gazaklar
    "achchiq chuchuk": "tomato onion salad", "achichuk": "tomato onion salad", "shakarob": "tomato onion salad", "salat": "salad",
    "olivye": "olivier salad", "olivie": "olivier salad", "sezar": "caesar salad", "grek salat": "greek salad",
    "vinegret": "vinegret beet salad", "assorti": "meat platter", "ikra": "caviar",
    # Ichimliklar
    "choy": "tea", "ko'k choy": "green tea", "qora choy": "black tea", "limonli choy": "lemon tea", "kompot": "compote",
    "ayron": "ayran drink", "ayran": "ayran drink", "sharbat": "fruit juice", "sok": "fruit juice", "limonad": "lemonade",
    "qahva": "coffee", "kofe": "coffee", "coffee": "coffee", "kapuchino": "cappuccino", "latte": "latte coffee",
    "americano": "americano coffee", "qatiq": "yogurt", "sut": "milk glass", "kefir": "kefir", "kola": "cola", "koka kola": "cola",
    "suv": "mineral water", "mineral suv": "mineral water", "morse": "berry drink", "smuzi": "smoothie", "kokteyl": "cocktail",
    # Shirinliklar
    "medovik": "medovik honey cake", "napoleon": "napoleon cake", "chak chak": "chak-chak", "halva": "halva", "xalva": "halva",
    "baklava": "baklava", "paxlava": "baklava", "tort": "cake", "pirog": "pie", "pirojniy": "pastry", "pirozhniy": "pastry",
    "muzqaymoq": "ice cream", "desert": "dessert", "chizkeyk": "cheesecake", "tiramisu": "tiramisu", "sumalak": "sumalak",
    "parvarda": "parvarda sweets", "novvot": "nabat rock candy", "nabot": "nabat rock candy",
    # Ruscha nomlar (menyular ko'pincha ruscha yoziladi)
    "плов": "plov pilaf|plov", "лагман": "lagman noodles", "манты": "manti dumplings", "шашлык": "shashlik kebab",
    "самса": "samsa pastry", "чучвара": "chuchvara dumplings", "нарын": "norin noodles", "мастава": "mastava soup",
    "шурпа": "shurpa soup", "суп": "soup", "димлама": "dimlama stew", "казан кебаб": "kazan kebab", "кебаб": "kebab",
    "люля кебаб": "lula kebab", "люля": "lula kebab", "шакароб": "tomato onion salad", "ачичук": "tomato onion salad",
    "салат": "salad", "лепешка": "uzbek bread|flatbread", "лепёшка": "uzbek bread|flatbread", "хлеб": "bread", "чай": "tea",
    "компот": "compote", "айран": "ayran drink", "сок": "fruit juice", "лимонад": "lemonade", "кофе": "coffee",
    "медовик": "medovik honey cake", "наполеон": "napoleon cake", "чак чак": "chak-chak", "халва": "halva",
    "пахлава": "baklava", "торт": "cake", "мороженое": "ice cream", "пельмени": "pelmeni dumplings", "борщ": "borscht",
    "пицца": "pizza", "бургер": "hamburger", "шаурма": "shawarma", "котлета": "cutlet", "стейк": "steak",
    "картофель фри": "french fries", "хасип": "hasip sausage", "хонум": "khanum roll",
}

# Uzbek qo'shimchalari: "palov-i", "somsalar", "shashlikni"
_SUFFIXES = frozenset({'', 'i', 'si', 'ni', 'lar', 'lari', 'ning', 'dan', 'ga', 'da', 'imiz', 'ligi'})
_APOSTROPHES = "'ʻʼʹ’‘`´′"
_TOKEN_RE = re.compile(r'[^\W_]+', re.UNICODE)


def _tokens(text):
    cleaned = ''.join(ch for ch in unicodedata.normalize('NFKC', str(text or '')) if ch not in _APOSTROPHES)
    return [t for t in _TOKEN_RE.findall(cleaned.casefold().replace('ё', 'е'))]


def _build_index():
    index = {}
    for key, value in _DISH_TERMS.items():
        tokens = tuple(_tokens(key))
        if tokens:
            phrase, _, fallback = value.partition('|')
            index[tokens] = (phrase, fallback)
    # Uzun kalit avval: "qozon kabob" -> "kabob" dan ustun
    return sorted(index.items(), key=lambda item: (-len(item[0]), -sum(len(t) for t in item[0])))


_INDEX = _build_index()


def _token_matches(token, key):
    if token == key:
        return True
    return token.startswith(key) and token[len(key):] in _SUFFIXES


def _lookup_dish(name):
    tokens = _tokens(name)
    if not tokens:
        return None
    for key, entry in _INDEX:
        size = len(key)
        for start in range(len(tokens) - size + 1):
            window = tokens[start:start + size]
            if all(window[i] == key[i] for i in range(size - 1)) and _token_matches(window[-1], key[-1]):
                return entry
    return None


def translate_dish_name(name):
    """O'zbekcha (yoki ruscha) taom nomi → inglizcha qidiruv so'zi; lug'atda bo'lmasa None."""
    entry = _lookup_dish(name)
    return entry[0] if entry else None


def clean_query(raw):
    """Foydalanuvchi so'zi: boshqaruv belgilarsiz, bo'shliqlari yig'ilgan, 2..100 belgi."""
    text = ''.join(' ' if unicodedata.category(ch) in ('Cc', 'Cf', 'Zl', 'Zp') else ch for ch in str(raw or ''))
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) < 2:
        raise ImageQueryError("Taom nomini kiriting (kamida 2 ta harf).")
    if len(text) > QUERY_MAX:
        raise ImageQueryError(f"Qidiruv matni {QUERY_MAX} belgidan oshmasligi kerak.")
    return text


def query_candidates(name):
    """Navbatma-navbat sinab ko'riladigan qidiruv so'zlari (birinchisidan natija chiqmasa keyingisi)."""
    entry = _lookup_dish(name)
    if entry:
        phrase, fallback = entry
        return [phrase, fallback] if fallback else [phrase]
    plain = ''.join(ch for ch in name if ch not in _APOSTROPHES).strip()
    return [f'{plain} food dish', plain]


# ─── Tashqi javobni tozalash ─────────────────────────────────────────────────────────────────────
_SCRIPT_RE = re.compile(r'<(script|style)\b[^>]*>.*?</\1\s*>', re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r'<[^>]*>')


def clean_text(value, limit):
    """Tashqi matn → oddiy matn: HTML teglar va entitilar tozalanadi, boshqaruv belgilar va `<>` olib tashlanadi."""
    if not isinstance(value, str):
        return ''
    text = _SCRIPT_RE.sub(' ', value)
    text = _TAG_RE.sub(' ', text)
    text = html.unescape(text)
    text = ''.join(' ' if unicodedata.category(ch) in ('Cc', 'Cf', 'Zl', 'Zp') else ch for ch in text)
    text = text.replace('<', ' ').replace('>', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'\s+([,.;:!?])', r'\1', text)          # «<i>Plov</i>, Tashkent» -> «Plov, Tashkent»
    return text[:limit].rstrip()


_UNKNOWN_CREATORS = frozenset({
    'unknown', 'unknown author', 'author unknown', 'anonymous', 'anon', 'anonym', 'unknown photographer',
    'photographer unknown', 'not known', 'n/a', 'none', 'null', '-', '?',
})


def clean_creator(value):
    """Muallif nomi: matn tozalanadi; "Unknown authorUnknown author" kabi ikki marta takrorlangan va "noma'lum" qiymatlar bo'sh bo'ladi."""
    text = clean_text(value, CREATOR_MAX)
    half = len(text) // 2
    if half >= 4 and len(text) % 2 == 0 and text[:half] == text[half:]:
        text = text[:half].strip()
    if text.casefold().rstrip('.') in _UNKNOWN_CREATORS:
        return ''
    return text


def clean_title(value):
    """Sarlavha: Commons fayl nomi shaklidagi «File:» old qo'shimchasi va kengaytma olib tashlanadi."""
    text = re.sub(r'^(File|Fayl|Datei|Файл):\s*', '', clean_text(value, TITLE_MAX + 10), flags=re.IGNORECASE)
    text = re.sub(r'\.(jpe?g|png|webp|tiff?)$', '', text, flags=re.IGNORECASE).replace('_', ' ')
    return text[:TITLE_MAX].rstrip()


def _https_url(value, limit=URL_MAX):
    """Tashqi manzil: faqat toza https, bo'shliqsiz, uzunligi cheklangan. Aks holda ''."""
    if not isinstance(value, str):
        return ''
    text = value.strip()
    if not text or len(text) > limit or any(ord(ch) < 33 or ord(ch) == 127 for ch in text):
        return ''
    try:
        parts = urlsplit(text)
        if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password:
            return ''
    except ValueError:
        return ''
    return text


def _to_int(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value == int(value):
        return int(value)
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _size_ok(width, height):
    """O'lcham noma'lum bo'lsa (Openverse'da ko'pincha) o'tkaziladi, ma'lum bo'lsa qisqa tomon >= 400."""
    if width is None or height is None:
        return True
    return min(width, height) >= MIN_SIDE


def _license_url(url_value, license_key, version=None):
    """Litsenziya matni havolasi: faqat creativecommons.org dan kelgani; aks holda (yo'q/begona) standart havola."""
    url = _https_url(url_value)
    if url and urlsplit(url).hostname in ('creativecommons.org', 'www.creativecommons.org'):
        return url
    fallback = _FALLBACK_LICENSE_URLS[license_key]
    if license_key in ('by', 'by-sa') and isinstance(version, str) and re.fullmatch(r'\d\.\d', version.strip()):
        return fallback.replace('/4.0/', f'/{version.strip()}/')
    return fallback


def parse_commons_license(short_name):
    """Commons `LicenseShortName` ("CC BY-SA 4.0", "Public domain", "CC0") → 'cc0'|'pdm'|'by'|'by-sa' yoki None."""
    text = clean_text(short_name, 80).casefold()
    if not text:
        return None
    words = text.replace('-', ' ').replace('_', ' ').split()
    if not words:
        return None
    if words[0] == 'cc0' or ' '.join(words).startswith('cc zero'):
        return 'cc0'
    if text.startswith('public domain') or words[0] == 'pd':
        return 'pdm'
    if words[0] != 'cc' or len(words) < 2 or words[1] != 'by':
        return None
    share_alike = False
    for word in words[2:]:
        if word == 'sa':
            share_alike = True
        elif word in ('nc', 'nd'):
            return None
        elif re.fullmatch(r'\d(\.\d)?', word) or re.fullmatch(r'[a-z]{2,3}', word):
            continue            # versiya yoki mamlakat varianti ("CC BY 3.0 de")
        else:
            return None
    return 'by-sa' if share_alike else 'by'


def build_credit(creator, license_key):
    """Mehmon oynasidagi qisqa yozuv: «Muallif · CC BY» (versiyasiz, ixcham). Muallif noma'lum bo'lsa — faqat litsenziya."""
    label = LICENSE_LABELS[license_key]
    creator = clean_creator(creator)
    if len(creator) > CREDIT_CREATOR_MAX:                  # Commons «Artist» ba'zan butun bir abzats: to'liq nom manba sahifasida
        creator = creator[:CREDIT_CREATOR_MAX].rstrip() + '…'
    return f'{creator} · {label}' if creator else label


# ─── Manbalarga so'rov ───────────────────────────────────────────────────────────────────────────
def _get_json(url, params):
    """Bitta GET so'rovi: timeout 8 s (umumiy muddat ham), hajm cheklangan, JSON obyekt qaytaradi."""
    deadline = time.monotonic() + SOURCE_TIMEOUT
    try:
        response = requests.get(
            url, params=params, timeout=(5, SOURCE_TIMEOUT), stream=True,
            headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'},
        )
    except requests.RequestException as exc:
        raise _SourceError(f'{type(exc).__name__}') from None
    try:
        if response.status_code != 200:
            raise _SourceError(f'HTTP {response.status_code}')
        body = bytearray()
        for chunk in response.iter_content(chunk_size=64 * 1024):
            body.extend(chunk)
            if len(body) > MAX_JSON_BYTES:
                raise _SourceError('javob juda katta')
            if time.monotonic() > deadline:
                raise _SourceError('sekin javob')
        try:
            payload = json.loads(bytes(body).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            raise _SourceError("JSON emas") from None
        if not isinstance(payload, dict):
            raise _SourceError("kutilmagan javob shakli")
        return payload
    except requests.RequestException as exc:
        raise _SourceError(f'{type(exc).__name__}') from None
    finally:
        response.close()


_COMMONS_ORIGINAL_RE = re.compile(r'^(?P<base>https://upload\.wikimedia\.org/wikipedia/commons)/(?P<a>[0-9a-f])/(?P<ab>[0-9a-f]{2})/(?P<name>[^/?#]+)(?P<query>[?#].*)?$')


def _shrink_wikimedia_original(url, width):
    """Openverse Commons rasmining ASL faylini beradi (o'nlab MB bo'lishi mumkin). Kengligi 1280 dan katta bo'lsa — 1280 px li nusxa."""
    match = _COMMONS_ORIGINAL_RE.match(url)
    if not match or not width or width <= WIKIMEDIA_FULL_WIDTH:
        return url
    name = match.group('name')
    return f"{match.group('base')}/thumb/{match.group('a')}/{match.group('ab')}/{name}/{WIKIMEDIA_FULL_WIDTH}px-{name}"


def _parse_openverse_item(item):
    if not isinstance(item, dict):
        return None
    license_key = str(item.get('license') or '').strip().lower()
    if license_key not in ALLOWED_LICENSES:
        return None
    raw_id = str(item.get('id') or '').strip()
    if not re.fullmatch(r'[A-Za-z0-9-]{8,64}', raw_id):
        return None
    full = _https_url(item.get('url'), IMAGE_URL_MAX)
    if not full or not host_allowed(urlsplit(full).hostname):
        return None
    width, height = _to_int(item.get('width')), _to_int(item.get('height'))
    full = _shrink_wikimedia_original(full, width)
    if not full or (_to_int(item.get('filesize')) or 0) > MAX_BYTES and '/thumb/' not in full:
        return None
    filetype = str(item.get('filetype') or '').strip().lower().lstrip('.')
    if filetype and filetype not in _OPENVERSE_TYPES:
        return None
    if not _size_ok(width, height):
        return None
    thumb = _https_url(item.get('thumbnail'), IMAGE_URL_MAX) or full
    source_url = _https_url(item.get('foreign_landing_url')) or f'https://openverse.org/image/{raw_id}'
    return {
        'id': f'openverse:{raw_id}',
        'thumb': thumb,
        'full': full,
        'title': clean_title(item.get('title')),
        'creator': clean_creator(item.get('creator')),
        'license': license_key,
        'license_url': _license_url(item.get('license_url'), license_key, item.get('license_version')),
        'source': 'openverse',
        'source_url': source_url,
    }


def _search_openverse(term):
    payload = _get_json(OPENVERSE_URL, {
        'q': term, 'page_size': FETCH_LIMIT, 'license': ','.join(ALLOWED_LICENSES), 'mature': 'false',
    })
    items = payload.get('results')
    if not isinstance(items, list):
        raise _SourceError("Openverse javobida 'results' yo'q")
    results = []
    for item in items:
        try:
            parsed = _parse_openverse_item(item)
        except Exception:      # tashqi ma'lumotdagi kutilmagan shakl bitta natijani tushiradi, qolganini emas
            logger.debug('openverse item skipped', exc_info=True)
            continue
        if parsed:
            results.append(parsed)
    return results


_THUMB_RE = re.compile(r'^(?P<head>.*/)(?P<width>\d+)px-(?P<tail>[^/]+)$')


def _commons_full_url(info, width, size):
    """Commons'da asl fayl o'nlab MB bo'lishi mumkin: katta rasm uchun 1280 px li nusxa (Commons ruxsat etgan qadam) olinadi."""
    original = _https_url(info.get('url'), IMAGE_URL_MAX)
    thumb = _https_url(info.get('thumburl'), IMAGE_URL_MAX)
    if width and width > WIKIMEDIA_FULL_WIDTH and thumb:
        match = _THUMB_RE.match(thumb)
        if match:
            return f"{match.group('head')}{WIKIMEDIA_FULL_WIDTH}px-{match.group('tail')}"
    if original and (size is None or size <= MAX_BYTES):
        return original
    return ''


def _parse_commons_page(page):
    if not isinstance(page, dict):
        return None
    infos = page.get('imageinfo')
    info = infos[0] if isinstance(infos, list) and infos and isinstance(infos[0], dict) else None
    if info is None:
        return None
    if str(info.get('mime') or '').lower() not in _BITMAP_MIMES:
        return None
    meta = info.get('extmetadata') if isinstance(info.get('extmetadata'), dict) else {}

    def meta_value(name, limit):
        entry = meta.get(name)
        return clean_text(entry.get('value'), limit) if isinstance(entry, dict) else ''

    if meta_value('NonFree', 10).lower() in ('true', '1', 'yes') or meta_value('Restrictions', 100):
        return None
    license_key = parse_commons_license(meta_value('LicenseShortName', 80))
    if license_key is None:
        return None
    width, height, size = _to_int(info.get('width')), _to_int(info.get('height')), _to_int(info.get('size'))
    if not _size_ok(width, height):
        return None
    page_id = _to_int(page.get('pageid'))
    if page_id is None:
        return None
    full = _commons_full_url(info, width, size)
    if not full or not host_allowed(urlsplit(full).hostname):
        return None
    thumb = _https_url(info.get('thumburl'), IMAGE_URL_MAX) or full
    file_title = clean_text(page.get('title'), 250)
    bare = re.sub(r'^(File|Fayl|Datei|Файл):', '', file_title, flags=re.IGNORECASE)
    bare = re.sub(r'\.[A-Za-z0-9]{2,5}$', '', bare).replace('_', ' ')
    source_url = _https_url(info.get('descriptionurl'))
    if not source_url or urlsplit(source_url).hostname != 'commons.wikimedia.org':
        source_url = f'https://commons.wikimedia.org/?curid={page_id}'
    return {
        'id': f'wikimedia:{page_id}',
        'thumb': thumb,
        'full': full,
        'title': clean_title(meta_value('ObjectName', TITLE_MAX)) or clean_text(bare, TITLE_MAX),
        'creator': clean_creator(meta_value('Artist', CREATOR_MAX * 2)),
        'license': license_key,
        'license_url': _license_url(meta_value('LicenseUrl', URL_MAX), license_key),
        'source': 'wikimedia',
        'source_url': source_url,
    }


# Commons qidiruvida chalkashadigan so'zlar (CirrusSearch «-so'z» sintaksisi). Haqiqiy sinov: «lagman noodles» 12 tadan 5 tasi
# Afg'onistonning Laghman viloyati xaritalari edi.
_COMMONS_EXCLUDE = {
    'lagman noodles': '-province -district -districts -valley -afghanistan',
}


def _search_wikimedia(term):
    exclude = _COMMONS_EXCLUDE.get(term, '')
    payload = _get_json(COMMONS_URL, {
        'action': 'query', 'format': 'json', 'formatversion': '2', 'origin': '*',
        'generator': 'search', 'gsrsearch': ' '.join(part for part in (term, exclude, 'filetype:bitmap') if part), 'gsrnamespace': '6', 'gsrlimit': FETCH_LIMIT,
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': '500',
        'iiextmetadatafilter': 'LicenseShortName|LicenseUrl|Artist|ObjectName|NonFree|Restrictions',
    })
    query = payload.get('query')
    pages = query.get('pages') if isinstance(query, dict) else None
    if pages is None:
        return []           # Commons hech narsa topmasa 'query' kaliti umuman bo'lmaydi
    if isinstance(pages, dict):
        pages = list(pages.values())
    if not isinstance(pages, list):
        raise _SourceError("Commons javobida 'pages' shakli noto'g'ri")
    pages = sorted((p for p in pages if isinstance(p, dict)), key=lambda p: _to_int(p.get('index')) or 0)
    results = []
    for page in pages:
        try:
            parsed = _parse_commons_page(page)
        except Exception:
            logger.debug('commons page skipped', exc_info=True)
            continue
        if parsed:
            results.append(parsed)
    return results


# ─── Birlashtirish va takrorlarni olib tashlash ──────────────────────────────────────────────────
_COMMONS_FILE_RE = re.compile(r'/wikipedia/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/(?P<name>[^/]+)')


def _dedupe_keys(item):
    keys = set()
    for field in ('full', 'thumb'):
        parts = urlsplit(item[field])
        keys.add(('url', parts.hostname, parts.path))
        match = _COMMONS_FILE_RE.search(parts.path)
        if match:
            keys.add(('commons-file', unquote(match.group('name')).replace('_', ' ').casefold()))
    parts = urlsplit(item['source_url'])
    keys.add(('page', parts.hostname, parts.path, parts.query))
    return keys


def merge_results(*groups):
    """Manbalar natijalarini navbatma-navbat aralashtiradi (ikkala manba ham ko'rinsin), takrorlarni tashlab, <= 12 ta qaytaradi."""
    merged, seen = [], set()
    longest = max((len(g) for g in groups), default=0)
    for position in range(longest):
        for group in groups:
            if position >= len(group):
                continue
            item = group[position]
            keys = _dedupe_keys(item)
            if keys & seen:
                continue
            seen |= keys
            merged.append(item)
            if len(merged) >= MAX_RESULTS:
                return merged
    return merged


def _lookup(term):
    """Ikkala manbaga parallel so'rov. → (natijalar, to'liqmi). Ikkalasi yiqilsa ImageSearchUnavailable."""
    sources = (('openverse', _search_openverse), ('wikimedia', _search_wikimedia))
    pool = ThreadPoolExecutor(max_workers=len(sources), thread_name_prefix='menu-img-search')
    groups, failed = [], 0
    try:
        futures = [(name, pool.submit(func, term)) for name, func in sources]
        # Umumiy kutish 8 s: sekin/osilgan manba qolgan manba natijasini kechiktirmaydi (haqiqiy sinovda Openverse tez-tez 10 s osilardi)
        wait([future for _name, future in futures], timeout=SOURCE_TIMEOUT)
        for name, future in futures:
            try:
                if not future.done():
                    future.cancel()
                    raise TimeoutError(f'{SOURCE_TIMEOUT} s ichida javob bermadi')
                groups.append(future.result())
            except Exception as exc:
                failed += 1
                logger.warning('menu image search: %s manbasi ishlamadi (%s: %s)', name, exc.__class__.__name__, exc)
    finally:
        pool.shutdown(wait=False)
    if failed == len(sources):
        raise ImageSearchUnavailable(
            "Internetdan rasm qidirish hozir ishlamayapti (rasm manbalariga ulanib bo'lmadi). "
            "Birozdan so'ng urinib ko'ring yoki o'z rasmingizni yuklang."
        )
    return merge_results(*groups), failed == 0


# ─── Kesh, tezlik cheklovi, tanlash yozuvi ───────────────────────────────────────────────────────
def _digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:40]


def _search_key(term):
    return f'menu_img_search:v1:{_digest(" ".join(_tokens(term)) or term)}'


def _pick_key(result_id):
    return f'menu_img_pick:v1:{_digest(str(result_id))}'


def check_rate_limit(scope, shop_id, limit):
    """Restoranga soatiga `limit` ta amal (qat'iy soatlik oyna, Django cache hisoblagichi). Oshsa ImageSearchRateLimited."""
    now = time.time()
    window = int(now // 3600)
    key = f'menu_img_rl:{scope}:{int(shop_id)}:{window}'
    if cache.add(key, 1, 3700):
        count = 1
    else:
        try:
            count = cache.incr(key)
        except ValueError:          # kalit shu orada tugab qoldi
            cache.set(key, 1, 3700)
            count = 1
    if count > limit:
        retry_after = max(1, 3600 - int(now % 3600))
        minutes = max(1, retry_after // 60 + 1)
        raise ImageSearchRateLimited(
            f"Soatiga {limit} ta so'rov chegarasiga yetdingiz. Taxminan {minutes} daqiqadan so'ng urinib ko'ring.",
            retry_after=retry_after,
        )


def search_images(query, shop_id):
    """Taom nomi → {'query_used': str, 'results': [...]}. Xatolar: ImageQueryError, ImageSearchRateLimited, ImageSearchUnavailable."""
    name = clean_query(query)
    outcome = None
    counted = False
    for term in query_candidates(name):
        key = _search_key(term)
        cached = cache.get(key)
        if cached is None:
            if not counted:
                check_rate_limit('search', shop_id, SEARCH_RATE_LIMIT)
                counted = True
            try:
                results, complete = _lookup(term)
            except ImageSearchUnavailable:
                if outcome is not None:        # zaxira so'z paytida manbalar yiqildi: oldingi (bo'sh) natija qoladi
                    break
                raise
            cached = {'results': results}
            cache.set(key, cached, SEARCH_CACHE_TTL if complete else PARTIAL_CACHE_TTL)
            if results:
                cache.set_many({_pick_key(item['id']): item for item in results}, PICK_REGISTRY_TTL)
        outcome = {'query_used': term, 'results': [dict(item) for item in cached['results']]}
        if outcome['results']:
            break
    return outcome


def get_pick_record(result_id):
    """Qidiruv natijasining serverdagi yozuvi (litsenziya, manzil, muallif). Yo'q/eskirgan bo'lsa None."""
    if not isinstance(result_id, str) or not 3 <= len(result_id) <= 100:
        return None
    record = cache.get(_pick_key(result_id))
    return record if isinstance(record, dict) and record.get('id') == result_id else None
