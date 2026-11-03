"""Yuklangan faylni o'qish: matn / csv / xlsx / docx / pdf / rasm (docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md).

Fayl tarkibi ISHONCHSIZ. Tur kengaytma bilan EMAS, avvalo SEHRLI BAYTLAR bilan aniqlanadi (zip `PK`, `%PDF`, rasm sarlavhalari,
OLE2 `.xls/.doc`); kengaytma tarkibga zid bo'lsa (`menu.xlsx` aslida matn) fayl rad etiladi.
Himoya: hajm <= 10 MB; xlsx/docx (zip) ochilganda jami <= 50 MB, <= 2000 yozuv, siqish nisbati chegarasi (zip-bomba);
pdf <= 10 bet; varaqlar/qatorlar/ustunlar soni cheklangan; parser vaqti <= 20 s.
`.xls/.doc/.sdocx/.memo/.pages/.numbers` va boshqa turlar — `UnsupportedType` (415) + aniq maslahat.
Skanerlangan PDF va rasm bu yerda o'qilmaydi: `ReadResult.needs` ('image' | 'scanned_pdf') orqali servis B1b `vision` ga beradi.
"""
import codecs
import csv
import io
import logging
import re
import time
import zipfile
from dataclasses import dataclass, field

from products.menu_import.errors import (
    SUPPORTED_HINT,
    EmptyFile,
    FileTooLarge,
    InvalidFile,
    InvalidInput,
    UnsupportedType,
)

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_ZIP_UNCOMPRESSED = 50 * 1024 * 1024
MAX_ZIP_XML_PART = 8 * 1024 * 1024         # bitta XML qism (hujjat/varaq/matnlar jadvali): xotirada to'liq ochiladi (menyu uchun ko'p)
MAX_ZIP_ENTRIES = 2000
MAX_ZIP_RATIO = 200                        # bitta yirik yozuvning siqish nisbati (haqiqiy xlsx/docx XML ~ 5-30x)
RATIO_CHECK_MIN_SIZE = 1024 * 1024
MAX_PDF_PAGES = 10
MAX_SHEETS = 20
MAX_COLS = 30
MAX_SCANNED_ROWS = 20_000                  # varaqda ko'riladigan qatorlar (bo'shlari ham) — bitta katta bo'sh dimension DoS qilmasin
MAX_TABLE_ROWS = 6000
MAX_TEXT_CHARS = 2_000_000
MAX_IMAGE_PIXELS = 40_000_000
PARSE_TIME_LIMIT = 20.0                    # soniya
SCANNED_PDF_MIN_CHARS = 15                 # shundan kam (bo'shliqsiz) belgi -> matn qatlami yo'q, skanerlangan PDF deb qaraladi

TEXT_EXTS = {'txt', 'text', 'md', 'log'}
CSV_EXTS = {'csv', 'tsv'}
IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'webp'}
XLSX_EXTS = {'xlsx', 'xlsm'}
KNOWN_SUPPORTED_EXTS = TEXT_EXTS | CSV_EXTS | IMAGE_EXTS | XLSX_EXTS | {'docx', 'pdf'}
UNSUPPORTED_EXTS = {
    'xls': "Eski «.xls» Excel formati o'qilmaydi",
    'doc': "Eski «.doc» Word formati o'qilmaydi",
    'sdocx': "Samsung Notes «.sdocx» fayli o'qilmaydi",
    'memo': "Samsung Memo «.memo» fayli o'qilmaydi",
    'pages': "Apple «.pages» fayli o'qilmaydi",
    'numbers': "Apple «.numbers» fayli o'qilmaydi",
    'odt': "OpenDocument «.odt» fayli o'qilmaydi",
    'ods': "OpenDocument «.ods» fayli o'qilmaydi",
    'rtf': "«.rtf» fayli o'qilmaydi",
    'xlsb': "«.xlsb» Excel formati o'qilmaydi",
    'pptx': "PowerPoint fayli o'qilmaydi",
    'ppt': "PowerPoint fayli o'qilmaydi",
    'heic': "iPhone HEIC rasmi o'qilmaydi (JPG yoki PNG qiling: skrinshot oling yoki Sozlamalar → Kamera → Formatlar → «Eng mos»)",
    'heif': "iPhone HEIF rasmi o'qilmaydi (JPG yoki PNG qiling)",
    'gif': "«.gif» rasmi o'qilmaydi (JPG, PNG yoki WEBP yuklang)",
    'bmp': "«.bmp» rasmi o'qilmaydi (JPG, PNG yoki WEBP yuklang)",
    'svg': "«.svg» fayli o'qilmaydi",
    'html': "«.html» fayli o'qilmaydi",
    'htm': "«.htm» fayli o'qilmaydi",
    'zip': "Arxiv fayli o'qilmaydi",
    'rar': "Arxiv fayli o'qilmaydi",
    '7z': "Arxiv fayli o'qilmaydi",
    'exe': "Bu fayl turi o'qilmaydi",
}
_GENERIC_SHEET_RE = re.compile(r"^(sheet|лист|varaq|list|sahifa|page|table)\s*\d*$", re.IGNORECASE)

