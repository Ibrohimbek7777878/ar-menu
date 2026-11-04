"""
Brend: logotip/favicon yuklash va biznes turi shablonini qo'llash (TZ_MULTITENANT, Bosqich 2).

    POST   /api/restaurant/admin/v1/brand/logo/          multipart: image (+ kind=logo|favicon) -> {kind, logo_url, favicon_url, brand}
    DELETE /api/restaurant/admin/v1/brand/logo/          JSON/so'rov: kind -> rasm olib tashlanadi (…_url: null)
    POST   /api/restaurant/admin/v1/brand/apply-preset/  {business_type} -> {brand, confirmation}

Ruxsat: `settings_admin`. Tenant xavfsiz: rasm faqat `staff_shop(request)` papkasiga (`brand/shop_<id>/…`) yoziladi, boshqa restoran
fayliga yo'l yo'q. Brend ma'lumoti (nom, ranglar, matnlar) `PATCH /settings/` orqali o'zgaradi.
"""
import copy

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from backend.api_input import InputError, RestoAdminAPIView, parse_choice
from backend.ratelimit import rate_limited
from orders.audit import log_audit
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION, capability
from shops.brand import (
    BUSINESS_PRESETS,
    BUSINESS_TYPES,
    apply_preset,
    brand_file_path,
    brand_of_shop,
    owns_brand_file,
)
from shops.brand_image import KINDS, BrandImageError, process_brand_image
from web.restaurant_auth import staff_shop

_PATH_KEY = {'logo': 'logo_path', 'favicon': 'favicon_path'}


def _urls(brand):
    return {'logo_url': brand['logo_url'], 'favicon_url': brand['favicon_url']}


def _locked_shop(request):
    """Joriy restoran, qatori qulflangan va eng so'nggi holatda (bir vaqtdagi yozuvlar `business_profile` ni bosib ketmasin)."""
    shop = staff_shop(request)
    if not shop:
        return None
    type(shop).objects.select_for_update().filter(pk=shop.pk).first()
    shop.refresh_from_db()
    return shop


def _delete_file_after_commit(path, shop_id):
    """Eski fayl (faqat shu restoranning brend papkasidagi) tranzaksiya muvaffaqiyatli tugagach o'chiriladi."""
    if not owns_brand_file(path, shop_id):
        return

    def _delete():
        try:
            default_storage.delete(path)
        except Exception:  # noqa: BLE001 — yetim fayl qolsa ham so'rov muvaffaqiyatli; saqlash tizimi xatosi sahifani yiqitmasin
            pass

    transaction.on_commit(_delete)


def _kind(request):
    raw = request.data.get('kind') if hasattr(request.data, 'get') else None
    if raw in (None, ''):
        raw = request.query_params.get('kind') or 'logo'
    return parse_choice(raw, 'kind', KINDS)


class BrandImageView(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('settings_admin')]

    def post(self, request):
        limited = rate_limited(request, 'brand_image', limit=30, seconds=3600)
        if limited is not None:
            return limited
        kind = _kind(request)
        upload = request.FILES.get('image')
        if upload is None:
            raise InputError("Rasm fayli yuborilmadi («image» maydoni)", 'image')
        try:
            data, extension, digest = process_brand_image(upload, kind)
        except BrandImageError as exc:
            raise InputError(str(exc), 'image') from None
        with transaction.atomic():
            shop = _locked_shop(request)
            if not shop:
                return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)
            path = brand_file_path(shop.pk, kind, digest, extension)
            if not default_storage.exists(path):
                default_storage.save(path, ContentFile(data))            # nom serverda yasalgan: begona yo'l bo'lishi mumkin emas
            profile = copy.deepcopy(shop.business_profile) if isinstance(shop.business_profile, dict) else {}
            brand = dict(profile.get('brand')) if isinstance(profile.get('brand'), dict) else {}
            old_path = brand.get(_PATH_KEY[kind])
            brand[_PATH_KEY[kind]] = path
            profile['brand'] = brand
            shop.business_profile = profile
            shop.save(update_fields=['business_profile'])
            if old_path and old_path != path:
                _delete_file_after_commit(old_path, shop.pk)             # eski fayl yangisi bilan almashadi
            log_audit('brand_image_updated', request=request, actor=request.user, target_type='shop', target_id=shop.pk,
                      new_value={'kind': kind, 'bytes': len(data)})
        brand_full = brand_of_shop(shop)
        return Response({'kind': kind, **_urls(brand_full), 'brand': brand_full})

    def delete(self, request):
        kind = _kind(request)
        with transaction.atomic():
            shop = _locked_shop(request)
            if not shop:
                return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)
            profile = copy.deepcopy(shop.business_profile) if isinstance(shop.business_profile, dict) else {}
            brand = dict(profile.get('brand')) if isinstance(profile.get('brand'), dict) else {}
            old_path = brand.pop(_PATH_KEY[kind], None)
            if old_path:
                if brand:
                    profile['brand'] = brand
                else:
                    profile.pop('brand', None)
                shop.business_profile = profile
                shop.save(update_fields=['business_profile'])
                _delete_file_after_commit(old_path, shop.pk)
                log_audit('brand_image_removed', request=request, actor=request.user, target_type='shop', target_id=shop.pk,
                          new_value={'kind': kind})
        brand_full = brand_of_shop(shop)
        return Response({'kind': kind, **_urls(brand_full), 'brand': brand_full})


class BrandApplyPresetView(RestoAdminAPIView):
    """Biznes turi shabloni: restoran / kafe / to'yxona. Atamalar (stol, mehmon, restoran) va bo'limlar standarti shablondan qo'llanadi;
    egasining shaxsiy atama/bo'lim o'zgartirishlari tozalanadi (`confirmation.previous` da oldingi qiymatlar qaytadi). Rang, logotip, matnlar tegilmaydi."""
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('settings_admin')]

    def post(self, request):
        business_type = parse_choice(request.data.get('business_type'), 'business_type', BUSINESS_TYPES)
        with transaction.atomic():
            shop = _locked_shop(request)
            if not shop:
                return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)
            old_type = shop.business_type
            profile, previous, applied = apply_preset(shop.business_profile, business_type)
            shop.business_profile = profile
            shop.business_type = business_type
            shop.save(update_fields=['business_profile', 'business_type'])
            log_audit('brand_preset_applied', request=request, actor=request.user, target_type='shop', target_id=shop.pk,
                      old_value={'business_type': old_type}, new_value={'business_type': business_type})
        return Response({
            'brand': brand_of_shop(shop),
            'confirmation': {
                'business_type': business_type,
                'label': BUSINESS_PRESETS[business_type]['label'],
                'previous_business_type': old_type,
                'applied': applied,
                'previous': previous,
            },
        })
