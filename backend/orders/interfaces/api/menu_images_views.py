"""
Menyu uchun internetdan namuna rasm topish va tanlash (TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md, 5-6 bandlar).

  GET  /api/restaurant/admin/v1/menu/image-search/?q=Palov        — litsenziyasi ochiq rasm variantlari
  POST /api/restaurant/admin/v1/menu/image-search/pick/           — tanlangan rasmni server yuklab oladi → image_token
  GET  /api/restaurant/admin/v1/menu/image-search/preview/<token>/ — token bo'yicha rasm (faqat shu restoran xodimiga)

Rasm hech qachon brauzerga "hotlink" qilinmaydi: server o'zi yuklaydi (SSRF-himoyali, `image_fetch`), Pillow bilan tekshiradi va
vaqtincha saqlaydi (`image_tokens`). Token taom yaratish/tahrirlashda (`image_token`) ishlatiladi.
"""
from django.http import HttpResponse
from django.urls import reverse
from rest_framework.negotiation import BaseContentNegotiation
from rest_framework.response import Response

from backend.api_input import InputError, RestoAdminAPIView, parse_text, query_text
from orders.interfaces.api.menu_admin import _error
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION, capability
from products.menu_import import image_tokens
from products.menu_import.image_fetch import RemoteImageError, fetch_remote_image
from products.menu_import.image_search import (
    PICK_RATE_LIMIT,
    ImageSearchError,
    ImageSearchRateLimited,
    build_credit,
    check_rate_limit,
    get_pick_record,
    search_images,
)
from web.restaurant_auth import staff_shop

PREVIEW_MAX_BYTES = 12 * 1024 * 1024


def _search_error(exc):
    response = _error(exc.message, exc.status, code=exc.code)
    if isinstance(exc, ImageSearchRateLimited):
        response['Retry-After'] = str(exc.retry_after)
    return response


class MenuImageSearchView(RestoAdminAPIView):
    """GET ?q=Palov → {"query_used": "plov pilaf", "results": [...]} (<= 12 ta, hammasi CC0/PDM/BY/BY-SA)."""
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return _error("Do'kon topilmadi.")
        query = query_text(request, 'q', max_length=500)       # uzunligini clean_query aniq xabar bilan tekshiradi
        try:
            return Response(search_images(query, shop.id))
        except ImageSearchError as exc:
            return _search_error(exc)


class MenuImagePickView(RestoAdminAPIView):
    """POST {id, full, title, creator, license, license_url, source_url} → {"image_token", "preview_url", "credit"}.

    Litsenziya, muallif va yuklanadigan manzil brauzerdan EMAS, qidiruv paytida serverda saqlangan yozuvdan olinadi:
    brauzer faqat natija `id` sini aytadi (qolgan maydonlar nusxa sifatida qabul qilinadi, `full` mos kelmasa rad etiladi)."""
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return _error("Do'kon topilmadi.")
        data = request.data
        result_id = parse_text(data.get('id'), 'id', max_length=100, required=True)
        claimed_full = parse_text(data.get('full'), 'full', max_length=1000) if 'full' in data else ''
        record = get_pick_record(result_id)
        if record is None:
            return _error("Bu rasm natijasi topilmadi yoki muddati o'tgan. Qidiruvni qaytadan bajaring.", 404, code='result_not_found')
        if claimed_full and claimed_full != record['full']:
            raise InputError("Rasm manzili qidiruv natijasiga mos kelmaydi. Qidiruvni qaytadan bajaring.", 'full')
        try:
            check_rate_limit('pick', shop.id, PICK_RATE_LIMIT)
            image_bytes = fetch_remote_image(record['full'])
        except ImageSearchError as exc:
            return _search_error(exc)
        except RemoteImageError as exc:
            return _error(exc.message, exc.status, code=exc.code, field='full')
        credit = build_credit(record.get('creator'), record['license'])
        try:
            token = image_tokens.store_temp_image(
                image_bytes, shop.id, credit=credit, source_url=record.get('source_url', ''), real_photo=False,
            )
        except image_tokens.TempImageError as exc:
            return _error(exc.message, 503 if exc.code == 'storage' else 422, code=exc.code, field='full')
        return Response({
            'image_token': token,
            'preview_url': reverse('menu_admin_image_preview', args=[token]),
            'credit': credit,
        })


class _AnyContentNegotiation(BaseContentNegotiation):
    """Rasm javobi: brauzer <img> so'rovidagi `Accept: image/avif,…` DRF'da 406 bermasin."""

    def select_parser(self, request, parsers):
        return parsers[0] if parsers else None

    def select_renderer(self, request, renderers, format_suffix=None):
        return renderers[0], renderers[0].media_type


class MenuImagePreviewView(RestoAdminAPIView):
    """GET → token bo'yicha vaqtincha rasm. Faqat tokenni yaratgan restoran xodimi ko'radi (begona restoran tokeni → 404)."""
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]
    content_negotiation_class = _AnyContentNegotiation

    def get(self, request, token):
        shop = staff_shop(request)
        if not shop:
            return _error("Do'kon topilmadi.")
        info = image_tokens.peek_temp_image(token, shop.id)
        body = None
        if info and info.get('path'):
            try:
                with open(info['path'], 'rb') as handle:
                    body = handle.read(PREVIEW_MAX_BYTES + 1)
            except OSError:
                body = None
        if not body or len(body) > PREVIEW_MAX_BYTES:
            return _error("Rasm topilmadi yoki muddati o'tgan (2 soat). Rasmni qaytadan tanlang.", 404, code='token_not_found')
        response = HttpResponse(body, content_type='image/jpeg')
        response['Cache-Control'] = 'private, max-age=300'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
