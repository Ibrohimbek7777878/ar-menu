"""
Restoran Menyu Boshqaruvi REST API (Menu Admin API).
Faqat restoran boshqaruvchilari (super_admin, shop_owner, shop_manager) uchun ruxsat etilgan.
Ofitsiant, oshpaz va hostess rollariga taqiqlangan (403 Forbidden).
Barcha amallar qat'iy tenant isolation (IDOR himoyasi) va AuditLog bilan bajariladi.
"""
from collections import namedtuple
from uuid import uuid4

from django.core.files.base import ContentFile
from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from backend.api_input import (
    InputError,
    RestoAdminAPIView,
    parse_bool,
    parse_id,
    parse_int,
    parse_text,
    query_id,
    query_int,
    query_text,
)
from backend.upload_validation import validate_uploaded_file
from categories.models import Category
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from products.ar_validation import ArModelError, validate_ar_model_ref
from products.menu_import import image_tokens
from products.models import Product
from web.restaurant_auth import staff_shop

PRICE_MAX = 999_999_999_999        # Product.price: max_digits=12, decimal_places=0
NAME_MAX = 200                     # Product.name / Category.name uzunligi
DESCRIPTION_MAX = 5000
LIST_ITEM_MAX = 50                 # allergen / diet tag uzunligi
LIST_ITEMS_MAX = 30
IMAGE_TOKEN_MAX = 128               # image_tokens: 32 belgi; ortiqchasi shubhali kirish
# Mehmon menyusi tarjimalari (ixtiyoriy; bo'sh bo'lsa mehmon o'zbekcha nom/tavsifni ko'radi): (maydon, xabardagi nomi, chegara)
TRANSLATION_FIELDS = (
    ('name_ru', 'Ruscha nom', NAME_MAX),
    ('name_en', 'Inglizcha nom', NAME_MAX),
    ('description_ru', 'Ruscha tavsif', DESCRIPTION_MAX),
    ('description_en', 'Inglizcha tavsif', DESCRIPTION_MAX),
)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST, **extra):
    """Menyu API javobi: frontend `error` ni, eski mijozlar `detail` ni o'qiydi — ikkalasi ham beriladi."""
    return Response({'error': message, 'detail': message, **extra}, status=status_code)


def _visible_categories(shop):
    """Do'kon ko'ra oladigan va mahsulotga bog'lay oladigan kategoriyalar: `Category.shop` bo'yicha (categories/scoping.py).
    Tenant rejimida faqat shu restoranniki; oddiy rejimda egasiz eski bo'limlar ham avvalgidek."""
    from categories.scoping import categories_for_shop
    return categories_for_shop(shop, Category.objects.filter(is_active=True))


def _clean_category(shop, value, field='category_id'):
    """Kategoriya id → obyekt; None/''/'null' → None (bog'lanish olib tashlanadi). Ko'rinmaydigan/yo'q kategoriya — 400."""
    if value is None or (isinstance(value, str) and value.strip().lower() in ('', 'null', 'none')):
        return None
    cat_id = parse_id(value, field, allow_none=False)
    category = _visible_categories(shop).filter(pk=cat_id).first()
    if category is None:
        raise InputError("Kategoriya topilmadi yoki sizga ruxsat etilmagan", field)
    return category


def _clean_price(value, field='price', allow_none=False):
    if allow_none and (value is None or (isinstance(value, str) and not value.strip())):
        return None
    try:
        return parse_int(value, field, minimum=0, maximum=PRICE_MAX)
    except InputError:
        raise InputError(f"Narx 0 dan {PRICE_MAX} gacha butun son bo'lishi kerak", field) from None


def _clean_minutes(value, field, allow_none=True):
    if value is None or (isinstance(value, str) and value.strip().lower() in ('', 'null')):
        if allow_none:
            return None
        raise InputError(f"«{field}» kiritilishi shart", field)
    return parse_int(value, field, minimum=0, maximum=32767)


def _clean_tags(value, field):
    """Vergul bilan ajratilgan matn yoki matnlar ro'yxati → tozalangan ro'yxat."""
    if value is None:
        return []
    if isinstance(value, str):
        value = [part for part in value.split(',')]
    if not isinstance(value, (list, tuple)):
        raise InputError(f"«{field}» ro'yxat yoki vergul bilan ajratilgan matn bo'lishi kerak", field)
    cleaned = []
    for item in value:
        text = parse_text(item, field, max_length=LIST_ITEM_MAX)
        if text and text not in cleaned:
            cleaned.append(text)
    if len(cleaned) > LIST_ITEMS_MAX:
        raise InputError(f"«{field}» da {LIST_ITEMS_MAX} tadan ortiq element bo'lishi mumkin emas", field)
    return cleaned


