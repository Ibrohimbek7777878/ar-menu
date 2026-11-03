"""Ranglar palitrasi (restoran sozlamasi `Shop.business_profile['guest_palette']`, admin: /ra/settings -> "Ranglar").

Qiymatlar: `classic` (STANDART: yashil + krem + serif sarlavha — eski saytdagi dizayn, egasi 2026-11-03 tanlagan) va `orange`
(apelsin — oldingi palitra, o'chirilmagan, muqobil). Noma'lum yoki buzuq qiymat saytni buzmaydi: `classic`.
Palitra `<html data-palette>` orqali ishlaydi (mehmon sayti, /ra/ paneli va kirish sahifasi bir xil). Dizayn tartibi (`guest_design`:
new/classic) bundan ALOHIDA: palitra faqat ranglar va sarlavha shrifti.
"""

PALETTE_CHOICES = ('classic', 'orange')
DEFAULT_PALETTE = 'classic'


def normalize_palette(value):
    value = str(value or '').strip().lower()
    return value if value in PALETTE_CHOICES else DEFAULT_PALETTE
