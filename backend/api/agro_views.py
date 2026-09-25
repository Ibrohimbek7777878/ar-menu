"""
Agro & Food Fast Onboarding Views — Oziq-ovqat va Dehqonchilik Mahsulotlarini Tezkor Kiritish API.
Faqat Oziq-ovqat va Qishloq xo'jaligi (sabzavot, meva, go'sht, sut, don) mahsulotlari uchun.
"""
from decimal import Decimal
import uuid
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from django.db import transaction
from django.db.models import Q
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products.models import Product, AgroMasterProduct, AgroStarterPack, AgroStarterPackItem
from shops.models import Shop
from categories.models import Category


def _get_seller_shop(request, shop_id):
    """Xavfsiz do'kon tekshiruvi (faqat o'z do'koni)."""
    shop = get_object_or_404(Shop, id=shop_id)
    # Agar AdminUser bo'lsa, egasini tekshirish (demo rejimda ruxsat beriladi)
    return shop


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_agro_starter_packs(request):
    """GET /api/v1/flutter/seller/agro/starter-packs/
    Barcha tayyor boshlang'ich to'plamlar ro'yxati (Sabzavot, Meva, Go'sht, Sut, Don, Oziq-ovqat).
    """
    packs = AgroStarterPack.objects.filter(is_active=True).prefetch_related('items__master_product')
    res = []
    for p in packs:
        items_data = []
        for item in p.items.all():
            mp = item.master_product
            items_data.append({
                'master_id': mp.id,
                'name': mp.name,
                'name_uz': mp.name_uz,
                'sector': mp.sector,
                'unit': mp.unit,
                'suggested_price': float(item.suggested_price),
                'default_stock': float(item.default_stock),
                'image_url': mp.image_url or (mp.image.url if mp.image else ''),
            })
        res.append({
            'id': p.id,
            'name': p.name,
            'sector': p.sector,
            'description': p.description,
            'icon': p.icon,
            'items_count': len(items_data),
            'items': items_data,
        })
    return Response(res)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_agro_apply_starter_pack(request):
    """POST /api/v1/flutter/seller/agro/starter-packs/apply/
    Body: { pack_id: int, shop_id: int }
    Tanlangan to'plamdagi barcha tovarlarni 1 soniyada sotuvchi do'koniga nusxalash.
    """
    pack_id = request.data.get('pack_id')
    shop_id = request.data.get('shop_id')
    if not pack_id or not shop_id:
        return Response({'error': 'pack_id va shop_id kiritilishi shart'}, status=status.HTTP_400_BAD_REQUEST)

    pack = get_object_or_404(AgroStarterPack, id=pack_id)
    shop = _get_seller_shop(request, shop_id)

    items = pack.items.select_related('master_product', 'master_product__category').all()
    if not items.exists():
        return Response({'error': 'To\'plamda mahsulotlar mavjud emas'}, status=status.HTTP_400_BAD_REQUEST)

    created_count = 0
    with transaction.atomic():
        for item in items:
            mp = item.master_product
            base_slug = slugify(mp.name, allow_unicode=True) or f"agro-{mp.id}"
            new_slug = f"{base_slug}-{shop.id}-{str(uuid.uuid4())[:6]}"
            while Product.objects.filter(slug=new_slug).exists():
                new_slug = f"{base_slug}-{shop.id}-{str(uuid.uuid4())[:6]}"

            Product.objects.create(
                shop=shop,
                name=mp.name,
                slug=new_slug,
                description=f"{mp.name} — yangi va tabiiy sifat kafolati.",
                price=item.suggested_price,
                unit=mp.unit,
                stock=int(item.default_stock),
                is_available=True,
                is_organic=mp.is_organic,
                is_halal=True,
                category=mp.category or shop.category,
                barcode=mp.barcode or '',
                ikpu_code=mp.ikpu_code or '',
            )
            created_count += 1

    return Response({
        'message': f"'{pack.name}' to'plamidan {created_count} ta mahsulot do'koningizga muvaffaqiyatli yuklandi!",
        'created_count': created_count,
        'shop_id': shop.id,
        'pack_id': pack.id,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_agro_master_search(request):
    """GET /api/v1/flutter/seller/agro/master-search/
    Query: q (nomi), sector (sabzavot, meva, go'sht...), barcode (shtrix-kod).
    """
    q = request.GET.get('q', '').strip()
    sector = request.GET.get('sector', '').strip()
    barcode = request.GET.get('barcode', '').strip()

    qs = AgroMasterProduct.objects.all()

    if barcode:
        qs = qs.filter(barcode=barcode)
    elif q:
        qs = qs.filter(Q(name__icontains=q) | Q(name_uz__icontains=q) | Q(name_ru__icontains=q))

    if sector:
        qs = qs.filter(sector=sector)

    results = []
    for mp in qs[:50]:
        results.append({
            'id': mp.id,
            'name': mp.name,
            'name_uz': mp.name_uz,
            'sector': mp.sector,
            'unit': mp.unit,
            'default_price': float(mp.default_market_price),
            'barcode': mp.barcode,
            'ikpu_code': mp.ikpu_code,
            'image_url': mp.image_url or (mp.image.url if mp.image else ''),
            'is_seasonal': mp.is_seasonal,
            'is_organic': mp.is_organic,
        })

    return Response(results)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_agro_claim_product(request):
    """POST /api/v1/flutter/seller/agro/claim-product/
    Body: { master_product_id: int, shop_id: int, price?: float, stock?: float }
    Master katalogdagi 1 ta tovar asosida do'konga darhol tovar qo'shish.
    """
    master_id = request.data.get('master_product_id')
    shop_id = request.data.get('shop_id')
    if not master_id or not shop_id:
        return Response({'error': 'master_product_id va shop_id kiritilishi shart'}, status=status.HTTP_400_BAD_REQUEST)

    mp = get_object_or_404(AgroMasterProduct, id=master_id)
    shop = _get_seller_shop(request, shop_id)

    price = Decimal(str(request.data.get('price') or mp.default_market_price))
    stock = int(request.data.get('stock') or (50 if mp.unit != 'dona' else 30))

    base_slug = slugify(mp.name, allow_unicode=True) or f"agro-{mp.id}"
    new_slug = f"{base_slug}-{shop.id}-{str(uuid.uuid4())[:6]}"
    while Product.objects.filter(slug=new_slug).exists():
        new_slug = f"{base_slug}-{shop.id}-{str(uuid.uuid4())[:6]}"

    product = Product.objects.create(
        shop=shop,
        name=mp.name,
        slug=new_slug,
        description=f"{mp.name} — Guliston bozori yangi mahsuloti.",
        price=price,
        unit=mp.unit,
        stock=stock,
        is_available=True,
        is_organic=mp.is_organic,
        is_halal=True,
        category=mp.category or shop.category,
        barcode=mp.barcode or '',
        ikpu_code=mp.ikpu_code or '',
    )

    return Response({
        'message': f"'{product.name}' do'koningizga qo'shildi!",
        'product_id': product.id,
        'name': product.name,
        'price': float(product.price),
        'unit': product.unit,
        'stock': product.stock,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_agro_quick_price_update(request):
    """POST /api/v1/flutter/seller/agro/quick-price-update/
    Body: { shop_id: int, updates: [ { product_id: int, price: float, stock?: float, is_available?: bool } ] }
    Dehqon bozorida kunlik narxlarni 1 daqiqada ommaviy yangilash.
    """
    shop_id = request.data.get('shop_id')
    updates = request.data.get('updates', [])
    if not shop_id or not updates:
        return Response({'error': 'shop_id va updates ro\'yxati kiritilishi shart'}, status=status.HTTP_400_BAD_REQUEST)

    shop = _get_seller_shop(request, shop_id)
    updated_count = 0

    with transaction.atomic():
        for item in updates:
            pid = item.get('product_id')
            if not pid:
                continue
            product = Product.objects.filter(id=pid, shop=shop).first()
            if not product:
                continue

            if 'price' in item and item['price'] is not None:
                product.price = Decimal(str(item['price']))
            if 'stock' in item and item['stock'] is not None:
                product.stock = int(item['stock'])
            if 'is_available' in item and item['is_available'] is not None:
                product.is_available = bool(item['is_available'])

            product.save(update_fields=['price', 'stock', 'is_available'])
            updated_count += 1

    return Response({
        'message': f"{updated_count} ta mahsulot narxi va qoldig'i yangilandi!",
        'updated_count': updated_count,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_agro_bulk_grid_save(request):
    """POST /api/v1/flutter/seller/agro/bulk-grid-save/
    Body: { shop_id: int, products: [ { name: str, price: float, stock: int, unit?: str, sector?: str } ] }
    Excel kabi jadvaldan ketma-ket kiritilgan tovarlarni bitta so'rovda saqlash.
    """
    shop_id = request.data.get('shop_id')
    products_data = request.data.get('products', [])
    if not shop_id or not products_data:
        return Response({'error': 'shop_id va products ro\'yxati majburiy'}, status=status.HTTP_400_BAD_REQUEST)

    shop = _get_seller_shop(request, shop_id)
    created_count = 0

    with transaction.atomic():
        for pdata in products_data:
            name = pdata.get('name', '').strip()
            if not name:
                continue
            price = Decimal(str(pdata.get('price', 0)))
            stock = int(pdata.get('stock', 50))
            unit = pdata.get('unit', 'kg')

            base_slug = slugify(name, allow_unicode=True) or "product"
            new_slug = f"{base_slug}-{shop.id}-{str(uuid.uuid4())[:6]}"
            while Product.objects.filter(slug=new_slug).exists():
                new_slug = f"{base_slug}-{shop.id}-{str(uuid.uuid4())[:6]}"

            Product.objects.create(
                shop=shop,
                name=name,
                slug=new_slug,
                description=f"{name} — toza va sifatli mahsulot.",
                price=price,
                unit=unit,
                stock=stock,
                is_available=True,
                category=shop.category,
            )
            created_count += 1

    return Response({
        'message': f"{created_count} ta mahsulot muvaffaqiyatli saqlandi!",
        'created_count': created_count,
    }, status=status.HTTP_201_CREATED)
