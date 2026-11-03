"""Menyu matni va jadvalini qatorlarga ajratish: sof Python, Django'siz (tez testlanadi).

`parse_text(text)` va `parse_table(rows)` — `[{name, price|None, category, description}]` qaytaradi.
`parse_text_detailed` / `parse_table_detailed` — shuningdek statistika (`ParseOutcome`) beradi: servis "taniganlar < 50%" qoidasi
va "N ta qator o'qilmadi" xabari uchun ishlatadi.

Qoidalar (qisqacha):
  • bir qator = bir taom; narxsiz qisqa qator bo'lim sarlavhasi (`:` bilan tugasa, KATTA HARFDA bo'lsa, bezakli bo'lsa yoki
    keyingi qator narxli bo'lsa);
  • markerlar (`•`, `-`, `*`, `1.`, `1)`, `✅`...) va emoji olib tashlanadi;
  • narx: `45000`, `45 000` (oddiy/NBSP/ingichka bo'shliq), `45.000`, `45,000`, `45k`, `45К`, `45 ming`, `45 тыс`,
    `45000 so'm/sum/сум/UZS/s`; nom va narx orasidagi matn tavsif bo'ladi;
  • "Osh 45k, Choy 8k" — faqat HAR bo'lak narx bilan tugasa ajratiladi;
  • jadval: sarlavha qatori aniqlanadi (nom/narx/kategoriya/tavsif), bo'lmasa ustunlar mazmundan taxmin qilinadi.
Apostrof turlari (' ʻ ʼ ’ `) nomda saqlanadi; faqat solishtirishda (`normalize_name`) tenglashtiriladi.
Regexlar chiziqli (qatorlar 400 belgiga qirqiladi), shuning uchun katta kirish ham tez ishlaydi.
"""
import io
import itertools
import re
import unicodedata
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

MAX_PRICE = 999_999_999_999            # Product.price: max_digits=12
MAX_LINE_CHARS = 400
MAX_LINES = 6000
MAX_TEXT_CHARS = 2_000_000
CATEGORY_MAX = 100
NAME_WORDS_MAX = 14

APOSTROPHES = "'`´ʻʼʽʹ′‛’‘"
_APOS = set(APOSTROPHES)
_APOS_RE = re.compile('[' + re.escape(APOSTROPHES) + ']')

UNIT_WORDS = {
    'l', 'litr', 'ml', 'gr', 'g', 'kg', 'dona', 'ta', 'porsiya', 'sm', 'cm', 'mm', 'pcs', 'pc',
    'шт', 'л', 'мл', 'гр', 'г', 'кг', 'порц', 'порция', 'штук',
}


# ─── umumiy yordamchilar ────────────────────────────────────────────────────────────

def normalize_name(value):
    """Solishtirish uchun: apostrof turlari olib tashlanadi, registr va tinish belgilari tenglashtiriladi."""
    text = unicodedata.normalize('NFKC', str(value if value is not None else ''))
    text = _APOS_RE.sub('', text).casefold()
    text = re.sub(r'[\W_]+', ' ', text)
    return ' '.join(text.split())


def _clean_inline(raw):
    """Boshqaruv/ko'rinmas belgilar tashlanadi, har xil bo'shliq (NBSP, ingichka...) oddiy bo'shliqqa, emoji/belgilar bo'shliqqa."""
    out = []
    for ch in raw:
        if ch == '\t':
            out.append('\t')
            continue
        cat = unicodedata.category(ch)
        if cat == 'Zs':
            out.append(' ')
        elif cat in ('Cc', 'Cf', 'Cs', 'Co', 'Cn'):
            continue
        elif cat == 'Mn' and '︀' <= ch <= '️':
            continue
        elif cat in ('So', 'Sk') and ch not in _APOS:
            out.append(' ')
        else:
            out.append(ch)
    return ''.join(out)


def _tidy(value):
    return ' '.join(str(value or '').split())