_OLE_MAGIC = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'
_HEIC_BRANDS = {b'heic', b'heix', b'heim', b'heis', b'hevc', b'hevx', b'mif1', b'msf1', b'avif'}


@dataclass
class Block:
    """O'qilgan bo'lak: 'text' (qatorlar) yoki 'table' (katakchalar). `title` — varaq nomi (bo'lim taxmini uchun)."""
    kind: str
    text: str = ''
    rows: list = field(default_factory=list)
    title: str = ''


@dataclass
class ReadResult:
    source: str                                   # text | csv | xlsx | docx | pdf | image
    text: str = ''                                # barcha matn bo'laklari
    table_rows: list = field(default_factory=list)  # barcha jadval qatorlari (bo'sh qatorlarsiz)
    notes: list = field(default_factory=list)
    blocks: list = field(default_factory=list)
    needs: str = ''                               # '' | 'image' | 'scanned_pdf' — servis B1b `vision` ni chaqiradi
    raw: bytes = b''                              # needs bo'lganda: rasm/PDF baytlari
    pdf_pages: int = 0


class Deadline:
    def __init__(self, seconds=PARSE_TIME_LIMIT):
        self.limit = time.monotonic() + seconds

    def check(self):
        if time.monotonic() > self.limit:
            raise InvalidFile(
                "Faylni o'qish juda uzoq davom etdi (20 soniyadan ortiq). Faylni kichraytiring yoki bo'lib yuboring.",
                code='parse_timeout')


# ─── tur aniqlash ──────────────────────────────────────────────────────────────────

def _ext(name):
    base = (name or '').rsplit('/', 1)[-1].rsplit('\\', 1)[-1]
    return base.rsplit('.', 1)[-1].lower() if '.' in base else ''


def unsupported_message(name, reason=None):
    ext = _ext(name)
    what = reason or UNSUPPORTED_EXTS.get(ext) or f"'{(name or 'fayl')[:60]}' turidagi fayl o'qilmaydi"
    return f"{what}. {SUPPORTED_HINT}"


def sniff(raw):
    """Sehrli baytlar bo'yicha: 'zip' | 'pdf' | 'jpeg' | 'png' | 'webp' | 'ole' | 'heic' | 'utf16' | 'binary' | 'text'."""
    head = raw[:16]
    if head.startswith(b'PK\x03\x04') or head.startswith(b'PK\x05\x06'):
        return 'zip'
    if raw[:1024].lstrip(b'\x00\r\n\t ').startswith(b'%PDF-') or head.startswith(b'%PDF-'):
        return 'pdf'
    if head.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    if head.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'webp'
    if head.startswith(_OLE_MAGIC):
        return 'ole'
    if head[4:8] == b'ftyp' and head[8:12] in _HEIC_BRANDS:
        return 'heic'
    if head.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)):
        return 'utf16'
    if b'\x00' in raw[:4096]:
        return 'binary'
    return 'text'