def _clean_ar_model(value):
    """3D/AR model manzili: bo'sh → None, aks holda xavfsiz havola (kengaytma, sxema, host, hajm tekshiriladi)."""
    text = parse_text(value, 'ar_model', max_length=200)
    try:
        return validate_ar_model_ref(text)
    except ArModelError as exc:
        raise InputError(str(exc), 'ar_model') from None


def _clean_translations(data):
    """Tarjima maydonlari: faqat so'rovda kelganlari (PATCH'da kelmaganiga tegilmaydi); bo'sh qiymat tarjimani tozalaydi.

    Xato xabarida xom maydon nomi («name_ru») o'rniga odam tilidagi nom chiqadi; `field` esa o'zgarmaydi."""
    cleaned = {}
    for field, label, limit in TRANSLATION_FIELDS:
        if field not in data:
            continue
        try:
            cleaned[field] = parse_text(data.get(field), field, max_length=limit)
        except InputError as exc:
            message = str(exc.detail.get('error', '')).replace(f'«{field}»', label)
            raise InputError(message, field) from None
    return cleaned


_TokenPhoto = namedtuple('_TokenPhoto', 'file real_photo credit source_url')
_IMAGE_TOKEN_EXPIRED = "Rasm tokeni yaroqsiz, muddati o'tgan (2 soat), allaqachon ishlatilgan yoki boshqa restoranniki. Rasmni qaytadan tanlang."


def _clean_image_token(data, shop):
    """`image_token` (ixtiyoriy): bo'sh → None; mavjud, shu restoranniki va muddati o'tmagan bo'lsa token, aks holda 400 `image_token`.
    Bu faqat tekshiruv — token hali ISTE'MOL QILINMAYDI (taom saqlanishidan oldin boshqa maydon xato bersa token yonib ketmasin)."""
    if 'image_token' not in data:
        return None
    token = parse_text(data.get('image_token'), 'image_token', max_length=IMAGE_TOKEN_MAX)
    if not token:
        return None
    if image_tokens.peek_temp_image(token, shop.id) is None:
        raise InputError(_IMAGE_TOKEN_EXPIRED, 'image_token')
    return token


def _take_image_token(token, shop):
    """Tokenni bir martalik iste'mol qiladi → rasm fayli va manba ma'lumoti.
    O'z rasmi (`real_photo`) bo'lsa kredit/manba bo'sh; internetdan olingan bo'lsa kredit va manba havolasi saqlanadi."""
    taken = image_tokens.consume_temp_image(token, shop.id)
    content = taken and (taken.get('bytes') or taken.get('data'))
    if not content:
        raise InputError(_IMAGE_TOKEN_EXPIRED, 'image_token')
    real_photo = bool(taken.get('real_photo', True))
    return _TokenPhoto(
        file=ContentFile(content, name=f'{uuid4().hex}.jpg'),
        real_photo=real_photo,
        credit='' if real_photo else str(taken.get('credit') or '')[:255],
        source_url='' if real_photo else str(taken.get('source_url') or '')[:500],
    )


def _serialize_product(p):
    """Mahsulotni to'liq va xavfsiz JSON ko'rinishida formatlash."""
    return {
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'description': p.description or '',
        'name_ru': p.name_ru or '',
        'name_en': p.name_en or '',
        'description_ru': p.description_ru or '',
        'description_en': p.description_en or '',
        'price': int(p.price) if p.price is not None else 0,
        'old_price': int(p.old_price) if p.old_price else None,
        'category': {
            'id': p.category.id,
            'name': p.category.name,
        } if p.category else None,
        'category_id': p.category_id,
        'image': p.image.url if p.image else None,
        'image_credit': p.image_credit or '',
        'image_source_url': p.image_source_url or '',
        'ar_model': p.ar_model or None,
        'has_3d': bool(p.has_3d),
        'is_available': bool(p.is_available),
        'prep_minutes': p.prep_minutes,
        'cook_min': p.cook_min,
        'has_real_photo': bool(p.has_real_photo),
        'is_featured': bool(p.is_featured),
        'is_deleted': bool(p.is_deleted),
        'allergens': p.allergens or [],
        'diet_tags': p.diet_tags or [],
        'stock': p.stock,
    }


class MenuProductListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/menu/products/ — Menyu taomlarini olish (filtrlash, qidirish, paginatsiya).
    POST /api/restaurant/admin/v1/menu/products/ — Yangi taom qo'shish (multipart/form-data yoki JSON).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return _error("Do'kon topilmadi.")

        status_filter = request.GET.get('status', 'all').lower()
        if status_filter == 'hidden':
            qs = Product.all_objects.filter(shop=shop, is_deleted=True)
        else:
            qs = Product.objects.filter(shop=shop)
            if status_filter == 'on':
                qs = qs.filter(is_available=True)
            elif status_filter == 'off':
                qs = qs.filter(is_available=False)
            elif status_filter == 'nophoto':
                qs = qs.filter(has_real_photo=False)

        q = query_text(request, 'q')
        if q:
            qs = qs.filter(
                Q(name__icontains=q) | Q(description__icontains=q) | Q(name_ru__icontains=q) | Q(name_en__icontains=q)
            )

        category_id = query_id(request, 'category')
        if category_id:
            qs = qs.filter(category_id=category_id)

        ordering = request.GET.get('ordering', '-id')
        allowed_orderings = ('id', '-id', 'name', '-name', 'price', '-price', 'created_at', '-created_at')
        if ordering not in allowed_orderings:
            ordering = '-id'
        qs = qs.select_related('category').order_by(ordering)

        page_number = query_int(request, 'page', 1, 1, 1_000_000)
        page_size = query_int(request, 'page_size', 30, 1, 100)
        paginator = Paginator(qs, page_size)

        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)

        results = [_serialize_product(p) for p in page_obj]
        curr_page = page_obj.number

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': curr_page,
            'results': results,
            # TZ 3.3 standart formati:
            'items': results,
            'page': curr_page,
            'page_size': page_size,
            'total': paginator.count,
            'has_next': curr_page < paginator.num_pages,
        })

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return _error("Do'kon topilmadi.")

        data = request.data
        name = parse_text(data.get('name'), 'name', max_length=NAME_MAX, required=True)
        if data.get('price') is None or data.get('price') == '':
            raise InputError("Taom narxi kiritilishi shart.", 'price')
        price = _clean_price(data.get('price'))
        old_price = _clean_price(data.get('old_price'), 'old_price', allow_none=True) if 'old_price' in data else None
        category = _clean_category(shop, data.get('category_id') if 'category_id' in data else data.get('category'))
        prep_minutes = _clean_minutes(data.get('prep_minutes'), 'prep_minutes') if 'prep_minutes' in data else None
        cook_min = prep_minutes if prep_minutes is not None else 15
        if 'cook_min' in data and data.get('cook_min') not in (None, ''):
            cook_min = _clean_minutes(data.get('cook_min'), 'cook_min', allow_none=False)
        description = parse_text(data.get('description'), 'description', max_length=DESCRIPTION_MAX)
        translations = _clean_translations(data)
        filled_translations = sorted(field for field, value in translations.items() if value)
        translation_audit = {'translations': filled_translations} if filled_translations else {}
        is_available = parse_bool(data.get('is_available'), 'is_available') if 'is_available' in data else True
        allergens = _clean_tags(data.get('allergens'), 'allergens') if 'allergens' in data else []
        diet_tags = _clean_tags(data.get('diet_tags'), 'diet_tags') if 'diet_tags' in data else []
        ar_model = _clean_ar_model(data.get('ar_model')) if 'ar_model' in data else None
        has_3d = bool(ar_model) or (parse_bool(data.get('has_3d'), 'has_3d') if 'has_3d' in data else False)

        has_real_photo = False
        image_token = _clean_image_token(data, shop)
        image_file = request.FILES.get('image')
        if image_file and image_token:
            raise InputError("Rasm faylini ham, image_token ni ham bir vaqtda yuborib bo'lmaydi — bittasini tanlang", 'image_token')
        if image_file:
            err = validate_uploaded_file(image_file)
            if err:
                return _error(err)
            has_real_photo = True

        with transaction.atomic():
            photo = _take_image_token(image_token, shop) if image_token else None
            if photo:
                has_real_photo = photo.real_photo
            product = Product(
                shop=shop,
                name=name,
                price=price,
                old_price=old_price,
                category=category,
                description=description,
                **translations,
                prep_minutes=prep_minutes,
                cook_min=cook_min,
                is_available=is_available,
                has_real_photo=has_real_photo,
                allergens=allergens,
                diet_tags=diet_tags,
                ar_model=ar_model,
                has_3d=has_3d,
                image_credit=photo.credit if photo else '',
                image_source_url=photo.source_url if photo else '',
            )
            if photo:
                product.image = photo.file
            elif image_file:
                product.image = image_file
            product.save()

            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                new_value={'action': 'create', 'name': product.name, 'price': price, **translation_audit,
                           **({'image': 'own' if photo.real_photo else 'internet'} if photo else {})},
            )

        return Response(_serialize_product(product), status=status.HTTP_201_CREATED)


