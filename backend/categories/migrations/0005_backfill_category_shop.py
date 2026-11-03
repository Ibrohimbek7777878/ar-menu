# Mavjud bo'limlarni egasiga bog'lash (TZ_MULTITENANT Bosqich 0). Ma'lumot YO'QOLMAYDI, hech narsa o'chirilmaydi:
#   * bo'lim faqat bitta restoran taomlarida ishlatilgan  -> o'sha restoranniki;
#   * bir nechta restoran taomlarida ishlatilgan          -> eng ko'p taomi bor restoranda asl yozuv qoladi, qolgan har
#                                                            restoran uchun ALOHIDA NUSXA yaratiladi va uning taomlari nusxaga ko'chiriladi;
#   * hech qaysi taomda ishlatilmagan                      -> Shop.category orqali bog'langan do'kon, bo'lmasa asosiy restoran
#                                                            (AppSetting 'restaurant_default_shop' slug'i, so'ng stollari bor do'kon, so'ng birinchi do'kon).
#   * ota bo'lim (parent) boshqa restoranniki bo'lib qolsa  -> ota bo'limning shu restoran uchun nusxasi yaratiladi.
# Faqat `shop IS NULL` qatorlarga tegiladi: qayta ishga tushirish xavfsiz. Do'kon umuman yo'q bo'lsa hech narsa qilinmaydi.
# Orqaga qaytarish: hech narsa qilmaydi (nusxalar qoladi, `shop` ustuni 0004 ni qaytarganda olib tashlanadi) — ma'lumot yo'qolmaydi.
# PostgreSQL: bo'limlar soni kichik (o'nlab-yuzlab), taomlar `(category, shop)` bo'yicha bitta UPDATE bilan ko'chadi; hammasi bitta tranzaksiyada.
from django.db import migrations

COPY_FIELDS = ('name', 'name_uz', 'name_ru', 'name_en', 'icon', 'color', 'image', 'sort_order', 'is_active',
               'is_restaurant', 'kind')


def _default_shop_id(apps):
    Shop = apps.get_model('shops', 'Shop')
    slug = ''
    try:
        AppSetting = apps.get_model('notifications', 'AppSetting')
        slug = (AppSetting.objects.filter(key='restaurant_default_shop').values_list('value', flat=True).first() or '').strip()
    except LookupError:
        pass
    if slug:
        pk = Shop.objects.filter(slug=slug).values_list('pk', flat=True).first()
        if pk:
            return pk
    try:
        Table = apps.get_model('tables_restaurant', 'Table')
        pk = Table.objects.order_by('shop_id').values_list('shop_id', flat=True).first()
        if pk:
            return pk
    except LookupError:
        pass
    return Shop.objects.order_by('pk').values_list('pk', flat=True).first()


def backfill(apps, schema_editor):
    Category = apps.get_model('categories', 'Category')
    Product = apps.get_model('products', 'Product')
    Shop = apps.get_model('shops', 'Shop')
    if not Shop.objects.exists():
        return
    default_id = _default_shop_id(apps)

    def ensure_copy(cat, shop_id, copies):
        """`cat` ning `shop_id` restorani uchun nusxasi (yo'q bo'lsa yaratiladi; ota zanjiri ham shu restoranga olinadi)."""
        if cat.shop_id == shop_id:
            return cat
        key = (cat.pk, shop_id)
        if key not in copies:
            parent = ensure_copy(cat.parent, shop_id, copies) if cat.parent_id else None
            values = {f: getattr(cat, f) for f in COPY_FIELDS}
            values['image'] = cat.image.name if cat.image else None          # fayl nomi nusxalanadi (faylning o'zi emas)
            copies[key] = Category.objects.create(shop_id=shop_id, parent=parent, **values)
        return copies[key]

    copies = {}
    owners = {}
    for cat in Category.objects.filter(shop__isnull=True).select_related('parent').order_by('pk'):
        counts = {}
        for shop_id in Product.objects.filter(category_id=cat.pk).values_list('shop_id', flat=True):
            counts[shop_id] = counts.get(shop_id, 0) + 1
        if counts:
            ordered = sorted(counts, key=lambda sid: (-counts[sid], sid))
        else:
            via_shop = Shop.objects.filter(category_id=cat.pk).order_by('pk').values_list('pk', flat=True).first()
            ordered = [via_shop or default_id]
        owners[cat.pk] = ordered
        cat.shop_id = ordered[0]
        cat.save(update_fields=['shop'])

    # Boshqa restoran taomlari uchun nusxalar va taomlarni ko'chirish
    for cat_id, ordered in owners.items():
        for shop_id in ordered[1:]:
            cat = Category.objects.select_related('parent').get(pk=cat_id)
            copy = ensure_copy(cat, shop_id, copies)
            Product.objects.filter(category_id=cat_id, shop_id=shop_id).update(category_id=copy.pk)

    # Ota-bola turli restoranniki bo'lib qolgan bo'limlar: ota bo'limning shu restoran uchun nusxasiga ulanadi
    for cat in Category.objects.filter(parent__isnull=False).select_related('parent'):
        if cat.shop_id and cat.parent.shop_id and cat.parent.shop_id != cat.shop_id:
            cat.parent_id = ensure_copy(cat.parent, cat.shop_id, copies).pk
            cat.save(update_fields=['parent'])


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0004_category_shop'),
        ('shops', '0019_backfill_shop_subdomain'),
        ('products', '0020_product_image_credit_import_batch'),
        ('notifications', '0006_soft_delete'),
        ('tables_restaurant', '0006_reservation_codes_and_arrived'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