def decode_text(raw):
    """utf-8-sig -> utf-8 -> cp1251 (Windows kirill/lotin); utf-16 BOM bo'lsa utf-16."""
    if raw.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)):
        text = raw.decode('utf-16', errors='replace')
    else:
        for encoding in ('utf-8-sig', 'utf-8'):
            try:
                text = raw.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            text = raw.decode('cp1251', errors='replace')
    return text.replace('\x00', '')[:MAX_TEXT_CHARS]


# ─── zip (xlsx / docx) ─────────────────────────────────────────────────────────────

def _open_zip(raw, name):
    try:
        archive = zipfile.ZipFile(io.BytesIO(raw))
    except (zipfile.BadZipFile, OSError, ValueError, EOFError, NotImplementedError):
        raise InvalidFile(f"'{name}' buzuq yoki to'liq yuklanmagan fayl. Qayta saqlab yuboring.") from None
    infos = archive.infolist()
    if len(infos) > MAX_ZIP_ENTRIES:
        archive.close()
        raise InvalidFile(
            f"Fayl ichida juda ko'p yozuv bor ({len(infos)} ta, ko'pi bilan {MAX_ZIP_ENTRIES}). Fayl shubhali yoki buzuq.",
            code='zip_bomb')
    total = 0
    for info in infos:
        total += info.file_size
        ratio = info.file_size / max(info.compress_size, 1)
        if (info.file_size > RATIO_CHECK_MIN_SIZE and ratio > MAX_ZIP_RATIO) \
                or (info.filename.lower().endswith(('.xml', '.rels')) and info.file_size > MAX_ZIP_XML_PART):
            archive.close()
            raise InvalidFile("Fayl ichidagi ma'lumot haddan tashqari siqilgan (zip-bomba xavfi). Fayl rad etildi.",
                              code='zip_bomb')
    if total > MAX_ZIP_UNCOMPRESSED:
        archive.close()
        raise InvalidFile(
            f"Fayl ochilganda {MAX_ZIP_UNCOMPRESSED // (1024 * 1024)} MB dan oshadi. Fayl rad etildi.", code='zip_bomb')
    return archive


def _zip_kind(archive):
    names = {i.filename for i in archive.infolist()}
    if 'xl/workbook.xml' in names:
        return 'xlsx'
    if 'word/document.xml' in names:
        return 'docx'
    if 'xl/workbook.bin' in names:
        return 'xlsb'
    if any(n.startswith('ppt/') for n in names):
        return 'pptx'
    if 'mimetype' in names:
        return 'odf'
    if any(n.startswith('Index/') or n.endswith('.iwa') for n in names):
        return 'iwork'
    return 'zip'


# ─── asosiy kirish nuqtasi ─────────────────────────────────────────────────────────

