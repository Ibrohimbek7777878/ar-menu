"""
QR rasm generatsiyasi.
ECC=H (30% xatoni tuzatadi) — markazga logo qo'yish uchun SHART.
"""
import io
import logging
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from PIL import Image

log = logging.getLogger('tables.qr')

DPI = 300
QR_PX = 1200                 # 1200 px @300 DPI ≈ 10 sm
LOGO_RATIO = 0.22            # logo QR ning 22% i (ECC=H bunga bardosh beradi)


def _fit_logo(logo_path: str, qr_size: int) -> Image.Image | None:
    """Logo'ni QR markaziga sig'adigan qilib oq fon ustiga joylaydi."""
    try:
        logo = Image.open(logo_path).convert('RGBA')
    except Exception as e:
        log.warning(f'[qr] logo ochilmadi ({logo_path}): {e}')
        return None

    side = int(qr_size * LOGO_RATIO)
    logo.thumbnail((side, side), Image.LANCZOS)

    pad = int(side * 0.12)
    plate = Image.new('RGBA', (logo.width + pad * 2, logo.height + pad * 2),
                      (255, 255, 255, 255))
    plate.paste(logo, (pad, pad), logo)
    return plate


def make_qr_png(url: str, logo_path: str | None = None,
                size_px: int = QR_PX, rounded: bool = True) -> bytes:
    """
    QR PNG (300 DPI) qaytaradi.
    url       — https://menu.armenu.uz/t/<uuid>
    logo_path — restoran logotipi (ixtiyoriy)
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,   # ⚡ 30% — logo uchun
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    if rounded:
        img = qr.make_image(image_factory=StyledPilImage,
                            module_drawer=RoundedModuleDrawer()).convert('RGB')
    else:
        img = qr.make_image(fill_color='black', back_color='white').convert('RGB')

    img = img.resize((size_px, size_px), Image.NEAREST)

    if logo_path:
        plate = _fit_logo(logo_path, size_px)
        if plate is not None:
            pos = ((size_px - plate.width) // 2, (size_px - plate.height) // 2)
            img.paste(plate, pos, plate)

    buf = io.BytesIO()
    img.save(buf, format='PNG', dpi=(DPI, DPI), optimize=True)
    return buf.getvalue()


def make_qr_svg(url: str) -> bytes:
    """Vektor QR (bosmaxona uchun). Logo yo'q — vektorda ustiga qo'yilmaydi."""
    import qrcode.image.svg
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue()


def table_qr_png(table, rounded: bool = True) -> bytes:
    """Stol obyekti uchun QR (restoran logosi bilan)."""
    logo_path = None
    logo = getattr(table.restaurant, 'logo', None)
    if logo:
        try:
            logo_path = logo.path
        except Exception:
            logo_path = None
    return make_qr_png(table.qr_url, logo_path=logo_path, rounded=rounded)