class MenuProductDetailView(RestoAdminAPIView):
    """
    PATCH /api/restaurant/admin/v1/menu/products/<pk>/ — Taomni tahrirlash (IDOR himoyasi bilan).
    DELETE /api/restaurant/admin/v1/menu/products/<pk>/ — Taomni yumshoq o'chirish (Soft delete).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_product(self, request, pk):
        shop = staff_shop(request)
        if not shop:
            return None
        return Product.all_objects.filter(pk=pk, shop=shop).select_related('category').first()

    def patch(self, request, pk):
        product = self._get_product(request, pk)
        if not product:
            return _error("Taom topilmadi yoki unga ruxsatingiz yo'q.", status.HTTP_404_NOT_FOUND)

        data = request.data
        old_val = {'name': product.name, 'price': int(product.price), 'is_available': product.is_available}

        shop = product.shop
        if 'name' in data:
            product.name = parse_text(data.get('name'), 'name', max_length=NAME_MAX, required=True)

        if 'price' in data:
            price = _clean_price(data.get('price'))
            if price != product.price:
                product.old_price = product.price
                product.price = price

        if 'old_price' in data:
            product.old_price = _clean_price(data.get('old_price'), 'old_price', allow_none=True)

        if 'description' in data:
            product.description = parse_text(data.get('description'), 'description', max_length=DESCRIPTION_MAX)

        changed_translations = []
        for field, value in _clean_translations(data).items():
            if getattr(product, field) != value:
                setattr(product, field, value)
                changed_translations.append(field)

        if 'category_id' in data or 'category' in data:
            product.category = _clean_category(shop, data.get('category_id') if 'category_id' in data else data.get('category'))

        if 'prep_minutes' in data:
            product.prep_minutes = _clean_minutes(data.get('prep_minutes'), 'prep_minutes')

        if 'cook_min' in data and data.get('cook_min') not in (None, ''):
            product.cook_min = _clean_minutes(data.get('cook_min'), 'cook_min', allow_none=False)

        if 'is_available' in data:
            product.is_available = parse_bool(data.get('is_available'), 'is_available')

        if 'is_featured' in data:
            product.is_featured = parse_bool(data.get('is_featured'), 'is_featured')

        if 'allergens' in data:
            product.allergens = _clean_tags(data.get('allergens'), 'allergens')

        if 'diet_tags' in data:
            product.diet_tags = _clean_tags(data.get('diet_tags'), 'diet_tags')

        if 'ar_model' in data:
            val = _clean_ar_model(data.get('ar_model'))
            product.ar_model = val
            if val:
                product.has_3d = True

        if 'has_3d' in data:
            product.has_3d = parse_bool(data.get('has_3d'), 'has_3d')

        image_token = _clean_image_token(data, shop)
        image_file = request.FILES.get('image')
        if image_file and image_token:
            raise InputError("Rasm faylini ham, image_token ni ham bir vaqtda yuborib bo'lmaydi — bittasini tanlang", 'image_token')
        if image_file:
            err = validate_uploaded_file(image_file)
            if err:
                return _error(err)
            product.image = image_file
            product.has_real_photo = True
            product.image_credit = ''           # haqiqiy rasm yuklandi: internetdan olingan namuna kredit/manbasi endi yolg'on bo'lardi
            product.image_source_url = ''

        with transaction.atomic():
            photo = _take_image_token(image_token, shop) if image_token else None
            if photo:
                product.image = photo.file
                product.has_real_photo = photo.real_photo
                product.image_credit = photo.credit
                product.image_source_url = photo.source_url
            product.save()
            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                old_value=old_val,
                new_value={
                    'action': 'update', 'name': product.name, 'price': int(product.price), 'is_available': product.is_available,
                    **({'translations_changed': changed_translations} if changed_translations else {}),
                    **({'image': 'own' if photo.real_photo else 'internet'} if photo else {}),
                },
            )

        return Response(_serialize_product(product), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        product = self._get_product(request, pk)
        if not product:
            return _error("Taom topilmadi yoki unga ruxsatingiz yo'q.", status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            product.delete()  # Soft delete: is_deleted=True, is_available=False
            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                new_value={'action': 'soft_delete'},
            )

        return Response({'success': True, 'message': "Taom o'chirildi (arxivlandi)."}, status=status.HTTP_200_OK)


class MenuProductDuplicateView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/menu/products/<pk>/duplicate/ — Taomdan nusxa olish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        product = get_object_or_404(Product.all_objects, pk=pk, shop=shop)

        with transaction.atomic():
            new_product = Product(
                shop=shop,
                name=f"{product.name[:NAME_MAX - 8]} (nusxa)",
                price=product.price,
                old_price=product.old_price,
                description=product.description,
                name_ru=product.name_ru,
                name_en=product.name_en,
                description_ru=product.description_ru,
                description_en=product.description_en,
                category=product.category,
                image=product.image,
                image2=product.image2,
                image3=product.image3,
                image4=product.image4,
                ar_model=product.ar_model,
                has_3d=product.has_3d,
                prep_minutes=product.prep_minutes,
                cook_min=product.cook_min,
                has_real_photo=product.has_real_photo,
                image_credit=product.image_credit,          # nusxa ham xuddi shu rasmni ishlatadi: muallif ko'rsatilishi yo'qolmasin
                image_source_url=product.image_source_url,
                allergens=list(product.allergens or []),
                diet_tags=list(product.diet_tags or []),
                is_available=True,
            )
            new_product.save()

            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=new_product.id,
                new_value={'action': 'duplicate', 'original_id': product.id, 'new_name': new_product.name},
            )

        return Response(_serialize_product(new_product), status=status.HTTP_201_CREATED)


class MenuProductFeatureView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/menu/products/<pk>/feature/ — Taomni tavsiya etilgan (is_featured) qilish/bekor qilish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        product = get_object_or_404(Product.all_objects, pk=pk, shop=shop)

        product.is_featured = parse_bool(request.data.get('value', True), 'value')
        product.save(update_fields=['is_featured'])

        return Response({'success': True, 'id': product.id, 'is_featured': product.is_featured}, status=status.HTTP_200_OK)


class MenuProductAvailabilityView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/menu/products/<pk>/availability/
    Stop-list (TZ 4.3, R5-1): taom tugadi yoki qaytdi.
    Body: {"available": true|false} (yoki berilmasa toggle)
    Ruxsat: stoplist yoki menu_admin
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('stoplist')]

    def post(self, request, pk):
        shop = staff_shop(request)
        product = get_object_or_404(Product.all_objects, pk=pk, shop=shop)

        val = request.data.get('available')
        if val is None:
            val = not product.is_available
        else:
            val = parse_bool(val, 'available')

        with transaction.atomic():
            product.is_available = bool(val)
            product.save(update_fields=['is_available'])

            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                new_value={'action': 'stoplist', 'product': product.name, 'is_available': product.is_available},
            )

        return Response({
            'success': True,
            'id': product.id,
            'name': product.name,
            'is_available': product.is_available,
        }, status=status.HTTP_200_OK)


class MenuProductRestoreView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/menu/products/<pk>/restore/ — Soft-deleted taomni qayta tiklash.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        product = get_object_or_404(Product.all_objects, pk=pk, shop=shop)

        with transaction.atomic():
            product.restore()
            product.is_available = True
            product.save(update_fields=['is_available'])

            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                new_value={'action': 'restore'},
            )

        return Response({'success': True, 'message': "Taom qayta tiklandi."}, status=status.HTTP_200_OK)


class MenuCategoryListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/menu/categories/ — Kategoriyalar ro'yxatini olish.
    POST /api/restaurant/admin/v1/menu/categories/ — Yangi restoran kategoriyasi yaratish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def get(self, request):
        shop = staff_shop(request)
        categories = _visible_categories(shop).order_by('sort_order', 'name')
        data = [
            {
                'id': c.id,
                'name': c.name,
                'slug': getattr(c, 'slug', None) or f"cat-{c.id}",
                'is_restaurant': getattr(c, 'is_restaurant', False),
            }
            for c in categories
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = parse_text(request.data.get('name'), 'name', max_length=100, required=True)
        shop = staff_shop(request)
        if shop is None:
            return _error("Restoran topilmadi", status.HTTP_404_NOT_FOUND)

        # Bo'lim restoranniki (boshqa restoran nomini ko'rmaydi ham, ifloslantirmaydi ham): shu restoranda bir xil nomli faol
        # bo'lim bo'lsa yangisi yaratilmaydi
        existing = _visible_categories(shop).filter(is_restaurant=True, name__iexact=name).order_by('id').first()
        created = existing is None
        category = existing or Category.objects.create(shop=shop, name=name, is_restaurant=True, is_active=True)
        return Response({
            'id': category.id,
            'name': category.name,
            'slug': getattr(category, 'slug', None) or f"cat-{category.id}",
            'is_restaurant': category.is_restaurant,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