def read_upload(uploaded_file):
    """Yuklangan fayl -> `ReadResult`. Xatolar: `FileTooLarge` (413), `UnsupportedType` (415), `InvalidFile`/`InvalidInput` (400)."""
    name = (getattr(uploaded_file, 'name', '') or 'fayl')[:200]
    size = getattr(uploaded_file, 'size', None)
    if size is not None and size > MAX_FILE_BYTES:
        raise FileTooLarge(
            f"Fayl hajmi {MAX_FILE_BYTES // (1024 * 1024)} MB dan oshmasligi kerak (sizniki: {size / 1024 / 1024:.1f} MB).")
    try:
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        raw = uploaded_file.read(MAX_FILE_BYTES + 1)
    except (OSError, ValueError):
        raise InvalidFile(f"'{name}' faylini o'qib bo'lmadi.") from None
    if len(raw) > MAX_FILE_BYTES:
        raise FileTooLarge(f"Fayl hajmi {MAX_FILE_BYTES // (1024 * 1024)} MB dan oshmasligi kerak.")
    if not raw.strip(b'\x00 \r\n\t'):
        raise EmptyFile("Fayl bo'sh. Menyu yozilgan faylni yuboring.")

    ext = _ext(name)
    if ext in UNSUPPORTED_EXTS:
        raise UnsupportedType(unsupported_message(name))

    kind = sniff(raw)
    deadline = Deadline()

    if kind == 'ole':
        raise UnsupportedType(unsupported_message(
            name, "Bu eski Microsoft formati (.xls / .doc) — o'qilmaydi"))
    if kind == 'heic':
        raise UnsupportedType(unsupported_message(name, UNSUPPORTED_EXTS['heic']))
    if kind == 'binary':
        if ext in KNOWN_SUPPORTED_EXTS:
            raise InvalidFile(f"'{name}' haqiqiy .{ext} fayl emas (tarkibi boshqa turda). Faylni qayta saqlab yuboring.")
        raise UnsupportedType(unsupported_message(name))

    if kind == 'zip':
        archive = _open_zip(raw, name)
        try:
            zkind = _zip_kind(archive)
        finally:
            archive.close()
        if zkind == 'xlsx':
            _expect_ext(name, ext, XLSX_EXTS, 'xlsx')
            return _read_xlsx(raw, deadline)
        if zkind == 'docx':
            _expect_ext(name, ext, {'docx'}, 'docx')
            return _read_docx(raw, deadline)
        raise UnsupportedType(unsupported_message(
            name, {'xlsb': UNSUPPORTED_EXTS['xlsb'], 'pptx': UNSUPPORTED_EXTS['pptx'], 'odf': "OpenDocument fayli o'qilmaydi",
                   'iwork': "Apple (.pages/.numbers) fayli o'qilmaydi"}.get(zkind, "Arxiv fayli o'qilmaydi")))

    if kind == 'pdf':
        _expect_ext(name, ext, {'pdf'}, 'pdf')
        return _read_pdf(raw, name, deadline)

    if kind in ('jpeg', 'png', 'webp'):
        _expect_ext(name, ext, IMAGE_EXTS, 'rasm')
        return _read_image(raw, name)

    # matn (utf-16 ham)
    if ext in XLSX_EXTS | {'docx', 'pdf'} | IMAGE_EXTS:
        raise InvalidFile(f"'{name}' haqiqiy .{ext} fayl emas (ichida oddiy matn). Faylni qayta saqlab yuboring.")
    text = decode_text(raw)
    if not text.strip():
        raise EmptyFile("Fayl bo'sh. Menyu yozilgan faylni yuboring.")
    if ext in CSV_EXTS:
        return _read_csv(text, deadline, tsv=(ext == 'tsv'))
    return text_result(text, 'text')


def _expect_ext(name, ext, allowed, label):
    """Kengaytma tarkibga zid bo'lsa rad etiladi; kengaytma yo'q yoki noma'lum bo'lsa tarkib hal qiladi."""
    if ext and ext in KNOWN_SUPPORTED_EXTS and ext not in allowed and ext not in UNSUPPORTED_EXTS:
        raise InvalidFile(f"'{name}' kengaytmasi .{ext}, lekin ichi {label} fayli. Faylni to'g'ri nom bilan saqlab yuboring.")


def text_result(text, source='text'):
    return ReadResult(source=source, text=text, blocks=[Block('text', text=text)])


# ─── csv / txt ─────────────────────────────────────────────────────────────────────

def _sniff_delimiter(lines, preferred=None):
    best, best_score = None, 0.0
    candidates = (preferred,) if preferred else (';', '\t', ',', '|')
    sample = [ln for ln in lines if ln.strip()][:40]
    if len(sample) < 1:
        return None
    for delim in candidates:
        counts = [ln.count(delim) for ln in sample]
        if min(counts) == 0 and sum(1 for c in counts if c) / len(counts) < 0.6:
            continue
        mode = max(set(counts), key=counts.count)
        if mode == 0:
            continue
        consistent = sum(1 for c in counts if c == mode) / len(counts)
        score = consistent * mode
        if consistent >= 0.6 and score > best_score:
            best, best_score = delim, score
    return best


