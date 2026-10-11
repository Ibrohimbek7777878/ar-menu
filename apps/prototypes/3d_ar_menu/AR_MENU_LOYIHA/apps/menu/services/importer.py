"""
⚡ Excel/CSV dan menyu import. Restoranlar 100-300 ta taomni qo'lda kiritmasin.
Ustunlar (sarlavha qatori majburiy):
  kategoriya | nomi | nomi_ru | nomi_en | tavsif | narx | og'irlik |
  pishirish_daqiqa | kaloriya | allergenlar | diyeta | ikpu
"""
import csv
import io
import logging
from decimal import Decimal, InvalidOperation
from django.db import transaction
from apps.menu.models import Category, Dish

log = logging.getLogger('menu.importer')

COLUMNS = {
    'kategoriya': 'category', 'категория': 'category', 'category': 'category',
    'nomi': 'name_uz', 'название': 'name_uz', 'name': 'name_uz',
    'nomi_ru': 'name_ru', 'название_ru': 'name_ru', 'name_ru': 'name_ru',
    'nomi_en': 'name_en', 'name_en': 'name_en',
    'tavsif': 'desc_uz', 'описание': 'desc_uz', 'desc': 'desc_uz',
    'tavsif_ru': 'desc_ru', 'tavsif_en': 'desc_en',
    'narx': 'price', 'цена': 'price', 'price': 'price',
    "og'irlik": 'weight_g', 'вес': 'weight_g', 'weight': 'weight_g',
    'pishirish_daqiqa': 'cook_min', 'время': 'cook_min', 'cook_min': 'cook_min',
    'kaloriya': 'calories', 'калории': 'calories', 'calories': 'calories',
    'allergenlar': 'allergens', 'аллергены': 'allergens', 'allergens': 'allergens',
    'diyeta': 'diet_tags', 'диета': 'diet_tags', 'diet': 'diet_tags',
    'ikpu': 'ikpu_code', 'икпу': 'ikpu_code',
}

REQUIRED = {'category', 'name_uz', 'price'}
MAX_ROWS = 2000


def _rows_from_csv(fileobj):
    fileobj.seek(0)
    raw = fileobj.read()
    text = raw.decode('utf-8-sig') if isinstance(raw, bytes) else raw
    dialect = csv.Sniffer().sniff(text[:2000], delimiters=',;\t') \
        if len(text) > 20 else csv.excel
    return list(csv.reader(io.StringIO(text), dialect))


def _rows_from_xlsx(fileobj):
    from openpyxl import load_workbook
    fileobj.seek(0)
    wb = load_workbook(fileobj, read_only=True, data_only=True)
    ws = wb.active
    return [[('' if c is None else c) for c in row]
            for row in ws.iter_rows(values_only=True)]


def _num(v, cast=Decimal, default=None):
    if v in ('', None):
        return default
    try:
        s = str(v).replace(' ', '').replace(',', '.').replace('\xa0', '')
        return cast(s)
    except (InvalidOperation, ValueError, TypeError):
        return default


def _list(v):
    if not v:
        return []
    return [x.strip().lower() for x in str(v).replace(';', ',').split(',') if x.strip()]


def parse_file(fileobj, filename: str) -> tuple:
    """Qaytadi: (rows: list[dict], errors: list[str])"""
    ext = filename.lower().rsplit('.', 1)[-1]
    if ext in ('xlsx', 'xlsm'):
        raw = _rows_from_xlsx(fileobj)
    elif ext == 'csv':
        raw = _rows_from_csv(fileobj)
    else:
        return [], [f'Qo\'llab-quvvatlanmaydigan format: .{ext} (xlsx yoki csv kerak)']

    if not raw:
        return [], ['Fayl bo\'sh']

    header = [COLUMNS.get(str(h).strip().lower(), None) for h in raw[0]]
    have = {h for h in header if h}
    missing = REQUIRED - have
    if missing:
        return [], [f'Majburiy ustunlar yo\'q: {", ".join(sorted(missing))}']

    rows, errors = [], []
    for i, line in enumerate(raw[1:MAX_ROWS + 1], start=2):
        item = {}
        for col, val in zip(header, line):
            if col:
                item[col] = val
        if not item.get('name_uz') or not str(item.get('name_uz')).strip():
            continue
        price = _num(item.get('price'))
        if price is None or price < 0:
            errors.append(f'{i}-qator: narx noto\'g\'ri ({item.get("price")})')
            continue
        item['price'] = price
        item['weight_g'] = _num(item.get('weight_g'), int)
        item['cook_min'] = _num(item.get('cook_min'), int, 15)
        item['calories'] = _num(item.get('calories'), int)
        item['allergens'] = _list(item.get('allergens'))
        item['diet_tags'] = _list(item.get('diet_tags'))
        item['_row'] = i
        rows.append(item)

    return rows, errors


@transaction.atomic
def import_menu(restaurant, rows, update_existing=True) -> dict:
    """
    ⚡ Bitta transaksiya — yarim import bo'lmasin.
    Bir xil nom bo'lsa: update_existing=True → narx yangilanadi.
    """
    created_c = created_d = updated_d = 0
    cat_cache = {c.name_uz.strip().lower(): c
                 for c in Category.objects.filter(restaurant=restaurant)}

    for row in rows:
        cname = str(row.pop('category', '')).strip()
        key = cname.lower()
        cat = cat_cache.get(key)
        if cat is None:
            cat = Category.objects.create(restaurant=restaurant,
                                          name_uz=cname or 'Boshqa',
                                          order=len(cat_cache) + 1)
            cat_cache[key] = cat
            created_c += 1

        row.pop('_row', None)
        name = str(row['name_uz']).strip()[:200]
        row['name_uz'] = name
        for f in ('name_ru', 'name_en', 'desc_uz', 'desc_ru', 'desc_en', 'ikpu_code'):
            if f in row:
                row[f] = str(row[f] or '').strip()

        existing = Dish.objects.filter(restaurant=restaurant,
                                       name_uz__iexact=name).first()
        if existing and update_existing:
            for k, v in row.items():
                if v not in (None, ''):
                    setattr(existing, k, v)
            existing.category = cat
            existing.save()
            updated_d += 1
        elif existing:
            continue
        else:
            Dish.objects.create(restaurant=restaurant, category=cat, **row)
            created_d += 1

    log.info(f'[import] rest#{restaurant.id}: +{created_c} kat, '
             f'+{created_d} taom, ~{updated_d} yangilandi')
    return {'categories_created': created_c, 'dishes_created': created_d,
            'dishes_updated': updated_d}
