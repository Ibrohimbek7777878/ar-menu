"""Mehmon menyusidagi taomning qisqa ma'lumotlari (taom oynasi va karta): rasmlar, vazn, tayyorlash vaqti, kaloriya, "Yangi", bo'lim turi.

Avval server bularni yubormas edi: karta ostidagi "vaqt · vazn" qatori hech qachon ko'rinmas edi. Hammasi tayyor maydonlardan olinadi
(qo'shimcha SQL yo'q: bo'lim `select_related` bilan keladi). Menyu, AR va boshqa ro'yxatlar shu bitta funksiyadan foydalanadi.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone


def weight_label(weight_g):
    """350 -> '350 g', 1200 -> '1.2 kg'; ma'lumot yo'q bo'lsa ''."""
    if not weight_g or weight_g <= 0:
        return ''
    if weight_g >= 1000:
        kg = round(weight_g / 1000, 1)
        return f'{int(kg) if kg == int(kg) else kg} kg'
    return f'{weight_g} g'


def new_dish_cutoff(products):
    """"Yangi" belgisi chegarasi (oxirgi N kun). Menyu endi yaratilgan bo'lsa (hamma taom yangi) belgi umuman qo'yilmaydi:
    aks holda yangi restoranda har bir taom 2 hafta "Yangi" deb turardi."""
    days = int(getattr(settings, 'RESTAURANT_NEW_DISH_DAYS', 14) or 0)
    if days <= 0:
        return None
    cutoff = timezone.now() - timedelta(days=days)
    return cutoff if any(p.created_at < cutoff for p in products) else None


def guest_dish_extras(product, new_cutoff=None):
    category = product.category
    return {
        'images': [f.url for f in (product.image, product.image2, product.image3, product.image4) if f],
        'weight': weight_label(product.weight_g),
        'prep_time': f'~{product.prep_minutes} daq' if product.prep_minutes else '',
        'calories': f'{product.calories} kkal' if product.calories else '',
        'is_new': bool(new_cutoff and product.created_at >= new_cutoff),
        'category_kind': category.effective_kind if category else 'other',
    }
