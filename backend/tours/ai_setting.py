"""AI yordamchi sozlamasi (yengil modul: sozlamalar API'si shuni import qiladi): `Shop.business_profile['tour_ai']` = `on` | `off`.

Standart `off` (fail-closed: noma'lum qiymat ham `off`). `off` bo'lsa restoran videosining kadrlari HECH QACHON uchinchi tomonga
yuborilmaydi; qo'lda muharrir to'liq ishlaydi. Admin: /ra/ sozlamalari (settings API `tour_ai`). Eski usul o'chirilmaydi, faqat yoqiladi."""

TOUR_AI_CHOICES = ('on', 'off')
DEFAULT_TOUR_AI = 'off'


def normalize_tour_ai(value):
    value = str(value or '').strip().lower()
    return value if value in TOUR_AI_CHOICES else DEFAULT_TOUR_AI


def tour_ai_for_shop(shop):
    profile = getattr(shop, 'business_profile', None)
    return normalize_tour_ai(profile.get('tour_ai') if isinstance(profile, dict) else None)
