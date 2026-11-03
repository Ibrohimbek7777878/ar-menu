"""Mehmon menyusidagi taomning qisqa ma'lumotlari (taom oynasi va karta): rasmlar, vazn, tayyorlash vaqti, kaloriya, "Yangi", bo'lim turi,
shuningdek taom va bo'lim nomlari/tavsiflarining ruscha va inglizcha tarjimalari.

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


def _clean(value):
    return (value or '').strip()


def guest_dish_translations(product):
    """Taom nomi/tavsifining tarjimalari: `name_ru`, `name_en`, `desc_ru`, `desc_en`.

    Faqat to'ldirilganlari qaytariladi: bo'sh tarjima uchun kalit umuman yuborilmaydi (menyu javobi kattalashmasin),
    mehmon ilovasi bunda o'zbekcha `name` / `description` ni ko'rsatadi."""
    pairs = (
        ('name_ru', product.name_ru),
        ('name_en', product.name_en),
        ('desc_ru', product.description_ru),
        ('desc_en', product.description_en),
    )
    return {key: text for key, value in pairs if (text := _clean(value))}


def guest_category_translations(category):
    """Bo'lim nomining tarjimalari: `name_ru`, `name_en` (faqat to'ldirilgan va asosiy nomdan farq qilganlari).

    `Category.name_ru` majburiy maydon, shuning uchun u ko'pincha o'zbekcha nomning nusxasi bo'ladi: bunday "tarjima"
    mehmonga foyda bermaydi, faqat baytni oshiradi. Asosiy nom bilan (katta-kichik harfsiz) bir xil bo'lsa yuborilmaydi."""
    base = _clean(category.name).casefold()
    result = {}
    for key, value in (('name_ru', category.name_ru), ('name_en', category.name_en)):
        text = _clean(value)
        if text and text.casefold() != base:
            result[key] = text
    return result


def guest_dish_extras(product, new_cutoff=None):
    category = product.category
    return {
        **guest_dish_translations(product),
        'images': [f.url for f in (product.image, product.image2, product.image3, product.image4) if f],
        'weight': weight_label(product.weight_g),
        'prep_time': f'~{product.prep_minutes} daq' if product.prep_minutes else '',
        'calories': f'{product.calories} kkal' if product.calories else '',
        'is_new': bool(new_cutoff and product.created_at >= new_cutoff),
        'category_kind': category.effective_kind if category else 'other',
    }


def name_translations(product):
    """Faqat nom tarjimalari (`name_ru`, `name_en`): savat, buyurtma yozuvi va boshqa qisqa ro'yxatlar uchun."""
    return {key: value for key, value in guest_dish_translations(product).items() if key.startswith('name_')}


def product_name_translations(product_ids):
    """{taom ID: {'name_ru':.., 'name_en':..}} — BITTA so'rov (N+1 yo'q). Sessiyadagi savat va buyurtma yozuvlari taom
    nomini o'zbekcha saqlaydi; ruscha/inglizcha ko'rsatish uchun shu yerdan olinadi. Tarjimasi yo'q taomlar kiritilmaydi."""
    ids = {int(i) for i in product_ids if str(i).isdigit()}
    if not ids:
        return {}
    from products.models import Product
    result = {}
    for pid, name_ru, name_en in Product.objects.filter(pk__in=ids).values_list('pk', 'name_ru', 'name_en'):
        found = {key: text for key, text in (('name_ru', _clean(name_ru)), ('name_en', _clean(name_en))) if text}
        if found:
            result[pid] = found
    return result