def _read_csv(text, deadline, tsv=False):
    lines = text.splitlines()
    delim = _sniff_delimiter(lines, '\t' if tsv else None)
    if delim is None:                       # bitta ustun: oddiy matn kabi qoidalar bilan o'qiladi
        result = text_result(text, 'csv')
        return result
    rows = []
    try:
        for row in csv.reader(io.StringIO(text), delimiter=delim):
            if len(rows) % 200 == 0:
                deadline.check()
            if any(cell.strip() for cell in row):
                rows.append([cell.strip() for cell in row[:MAX_COLS]])
            if len(rows) >= MAX_TABLE_ROWS:
                break
    except csv.Error:
        raise InvalidFile("CSV fayl buzuq (tirnoqlar yoki ustunlar noto'g'ri). Excel'da qayta saqlab yuboring.") from None
    if not rows:
        raise EmptyFile("CSV faylda ma'lumot topilmadi.")
    return ReadResult(source='csv', table_rows=rows, blocks=[Block('table', rows=rows)])


# ─── xlsx ──────────────────────────────────────────────────────────────────────────

def _read_xlsx(raw, deadline):
    try:
        import openpyxl
    except ImportError:                                                                  # pragma: no cover
        raise UnsupportedType("Server hozircha .xlsx o'qiy olmaydi (openpyxl o'rnatilmagan).") from None
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except Exception:  # noqa: BLE001 — openpyxl buzuq fayllarda turli istisnolar beradi
        raise InvalidFile("Excel fayl buzuq yoki parol bilan himoyalangan. Parolni olib tashlab, qayta saqlang.") from None
    blocks, notes, all_rows = [], [], []
    try:
        sheets = [ws for ws in workbook.worksheets if getattr(ws, 'sheet_state', 'visible') == 'visible'][:MAX_SHEETS]
        collected = []
        for ws in sheets:
            rows, scanned, truncated = [], 0, False
            try:
                for values in ws.iter_rows(values_only=True, max_col=MAX_COLS):
                    scanned += 1
                    if scanned % 500 == 0:
                        deadline.check()
                    if scanned > MAX_SCANNED_ROWS:
                        truncated = True
                        break
                    cells = list(values)
                    while cells and (cells[-1] is None or (isinstance(cells[-1], str) and not cells[-1].strip())):
                        cells.pop()
                    if not cells or not any(c is not None and str(c).strip() for c in cells):
                        continue
                    rows.append(cells)
                    if len(rows) >= MAX_TABLE_ROWS:
                        truncated = True
                        break
            except InvalidFile:
                raise
            except Exception:  # noqa: BLE001
                raise InvalidFile("Excel faylni o'qib bo'lmadi (varaq buzuq). Qayta saqlab yuboring.") from None
            if truncated:
                notes.append(f"«{ws.title}» varag'ida juda ko'p qator bor: faqat boshidagilari o'qildi.")
            if rows:
                collected.append((ws.title, rows))
    finally:
        workbook.close()
    from products.menu_import.text_parser import default_category_from_sheet
    for title, rows in collected:
        blocks.append(Block('table', rows=rows, title=default_category_from_sheet(title, len(collected))))
        all_rows.extend(rows)
    if not all_rows:
        raise EmptyFile("Excel faylda ma'lumot topilmadi (bo'sh yoki yashirin varaqlar). Menyu yozilgan varaqni oching va qayta saqlang.")
    return ReadResult(source='xlsx', table_rows=all_rows, blocks=blocks, notes=notes)


# ─── docx ──────────────────────────────────────────────────────────────────────────