def _letters(text):
    return len(re.findall(r'[^\W\d_]', text))


def _name_like(text):
    """Taom nomiga o'xshaydimi: kamida 2 ta harf va faqat o'lchov birligi emas."""
    if _letters(text) < 2:
        return False
    words = re.findall(r'[^\W\d_]+', text.casefold())
    return not all(w in UNIT_WORDS for w in words)


def _smart_case(text):
    """BUTUNLAY KATTA HARFDAGI nom/bo'lim odatiy yozuvga keltiriladi (Palov, Olivye salati)."""
    if _letters(text) >= 4 and text.isupper():
        return text.capitalize()
    return text


# ─── narx ──────────────────────────────────────────────────────────────────────────

_CUR = r"(?:so[" + re.escape(APOSTROPHES) + r"]?m|som|sum|сум(?:ов|а)?|сўм|uzs|s(?![a-zа-яё]))"
_THOU = r"(?:k|к|ming|минг|тыс(?:яч[а-яё]*)?\.?|mln|млн)(?![a-zа-яё])"
_TOKEN = (
    r"(?:(?P<kd>\d+(?:[.,]\d+)?)\s?(?P<ku>" + _THOU + r")"
    r"|(?P<n>\d{1,3}(?: \d{3})+|\d{1,3}(?:[.,]\d{3})+|\d+))"
    r"(?:\s?(?P<cur>" + _CUR + r"))?"
)
_LEFT = r"(?<![^\W_])(?<!\d[.,])(?<!\d-)(?<!\d–)(?<!\d—)"
_END_RE = re.compile(_LEFT + _TOKEN + r"[\s.,;:!?)\]*]*$", re.IGNORECASE)
_ANY_RE = re.compile(_LEFT + _TOKEN + r"(?![^\W_])", re.IGNORECASE)
_WHOLE_RE = re.compile(r"\s*" + _TOKEN + r"[\s.,;:!?)\]*]*$", re.IGNORECASE)
_DELIM_AFTER = re.compile(r"\s*[,;|]\s*(?=[^\s\d])")
_TRAIL_PAREN = re.compile(r"\s*\(([^()]*)\)\s*$")


