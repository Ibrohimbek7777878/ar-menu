"""
Restoran Menyu Boshqaruvi REST API (Menu Admin API).
Faqat restoran boshqaruvchilari (super_admin, shop_owner, shop_manager) uchun ruxsat etilgan.
Ofitsiant, oshpaz va hostess rollariga taqiqlangan (403 Forbidden).
Barcha amallar qat'iy tenant isolation (IDOR himoyasi) va AuditLog bilan bajariladi.
"""
from uuid import uuid4

from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.upload_validation import validate_uploaded_file
from categories.models import Category
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from products.models import Product
from web.restaurant_auth import staff_shop


def _serialize_product(p):
    """Mahsulotni to'liq va xavfsiz JSON ko'rinishida formatlash."""
    return {
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'description': p.description or '',
        'price': int(p.price) if p.price is not None else 0,
        'old_price': int(p.old_price) if p.old_price else None,
        'category': {
            'id': p.category.id,
            'name': p.category.name,
        } if p.category else None,
        'category_id': p.category_id,
        'image': p.image.url if p.image else None,
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


class MenuProductListCreateView(APIView):
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
            return Response({'detail': "Do'kon topilmadi."}, status=status.HTTP_400_BAD_REQUEST)

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

        q = request.GET.get('q', '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))

        category_id = request.GET.get('category')
        if category_id:
            try:
                qs = qs.filter(category_id=int(category_id))
            except (ValueError, TypeError):
                pass

        ordering = request.GET.get('ordering', '-id')
        allowed_orderings = ('id', '-id', 'name', '-name', 'price', '-price', 'created_at', '-created_at')
        if ordering not in allowed_orderings:
            ordering = '-id'
        qs = qs.select_related('category').order_by(ordering)

        page_number = request.GET.get('page', 1)
        page_size = min(int(request.GET.get('page_size', 30)), 100)
        paginator = Paginator(qs, page_size)

        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages) if paginator.num_pages > 0 else []

        results = [_serialize_product(p) for p in page_obj]

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': int(page_number) if paginator.num_pages > 0 else 1,
            'results': results,
        })

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'detail': "Do'kon topilmadi."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        name = (data.get('name') or '').strip()
        if not name:
            return Response({'detail': "Taom nomi kiritilishi shart."}, status=status.HTTP_400_BAD_REQUEST)

        raw_price = data.get('price')
        if raw_price is None or raw_price == '':
            return Response({'detail': "Taom narxi kiritilishi shart."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            price = int(float(raw_price))
            if price < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'detail': "Taom narxi musbat butun son bo'lishi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        old_price = None
        if data.get('old_price'):
            try:
                old_price = int(float(data.get('old_price')))
            except (ValueError, TypeError):
                pass

        category = None
        category_id = data.get('category_id') or data.get('category')
        if category_id:
            try:
                category = Category.objects.filter(pk=int(category_id)).first()
            except (ValueError, TypeError):
                pass

        prep_minutes = None
        if data.get('prep_minutes') is not None and str(data.get('prep_minutes')).strip() != '':
            try:
                prep_minutes = max(0, int(data.get('prep_minutes')))
            except (ValueError, TypeError):
                pass

        cook_min = prep_minutes if prep_minutes is not None else 15
        if data.get('cook_min') is not None and str(data.get('cook_min')).strip() != '':
            try:
                cook_min = max(0, int(data.get('cook_min')))
            except (ValueError, TypeError):
                pass

        has_real_photo = False
        image_file = request.FILES.get('image')
        if image_file:
            err = validate_uploaded_file(image_file)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            has_real_photo = True

        is_available = True
        if 'is_available' in data:
            val = str(data.get('is_available')).lower()
            is_available = val in ('true', '1', 'yes')

        allergens = data.get('allergens', [])
        if isinstance(allergens, str):
            allergens = [a.strip() for a in allergens.split(',') if a.strip()]

        diet_tags = data.get('diet_tags', [])
        if isinstance(diet_tags, str):
            diet_tags = [d.strip() for d in diet_tags.split(',') if d.strip()]

        ar_model = (data.get('ar_model') or '').strip() or None
        has_3d = bool(ar_model or data.get('has_3d'))

        with transaction.atomic():
            product = Product(
                shop=shop,
                name=name,
                price=price,
                old_price=old_price,
                category=category,
                description=(data.get('description') or '').strip(),
                prep_minutes=prep_minutes,
                cook_min=cook_min,
                is_available=is_available,
                has_real_photo=has_real_photo,
                allergens=allergens,
                diet_tags=diet_tags,
                ar_model=ar_model,
                has_3d=has_3d,
            )
            if image_file:
                product.image = image_file
            product.save()

            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                new_value={'action': 'create', 'name': product.name, 'price': price},
            )

        return Response(_serialize_product(product), status=status.HTTP_201_CREATED)


class MenuProductDetailView(APIView):
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
            return Response({'detail': "Taom topilmadi yoki unga ruxsatingiz yo'q."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        old_val = {'name': product.name, 'price': int(product.price), 'is_available': product.is_available}

        if 'name' in data:
            name = (data.get('name') or '').strip()
            if not name:
                return Response({'detail': "Taom nomi bo'sh bo'lishi mumkin emas."}, status=status.HTTP_400_BAD_REQUEST)
            product.name = name

        if 'price' in data:
            try:
                price = int(float(data.get('price')))
                if price < 0:
                    raise ValueError
                if price != product.price:
                    product.old_price = product.price
                    product.price = price
            except (ValueError, TypeError):
                return Response({'detail': "Taom narxi musbat butun son bo'lishi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        if 'old_price' in data:
            val = data.get('old_price')
            if val is None or val == '':
                product.old_price = None
            else:
                try:
                    product.old_price = int(float(val))
                except (ValueError, TypeError):
                    pass

        if 'description' in data:
            product.description = (data.get('description') or '').strip()

        if 'category_id' in data or 'category' in data:
            cat_id = data.get('category_id') if 'category_id' in data else data.get('category')
            if cat_id in (None, '', 'null'):
                product.category = None
            else:
                try:
                    product.category = Category.objects.filter(pk=int(cat_id)).first()
                except (ValueError, TypeError):
                    pass

        if 'prep_minutes' in data:
            val = data.get('prep_minutes')
            if val in (None, '', 'null'):
                product.prep_minutes = None
            else:
                try:
                    product.prep_minutes = max(0, int(val))
                except (ValueError, TypeError):
                    pass

        if 'cook_min' in data:
            val = data.get('cook_min')
            if val is not None and str(val).strip() != '':
                try:
                    product.cook_min = max(0, int(val))
                except (ValueError, TypeError):
                    pass

        if 'is_available' in data:
            val = str(data.get('is_available')).lower()
            product.is_available = val in ('true', '1', 'yes')

        if 'is_featured' in data:
            val = str(data.get('is_featured')).lower()
            product.is_featured = val in ('true', '1', 'yes')

        if 'allergens' in data:
            allergens = data.get('allergens')
            if isinstance(allergens, str):
                allergens = [a.strip() for a in allergens.split(',') if a.strip()]
            product.allergens = allergens

        if 'diet_tags' in data:
            diet_tags = data.get('diet_tags')
            if isinstance(diet_tags, str):
                diet_tags = [d.strip() for d in diet_tags.split(',') if d.strip()]
            product.diet_tags = diet_tags

        if 'ar_model' in data:
            val = (data.get('ar_model') or '').strip() or None
            product.ar_model = val
            if val:
                product.has_3d = True

        if 'has_3d' in data:
            val = str(data.get('has_3d')).lower()
            product.has_3d = val in ('true', '1', 'yes')

        image_file = request.FILES.get('image')
        if image_file:
            err = validate_uploaded_file(image_file)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            product.image = image_file
            product.has_real_photo = True

        with transaction.atomic():
            product.save()
            log_audit(
                'stock_change',
                request=request,
                actor=request.user,
                target_type='product',
                target_id=product.id,
                old_value=old_val,
                new_value={'action': 'update', 'name': product.name, 'price': int(product.price), 'is_available': product.is_available},
            )

        return Response(_serialize_product(product), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        product = self._get_product(request, pk)
        if not product:
            return Response({'detail': "Taom topilmadi yoki unga ruxsatingiz yo'q."}, status=status.HTTP_404_NOT_FOUND)

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


class MenuProductDuplicateView(APIView):
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
                name=f"{product.name} (nusxa)",
                price=product.price,
                old_price=product.old_price,
                description=product.description,
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


class MenuProductFeatureView(APIView):
    """
    POST /api/restaurant/admin/v1/menu/products/<pk>/feature/ — Taomni tavsiya etilgan (is_featured) qilish/bekor qilish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        product = get_object_or_404(Product.all_objects, pk=pk, shop=shop)

        val = request.data.get('value', True)
        if isinstance(val, str):
            val = val.lower() in ('true', '1', 'yes')
        product.is_featured = bool(val)
        product.save(update_fields=['is_featured'])

        return Response({'success': True, 'id': product.id, 'is_featured': product.is_featured}, status=status.HTTP_200_OK)


class MenuProductRestoreView(APIView):
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


class MenuCategoryListCreateView(APIView):
    """
    GET /api/restaurant/admin/v1/menu/categories/ — Kategoriyalar ro'yxatini olish.
    POST /api/restaurant/admin/v1/menu/categories/ — Yangi restoran kategoriyasi yaratish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def get(self, request):
        shop = staff_shop(request)
        qs = Category.objects.filter(is_active=True)
        if shop:
            qs = qs.filter(Q(is_restaurant=True) | Q(products__shop=shop)).distinct()
        else:
            qs = qs.filter(is_restaurant=True)

        categories = qs.order_by('sort_order', 'name')
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
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': "Kategoriya nomi kiritilishi shart."}, status=status.HTTP_400_BAD_REQUEST)

        category = Category.objects.create(
            name=name,
            is_restaurant=True,
            is_active=True,
        )
        return Response({
            'id': category.id,
            'name': category.name,
            'slug': getattr(category, 'slug', None) or f"cat-{category.id}",
            'is_restaurant': category.is_restaurant,
        }, status=status.HTTP_201_CREATED)