def _read_docx(raw, deadline):
    try:
        import docx
        from docx.table import Table
        from docx.text.paragraph import Paragraph
    except ImportError:                                                                  # pragma: no cover
        raise UnsupportedType("Server hozircha .docx o'qiy olmaydi (python-docx o'rnatilmagan).") from None
    try:
        document = docx.Document(io.BytesIO(raw))
    except Exception:  # noqa: BLE001
        raise InvalidFile("Word fayl buzuq yoki parol bilan himoyalangan. Qayta saqlab yuboring.") from None
    blocks, paragraphs, all_text, all_rows = [], [], [], []
    count = 0

    def flush():
        if paragraphs:
            text = '\n'.join(paragraphs)
            blocks.append(Block('text', text=text))
            all_text.append(text)
            paragraphs.clear()

    try:
        for item in document.iter_inner_content():
            count += 1
            if count % 200 == 0:
                deadline.check()
            if isinstance(item, Paragraph):
                if item.text.strip():
                    paragraphs.append(item.text)
            elif isinstance(item, Table):
                flush()
                rows = []
                for row in item.rows[:MAX_TABLE_ROWS]:
                    cells, seen = [], set()
                    for cell in row.cells[:MAX_COLS]:
                        key = id(cell._tc)
                        if key in seen:
                            continue                      # birlashtirilgan katak bir necha marta qaytadi
                        seen.add(key)
                        cells.append(' '.join(cell.text.split()))
                    if any(cells):
                        rows.append(cells)
                if rows:
                    blocks.append(Block('table', rows=rows))
                    all_rows.extend(rows)
            if len(paragraphs) > 20_000:
                break
    except InvalidFile:
        raise
    except Exception:  # noqa: BLE001
        raise InvalidFile("Word faylni o'qib bo'lmadi (tarkibi buzuq). Qayta saqlab yuboring.") from None
    flush()
    if not blocks:
        raise EmptyFile("Word faylda matn topilmadi. Menyu rasm bo'lsa, rasmni alohida yuboring yoki PDF/Excel qiling.")
    return ReadResult(source='docx', text='\n'.join(all_text), table_rows=all_rows, blocks=blocks)


# ─── pdf ───────────────────────────────────────────────────────────────────────────

def _read_pdf(raw, name, deadline):
    try:
        from pypdf import PdfReader
    except ImportError:                                                                  # pragma: no cover
        raise UnsupportedType("Server hozircha PDF o'qiy olmaydi (pypdf o'rnatilmagan).") from None
    try:
        reader = PdfReader(io.BytesIO(raw), strict=False)
        if reader.is_encrypted:
            try:
                ok = reader.decrypt('')
            except Exception:  # noqa: BLE001
                ok = 0
            if not ok:
                raise InvalidFile("PDF parol bilan himoyalangan. Parolsiz saqlab yuboring.")
        pages = len(reader.pages)
    except InvalidFile:
        raise
    except Exception:  # noqa: BLE001 — pypdf buzuq fayllarda turli istisnolar beradi
        raise InvalidFile(f"'{name}' buzuq PDF. Qayta saqlab yuboring.") from None
    if pages > MAX_PDF_PAGES:
        raise InvalidInput(
            f"PDF {MAX_PDF_PAGES} betdan oshmasligi kerak (sizniki: {pages} bet). Menyu betlarini alohida PDF qilib yuboring.",
            code='too_many_pages')
    texts = []
    try:
        for index in range(pages):
            deadline.check()
            texts.append(reader.pages[index].extract_text() or '')
    except InvalidFile:
        raise
    except Exception:  # noqa: BLE001
        raise InvalidFile(f"'{name}' PDF sahifasini o'qib bo'lmadi. Qayta saqlab yuboring.") from None
    text = '\n'.join(texts).replace('\x00', '')[:MAX_TEXT_CHARS]
    if len(re.sub(r'\s+', '', text)) < SCANNED_PDF_MIN_CHARS:
        return ReadResult(source='pdf', needs='scanned_pdf', raw=raw, pdf_pages=pages,
                          notes=["PDF ichida matn qatlami yo'q (skanerlangan). Rasm sifatida o'qishga urinildi."])
    result = text_result(text, 'pdf')
    result.pdf_pages = pages
    return result


# ─── rasm ──────────────────────────────────────────────────────────────────────────

def _read_image(raw, name):
    try:
        from PIL import Image
        with Image.open(io.BytesIO(raw)) as img:
            width, height = img.size
            fmt = img.format
        if fmt not in ('JPEG', 'PNG', 'WEBP'):
            raise ValueError(fmt)
    except Exception:  # noqa: BLE001
        raise InvalidFile(f"'{name}' buzuq yoki ochib bo'lmaydigan rasm. JPG, PNG yoki WEBP yuklang.") from None
    if width * height > MAX_IMAGE_PIXELS:
        raise InvalidFile("Rasm o'lchami juda katta. Kichikroq rasm (telefon skrinshoti yoki foto) yuklang.")
    return ReadResult(source='image', needs='image', raw=raw)
