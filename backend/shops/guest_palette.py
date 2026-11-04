"""Ranglar palitrasi (restoran sozlamasi `Shop.business_profile['guest_palette']`, admin: /ra/settings -> "Ranglar" va "Brend").

Qiymatlar: `classic` (STANDART: yashil + krem + serif sarlavha — eski saytdagi dizayn, egasi 2026-11-03 tanlagan), `orange`
(apelsin — oldingi palitra, o'chirilmagan, muqobil) va `custom` (restoran egasi o'z rangini tanlaydi: tokenlar serverda hisoblanadi,
`shops/brand_color.py`, inline `<style id="brand-vars">`). Noma'lum yoki buzuq qiymat saytni buzmaydi: `classic`.
Brend (`Shop.business_profile['brand']`) palitrani ALOHIDA saqlamaydi: `brand.palette` shu kalit (yagona manba).
Palitra `<html data-palette>` orqali ishlaydi (mehmon sayti, /ra/ paneli va kirish sahifasi bir xil). Dizayn tartibi (`guest_design`:
new/classic) bundan ALOHIDA: palitra faqat ranglar va sarlavha shrifti.
"""

PALETTE_CHOICES = ('classic', 'orange', 'custom')
DEFAULT_PALETTE = 'classic'


def normalize_palette(value):
    value = str(value or '').strip().lower()
    return value if value in PALETTE_CHOICES else DEFAULT_PALETTE
