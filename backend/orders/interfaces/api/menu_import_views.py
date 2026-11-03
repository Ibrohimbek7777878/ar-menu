"""
Menyuni ommaviy kiritish API (fayl / matn / rasm -> ko'rib chiqish jadvali -> tasdiqlash -> qaytarish).

  POST /api/restaurant/admin/v1/menu/import/parse/   multipart: `file` YOKI `text` (JSON ham mumkin: {"text": "..."})
  POST /api/restaurant/admin/v1/menu/import/commit/  JSON: {submission_id, rows:[...]}
  POST /api/restaurant/admin/v1/menu/import/undo/    JSON: {batch_id}
  POST /api/restaurant/admin/v1/menu/import/photo/   multipart: `image` -> {image_token, preview_url} (qatorga o'z rasmini biriktirish)

TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md
Ruxsat `menu_admin` (egasi/boshqaruvchi), faqat o'z restorani. Xato javoblari: {error, detail, code, ...} — TZ dagi kodlar bilan.
Mantiq `products/menu_import/service.py` da; bu yerda faqat HTTP qatlam.
"""
import logging

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from backend.api_input import RestoAdminAPIView
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION, capability
from products.menu_import import service
from products.menu_import.errors import MenuImportError
from web.restaurant_auth import staff_shop

logger = logging.getLogger(__name__)


def _error_response(exc):
    body = {'error': exc.message, 'detail': exc.message, 'code': exc.code, **exc.extra}
    response = Response(body, status=exc.status)
    retry_after = exc.extra.get('retry_after')
    if retry_after:
        response['Retry-After'] = str(retry_after)
    return response


class _MenuImportView(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def run(self, request, action):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': "Do'kon topilmadi.", 'detail': "Do'kon topilmadi.", 'code': 'no_shop'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            return Response(action(shop), status=status.HTTP_200_OK)
        except MenuImportError as exc:
            return _error_response(exc)


class MenuImportParseView(_MenuImportView):
    """Fayl (txt/csv/xlsx/docx/pdf/rasm) yoki joylangan matn -> qatorlar (bazaga YOZILMAYDI)."""

    def post(self, request):
        upload = request.FILES.get('file')
        text = request.data.get('text')
        if text is not None and not isinstance(text, str):
            text = ''          # ro'yxat/son/obyekt -> servis "matn bo'sh" deydi (500 emas)
        return self.run(request, lambda shop: service.parse_request(shop, file=upload, text=text))


class MenuImportCommitView(_MenuImportView):
    """Tasdiqlangan qatorlarni bitta tranzaksiyada yozish (idempotent: `submission_id`)."""

    def post(self, request):
        data = request.data
        payload = {'submission_id': data.get('submission_id'), 'rows': data.get('rows')} if hasattr(data, 'get') else data
        return self.run(request, lambda shop: service.commit_batch(shop, payload, request=request, actor=request.user))


class MenuImportUndoView(_MenuImportView):
    """Oxirgi importni qaytarish: shu partiyada yaratilgan taomlar arxivlanadi (o'chirilmaydi)."""

    def post(self, request):
        return self.run(request, lambda shop: service.undo_batch(
            shop, {'batch_id': request.data.get('batch_id')}, request=request, actor=request.user))


class MenuImportPhotoView(_MenuImportView):
    """Qatorga o'z rasmini biriktirish: rasm vaqtincha saqlanadi (tekshiriladi, EXIF olinadi, <= 1600 px) va token qaytadi.
    Token `commit` yoki taom POST/PATCH ichida bir marta ishlatiladi (2 soat amal qiladi, faqat shu restoran)."""

    MAX_BYTES = 10 * 1024 * 1024

    def post(self, request):
        from django.urls import reverse
        from products.menu_import import image_tokens

        shop = staff_shop(request)
        if not shop:
            return Response({'error': "Do'kon topilmadi.", 'detail': "Do'kon topilmadi.", 'code': 'no_shop'},
                            status=status.HTTP_400_BAD_REQUEST)
        upload = request.FILES.get('image')
        if upload is None:
            msg = "Rasm tanlanmadi."
            return Response({'error': msg, 'detail': msg, 'code': 'invalid_request', 'field': 'image'}, status=status.HTTP_400_BAD_REQUEST)
        if (upload.size or 0) > self.MAX_BYTES:
            msg = "Rasm hajmi 10 MB dan oshmasligi kerak."
            return Response({'error': msg, 'detail': msg, 'code': 'file_too_large', 'field': 'image'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        try:
            token = image_tokens.store_temp_image(upload.read(), shop.pk, real_photo=True)
        except image_tokens.TempImageError as exc:
            return Response({'error': exc.message, 'detail': exc.message, 'code': exc.code, 'field': 'image'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'image_token': token, 'preview_url': reverse('menu_admin_image_preview', args=[token])})