def _token_value(m):
    try:
        if m.group('ku'):
            unit = m.group('ku').casefold()
            factor = 1_000_000 if unit in ('mln', 'млн') else 1000
            raw = m.group('kd').replace(',', '.')
            if len(raw) > 13:
                return None
            number = Decimal(raw) * factor
        else:
            digits = re.sub(r'[ .,]', '', m.group('n'))
            if len(digits) > 13:
                return None
            number = Decimal(digits)
        value = int(number.quantize(Decimal(1), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError):
        return None
    return value if 0 < value <= MAX_PRICE else None


def parse_price(value):
    """Butun so'm (`int`) yoki None. Matn ("45 000", "45k", "45.000 so'm") ham, Excel sonlari (int/float/Decimal) ham."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            number = Decimal(str(value))
            if not number.is_finite():
                return None
            result = int(number.quantize(Decimal(1), rounding=ROUND_HALF_UP))
        except (InvalidOperation, ValueError, OverflowError):
            return None
        return result if 0 < result <= MAX_PRICE else None
    text = _clean_inline(str(value)).strip()
    if not text or len(text) > 60:
        return None
    m = _WHOLE_RE.fullmatch(text)
    return _token_value(m) if m else None


def _extract_price(s):
    """Qatordan narxni ajratadi: (narxgacha_qism, narx, narxdan_keyingi_qism) yoki None."""
    s = s.strip()
    attempts = []
    paren = _TRAIL_PAREN.search(s)
    if paren:
        attempts.append((s[:paren.start()], paren.group(1)))
    attempts.append((s, ''))
    for body, extra in attempts:
        m = _END_RE.search(body)
        if m:
            price = _token_value(m)
            if price is not None:
                return body[:m.start()], price, extra
    for m in _ANY_RE.finditer(s):                     # narx o'rtada: faqat aniq belgili (so'm/k/ming) bo'lsa
        if m.group('ku') or m.group('cur'):
            price = _token_value(m)
            if price is not None:
                return s[:m.start()], price, s[m.end():]
    return None


def _split_multi(s):
    """"Osh 45k, Choy 8k" -> ["Osh 45k", "Choy 8k"]; ajratib bo'lmasa None (tekshiruvni chaqiruvchi qiladi)."""
    cuts = []
    for m in _ANY_RE.finditer(s):
        d = _DELIM_AFTER.match(s, m.end())
        if d:
            cuts.append((m.end(), d.end()))
    if not cuts:
        return None
    chunks, start = [], 0
    for end, nxt in cuts:
        chunks.append(s[start:end])
        start = nxt
    chunks.append(s[start:])
    return chunks


# ─── qator → taom ──────────────────────────────────────────────────────────────────

_EDGE_SEP = r"[\s\-–—:=.…_·|/>•~,;(\[]"
_TAIL_SEP_RE = re.compile(_EDGE_SEP + r"+$")
_SEP_RE = re.compile(r"\s+[-–—]+\s+|\s*:\s+|\s{3,}")
_NAME_PAREN_RE = re.compile(r"^(?P<n>[^()]+?)\s*\((?P<d>[^()]*)\)$")
_MARKER_RE = re.compile(
    r"^(?:\s+|[•·●○◦▪■□▫☐☑✓✔➤➢►▶→>*+~#\-–—]+|\(?\d{1,3}\s*[.)](?=\s)|\d{1,2}-(?=\s)|[A-Za-z]\)(?=\s)|№\s*\d+[.)]?)")
_DECO_RE = re.compile(r"^\s*(?:[-–—=*#_~•·]{2,}|#)|[-–—=*#_~•·]{3,}\s*$")
_JUNK_RE = re.compile(
    r"^(?:tel|telefon|phone|manzil|adres|address|instagram|insta|telegram|www|http|email|wi-?fi|parol|password|sayt|site"
    r"|тел|телефон|адрес|время|часы|график)\b"
    r"|https?://|www\.|@\w{3,}|[\w.+-]+@[\w-]+\.\w{2,}"
    r"|(?<!\d)(?:\+\s?\d{1,3}[\s(-]*)?\(?\d{2}\)?[\s-]\d{3}[\s-]\d{2}[\s-]\d{2}(?!\d)"
    r"|\+998[\d\s()-]{9,}"
    r"|\b\d{1,2}[:.]\d{2}\s*[-–—]\s*\d{1,2}[:.]\d{2}\b",
    re.IGNORECASE)


def _strip_markers(s):
    prev = None
    while prev != s and s:
        prev = s
        s = _MARKER_RE.sub('', s, count=1)
    return s.strip()


def _strip_edges(s):
    s = _TAIL_SEP_RE.sub('', s)
    return re.sub(r"^[\s\-–—:=.…_·|/>•~,;)\]]+", '', s)


def _split_name_desc(head, rest=''):
    """Narxgacha qism (+ narxdan keyingisi) -> (nom, tavsif)."""
    head = head.strip()
    desc_parts = []
    if '\t' in head:
        parts = [p for p in head.split('\t') if p.strip()]
        head = parts[0] if parts else ''
        desc_parts.extend(parts[1:])
    head = _strip_edges(head)
    parts = _SEP_RE.split(head, maxsplit=1)
    if len(parts) == 2 and _name_like(parts[0]):
        head = _strip_edges(parts[0])
        desc_parts.insert(0, parts[1])
    pm = _NAME_PAREN_RE.match(head)
    if pm and not re.search(r'\d', pm.group('d')) and _name_like(pm.group('n')) and _letters(pm.group('d')) >= 2:
        head = pm.group('n').strip()
        desc_parts.insert(0, pm.group('d'))
    rest = _strip_edges(rest or '')
    if rest.startswith('(') and rest.endswith(')'):
        rest = rest[1:-1]
    if _letters(rest) >= 2:
        desc_parts.append(rest)
    name = _smart_case(_tidy(_strip_edges(head)))
    desc = _tidy(' '.join(_strip_edges(p) for p in desc_parts if p and p.strip()))
    return name, desc


@dataclass
class _Line:
    s: str
    blank_before: bool
    deco: bool
    junk: bool = False
    ext: tuple = None              # (head, price, rest)
    multi: list = None             # [(head, price, rest), ...]

    @property
    def priced_dish(self):
        if self.multi:
            return True
        return bool(self.ext and _name_like(_tidy(_strip_edges(self.ext[0]))))

    @property
    def price_only(self):
        return bool(self.ext and not _name_like(_tidy(_strip_edges(self.ext[0]))) and _letters(self.ext[0]) == 0)


def _analyze(raw, blank_before):
    deco = bool(_DECO_RE.search(raw))
    s = _strip_markers(raw)
    line = _Line(s, blank_before, deco)
    if _JUNK_RE.search(s):
        line.junk = True
        return line
    chunks = _split_multi(s)
    if chunks:
        parsed = []
        for chunk in chunks:
            ext = _extract_price(chunk)
            if ext is None or not _name_like(_tidy(_strip_edges(ext[0]))):
                parsed = None
                break
            parsed.append(ext)
        if parsed:
            line.multi = parsed
            return line
    line.ext = _extract_price(s)
    return line


_SCRIPT_LINE_RE = re.compile(r"<(script|style)\b.{0,500}?</\1\s*>", re.IGNORECASE)
_TAG_LINE_RE = re.compile(r"</?[A-Za-z][^<>]{0,100}>")


def _prepare(text):
    text = str(text or '')[:MAX_TEXT_CHARS]
    text = re.sub(r'[\r  \x0b\x0c\x85]', '\n', text.replace('\r\n', '\n'))
    blank = False
    for raw in itertools.islice(io.StringIO(text), MAX_LINES):
        cleaned = _clean_inline(raw[:MAX_LINE_CHARS * 2])
        if '<' in cleaned:                          # HTML/skript bo'laklari: "<b>Non</b> 3000" -> "Non 3000"
            cleaned = _TAG_LINE_RE.sub(' ', _SCRIPT_LINE_RE.sub(' ', cleaned))
        cleaned = cleaned.strip()
        if not cleaned:
            blank = True
            continue
        if not re.search(r'\w', cleaned):          # "-----", "***" kabi ajratgichlar: hisobga olinmaydi
            continue
        yield cleaned[:MAX_LINE_CHARS], blank
        blank = False


def _header_text(s):
    s = re.sub(r"^[\s\-–—=*#_~•·.:|>]+|[\s\-–—=*#_~•·.:|>]+$", '', s)
    return _smart_case(_tidy(s))[:CATEGORY_MAX].strip()


@dataclass
class ParseOutcome:
    rows: list = field(default_factory=list)
    lines: int = 0                 # bo'sh bo'lmagan qatorlar
    skipped: int = 0               # o'qilmagan qatorlar
    headers: int = 0               # bo'lim sarlavhalari
    category: str = ''             # oxirgi bo'lim (keyingi blokka o'tkaziladi)
    skipped_samples: list = field(default_factory=list)

    @property
    def dish_lines(self):
        return max(0, self.lines - self.headers)

    @property
    def recognized_ratio(self):
        return (len(self.rows) / self.dish_lines) if self.dish_lines else 0.0


def parse_text_detailed(text, default_category=''):
    """Matn -> taomlar. Qoidalar modul docstring'ida."""
    lines = [_analyze(raw, blank) for raw, blank in _prepare(text)]
    outcome = ParseOutcome(lines=len(lines), category=_tidy(default_category)[:CATEGORY_MAX])
    any_priced = any(line.priced_dish for line in lines)
    rows = outcome.rows
    last_row = None            # oldingi qatordan chiqqan taom (tavsif davomi / narx birlashtirish uchun)

    def skip(line):
        outcome.skipped += 1
        if len(outcome.skipped_samples) < 5:
            outcome.skipped_samples.append(line.s[:80])

    def add(name, price, description):
        row = {'name': name, 'price': price, 'category': outcome.category, 'description': description}
        rows.append(row)
        return row

    i = 0
    count = len(lines)
    while i < count:
        line = lines[i]
        i += 1
        adjacent = not line.blank_before
        prev = last_row if adjacent else None
        last_row = None
        if line.junk:
            skip(line)
            continue
        if line.multi:
            for head, price, rest in line.multi:
                name, desc = _split_name_desc(head, rest)
                last_row = add(name, price, desc)
            continue
        if line.ext:
            name, desc = _split_name_desc(line.ext[0], line.ext[2])
            if _name_like(name):
                last_row = add(name, line.ext[1], desc)
            elif line.price_only and prev is not None and prev['price'] is None:
                prev['price'] = line.ext[1]       # "Palov" + keyingi qatorda "45 000"
                last_row = prev
            else:
                skip(line)
            continue
        text_s = line.s
        words = len(text_s.split())
        if text_s.endswith(':') or line.deco:
            header = _header_text(text_s)
            if _letters(header) >= 2:
                outcome.category = header
                outcome.headers += 1
            else:
                skip(line)
            continue
        short = words <= 6 and len(text_s) <= 60
        if any_priced and short and text_s.isupper() and _letters(text_s) >= 3:
            outcome.category = _header_text(text_s)
            outcome.headers += 1
            continue
        if i < count and lines[i].price_only and not lines[i].blank_before and _name_like(text_s):
            name, desc = _split_name_desc(text_s)
            last_row = add(name, lines[i].ext[1], desc)       # nom bir qatorda, narx keyingi qatorda
            i += 1
            continue
        if prev is not None and (',' in text_s or text_s[0].islower() or text_s[0] == '(') and len(text_s) <= 300:
            prev['description'] = _tidy(f"{prev['description']} {text_s.strip('()')}")
            last_row = prev
            continue
        nxt = lines[i] if i < count else None
        if nxt is not None and nxt.priced_dish and short and ',' not in text_s and _name_like(text_s):
            outcome.category = _header_text(text_s)
            outcome.headers += 1
            continue
        name, desc = _split_name_desc(text_s)
        if _name_like(name) and len(name.split()) <= NAME_WORDS_MAX and len(name) <= 120:
            last_row = add(name, None, desc)
        else:
            skip(line)
    return outcome


def parse_text(text, default_category=''):
    """Matn -> `[{name, price|None, category, description}]`."""
    return parse_text_detailed(text, default_category).rows


# ─── jadval ────────────────────────────────────────────────────────────────────────

_ROLE_WORDS = {
    'price': {'narx', 'narxi', 'narxlar', 'narxlari', 'цена', 'цены', 'стоимость', 'сумма', 'summa', 'price', 'cost', 'amount',
              'sum', 'som', 'сум', 'сумм', 'baho', 'bahosi'},
    'category': {'kategoriya', 'kategoriyasi', 'bolim', 'bolimi', 'bolimlar', 'tur', 'turi', 'turlari', 'guruh', 'guruhi',
                 'категория', 'раздел', 'группа', 'отдел', 'category', 'section', 'group', 'type', 'kind', 'razdel'},
    'description': {'tavsif', 'tavsifi', 'izoh', 'izohi', 'izohlar', 'tarkib', 'tarkibi', 'описание', 'состав', 'комментарий',
                    'description', 'desc', 'ingredients', 'comment', 'note', 'notes', 'details'},
    'name': {'nom', 'nomi', 'nomlanishi', 'taom', 'taomi', 'taomlar', 'taomlari', 'mahsulot', 'mahsuloti', 'ovqat', 'ovqati',
             'название', 'наименование', 'блюдо', 'товар', 'позиция', 'name', 'dish', 'item', 'title', 'product', 'menu',
             'menyu', 'pozitsiya', 'ism'},
}
_ROLE_ORDER = ('price', 'category', 'description', 'name')
_GENERIC_SHEET_RE = re.compile(r"^(sheet|лист|varaq|list|sahifa|page|hisobot|table)\s*\d*$", re.IGNORECASE)


def _cell_text(value):
    if value is None or isinstance(value, bool):
        return ''
    if isinstance(value, float):
        if value != value or value in (float('inf'), float('-inf')):
            return ''
        return str(int(value)) if value == int(value) else str(value)
    if isinstance(value, (int, Decimal)):
        return str(value)
    return _tidy(_clean_inline(str(value)).replace('\t', ' '))


def _role_of(text):
    norm = normalize_name(text)
    words = set(norm.split())
    for role in _ROLE_ORDER:
        if words & _ROLE_WORDS[role]:
            return role
    return None


def _find_header(rows):
    """(sarlavha_qator_indeksi, {rol: ustun}) yoki (None, {})."""
    for idx, row in enumerate(rows[:8]):
        roles = {}
        for col, cell in enumerate(row):
            text = _cell_text(cell)
            if not text or len(text) > 40 or parse_price(cell) is not None:
                continue
            role = _role_of(text)
            if role and role not in roles:
                roles[role] = col
        if 'name' in roles and len(roles) >= 2:
            return idx, roles
        if 'price' in roles and len(roles) >= 2:
            return idx, roles
    return None, {}


def _is_numeric_cell(cell):
    text = _cell_text(cell)
    return bool(text) and _letters(text) == 0 and parse_price(cell) is not None


def _is_sequence_column(values):
    ints = []
    for v in values:
        t = _cell_text(v)
        if not t.isdigit():
            return False
        ints.append(int(t))
    return len(ints) >= 3 and ints == list(range(ints[0], ints[0] + len(ints))) and ints[0] in (0, 1)


def _infer_roles(rows):
    """Sarlavhasiz jadval: ustun rollarini mazmundan taxmin qilish."""
    sample = rows[:60]
    ncols = max((len(r) for r in sample), default=0)
    cols = []
    for c in range(ncols):
        cells = [r[c] if c < len(r) else None for r in sample]
        filled = [x for x in cells if _cell_text(x)]
        numeric = [x for x in filled if _is_numeric_cell(x)]
        texty = [_cell_text(x) for x in filled if _letters(_cell_text(x)) >= 2]
        cols.append({'filled': len(filled), 'numeric': numeric, 'texty': texty,
                     'distinct': {normalize_name(t) for t in texty}, 'avg_len': (sum(map(len, texty)) / len(texty)) if texty else 0})
    total = max(1, len(sample))
    roles = {}
    price_candidates = [
        c for c, info in enumerate(cols)
        if info['filled'] and len(info['numeric']) / info['filled'] >= 0.6 and len(info['numeric']) / total >= 0.4
        and not _is_sequence_column(info['numeric'])
    ]
    if price_candidates:
        roles['price'] = price_candidates[-1]
    text_cols = [c for c, info in enumerate(cols) if c != roles.get('price') and len(info['texty']) / total >= 0.4]
    category_cols = [c for c in text_cols if len(cols[c]['texty']) >= 4 and len(cols[c]['distinct']) <= max(2, 0.4 * len(cols[c]['texty']))]
    others = [c for c in text_cols if c not in category_cols]
    if category_cols and others:
        roles['category'] = category_cols[0]
    elif category_cols and not others:
        others = category_cols
    if others:
        roles['name'] = others[0]
        if len(others) > 1:
            roles['description'] = others[1]
    return roles


def parse_table_detailed(rows, default_category=''):
    """Jadval (qatorlar ro'yxati, katak: str/int/float/Decimal/None) -> taomlar."""
    rows = [list(r) for r in (rows or []) if any(_cell_text(c) for c in r)]
    outcome = ParseOutcome(lines=len(rows), category=_tidy(default_category)[:CATEGORY_MAX])
    if not rows:
        return outcome
    header_idx, roles = _find_header(rows)
    body = rows[header_idx + 1:] if header_idx is not None else rows
    if header_idx is not None:
        outcome.lines = len(body)
    if header_idx is None:
        roles = _infer_roles(body)
    if 'name' not in roles:
        return _table_as_text(body, outcome, default_category)
    if 'price' not in roles and header_idx is None:
        return _table_as_text(body, outcome, default_category)

    def cell(row, role):
        col = roles.get(role)
        return _cell_text(row[col]) if col is not None and col < len(row) else ''

    def raw(row, role):
        col = roles.get(role)
        return row[col] if col is not None and col < len(row) else None

    has_price_col = 'price' in roles
    header_cells = {normalize_name(_cell_text(c)) for c in rows[header_idx]} if header_idx is not None else set()
    for pos, row in enumerate(body):
        name = cell(row, 'name')
        filled = [_cell_text(c) for c in row if _cell_text(c)]
        if not name:
            outcome.skipped += 1
            if filled and len(outcome.skipped_samples) < 5:
                outcome.skipped_samples.append(' | '.join(filled)[:80])
            continue
        if normalize_name(name) in header_cells and header_idx is not None and len(filled) >= 2:
            outcome.lines -= 1                      # takrorlangan sarlavha qatori
            continue
        price_cell = raw(row, 'price')
        price = parse_price(price_cell)
        if has_price_col and len(filled) == 1 and price is None:
            nxt = next((r for r in body[pos + 1:]), None)
            nxt_priced = nxt is not None and parse_price(raw(nxt, 'price')) is not None
            if nxt_priced or name.endswith(':') or (name.isupper() and _letters(name) >= 3):
                outcome.category = _header_text(name)
                outcome.headers += 1
                continue
        description = cell(row, 'description')
        if price is None and not _cell_text(price_cell):
            inline = _extract_price(name)             # "Palov 45000" bitta katakda
            if inline and _name_like(_tidy(_strip_edges(inline[0]))):
                name, extra = _split_name_desc(inline[0], inline[2])
                price = inline[1]
                description = description or extra
        if not _name_like(name) and not re.search(r'\w{2,}', name):
            outcome.skipped += 1
            continue
        category = cell(row, 'category') or outcome.category
        outcome.rows.append({
            'name': _smart_case(name),
            'price': price,
            'category': _smart_case(category)[:CATEGORY_MAX],
            'description': description,
        })
    return outcome


def _table_as_text(body, outcome, default_category):
    """Narx ustuni topilmasa: har qator matn qatori kabi o'qiladi (narx katak ichida bo'lishi mumkin)."""
    text = '\n'.join('\t'.join(_cell_text(c) for c in row if _cell_text(c)) for row in body)
    return parse_text_detailed(text, default_category)


def parse_table(rows, default_category=''):
    """Jadval -> `[{name, price|None, category, description}]`."""
    return parse_table_detailed(rows, default_category).rows


def default_category_from_sheet(title, sheet_count):
    """Bir nechta varaqli faylda varaq nomi (Salatlar, Ichimliklar) bo'lim bo'ladi; "Sheet1" kabi umumiy nom emas."""
    title = _tidy(title)
    if sheet_count < 2 or not title or _GENERIC_SHEET_RE.match(title):
        return ''
    return title[:CATEGORY_MAX]
