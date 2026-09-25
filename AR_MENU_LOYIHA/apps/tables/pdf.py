"""
Bosmaga tayyor QR PDF.
Layoutlar: a4_1 | a4_2 | a4_4 | a4_6 | stand (10×15 sm stol standi)
Har kartada: logo · STOL № (KATTA) · QR · 3 tilda ko'rsatma.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from django.conf import settings

from apps.tables.qr import make_qr_png

# Kirill + lotin qo'llab-quvvatlaydigan shrift
FONT_DIR = settings.BASE_DIR / 'static' / 'fonts'
FONT_REG, FONT_BOLD = 'ARMenu', 'ARMenu-Bold'
_fonts_ready = False


def _ensure_fonts():
    global _fonts_ready
    if _fonts_ready:
        return
    try:
        pdfmetrics.registerFont(TTFont(FONT_REG, str(FONT_DIR / 'DejaVuSans.ttf')))
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_DIR / 'DejaVuSans-Bold.ttf')))
    except Exception:
        # zaxira — Helvetica (kirill yo'q, lekin PDF buzilmaydi)
        globals()['FONT_REG'] = 'Helvetica'
        globals()['FONT_BOLD'] = 'Helvetica-Bold'
    _fonts_ready = True


# layout → (ustun, qator)
LAYOUTS = {
    'a4_1': (1, 1),
    'a4_2': (1, 2),
    'a4_4': (2, 2),
    'a4_6': (2, 3),
}

HINT = {
    'uz': 'QR kodni skanerlang — menyu va AR',
    'ru': 'Отсканируйте QR — меню и AR',
    'en': 'Scan the QR — menu and AR',
}
TABLE_WORD = {'uz': 'STOL', 'ru': 'СТОЛ', 'en': 'TABLE'}


def _draw_card(c, table, x, y, w, h, logo_reader):
    """Bitta stol kartasini chizadi (x,y — chap-past burchak)."""
    pad = 6 * mm

    # Ramka (kesish chizig'i)
    c.setStrokeColorRGB(.82, .82, .85)
    c.setLineWidth(.4)
    c.setDash(2, 3)
    c.rect(x, y, w, h)
    c.setDash()

    cy = y + h - pad

    # Logo
    if logo_reader is not None:
        lh = min(14 * mm, h * 0.10)
        try:
            iw, ih = logo_reader.getSize()
            lw = lh * (iw / ih)
            c.drawImage(logo_reader, x + (w - lw) / 2, cy - lh,
                        lw, lh, mask='auto')
            cy -= lh + 3 * mm
        except Exception:
            pass

    # Restoran nomi
    c.setFont(FONT_REG, min(11, h / 24 / mm))
    c.setFillColorRGB(.35, .35, .40)
    c.drawCentredString(x + w / 2, cy - 4 * mm, table.restaurant.name[:38])
    cy -= 9 * mm

    # STOL № — KATTA ⚡
    num_size = max(26, min(64, h / 7 / mm * 2))
    c.setFont(FONT_BOLD, num_size)
    c.setFillColorRGB(.06, .06, .10)
    c.drawCentredString(x + w / 2, cy - num_size * 0.75,
                        f'{TABLE_WORD["uz"]} {table.number}')
    cy -= num_size * 0.75 + 5 * mm

    # QR — qolgan joyning eng kattasi (matnlarga joy qoldirib)
    text_block = 16 * mm
    qr_side = min(w - pad * 2, cy - y - text_block - pad)
    if qr_side > 10 * mm:
        png = make_qr_png(table.qr_url, logo_path=None, size_px=1200, rounded=False)
        c.drawImage(ImageReader(io.BytesIO(png)),
                    x + (w - qr_side) / 2, cy - qr_side, qr_side, qr_side)
        cy -= qr_side + 4 * mm

    # 3 tilda ko'rsatma
    c.setFont(FONT_REG, min(9, w / 30 / mm * 2))
    c.setFillColorRGB(.42, .42, .48)
    for lang in ('uz', 'ru', 'en'):
        c.drawCentredString(x + w / 2, cy, HINT[lang])
        cy -= 4.2 * mm


def build_qr_pdf(tables, layout: str = 'a4_6') -> bytes:
    """
    tables — Table queryset/ro'yxat (restaurant select_related bo'lsin).
    layout — LAYOUTS kaliti yoki 'stand'.
    """
    _ensure_fonts()
    buf = io.BytesIO()

    if layout == 'stand':
        page = (100 * mm, 150 * mm)
        c = canvas.Canvas(buf, pagesize=page)
        logo_reader = _logo_reader(tables)
        for t in tables:
            _draw_card(c, t, 0, 0, page[0], page[1], logo_reader)
            c.showPage()
        c.save()
        return buf.getvalue()

    cols, rows = LAYOUTS.get(layout, LAYOUTS['a4_6'])
    pw, ph = A4
    margin = 10 * mm
    cw = (pw - margin * 2) / cols
    ch = (ph - margin * 2) / rows

    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle('ARMENU — QR kodlar')
    logo_reader = _logo_reader(tables)

    per_page = cols * rows
    for i, t in enumerate(tables):
        slot = i % per_page
        if slot == 0 and i:
            c.showPage()
        col = slot % cols
        row = slot // cols
        x = margin + col * cw
        y = ph - margin - (row + 1) * ch
        _draw_card(c, t, x, y, cw, ch, logo_reader)

    c.showPage()
    c.save()
    return buf.getvalue()


def _logo_reader(tables):
    for t in tables:
        logo = getattr(t.restaurant, 'logo', None)
        if logo:
            try:
                return ImageReader(logo.path)
            except Exception:
                return None
        return None
    return None
