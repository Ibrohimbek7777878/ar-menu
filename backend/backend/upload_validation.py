"""
Yuklangan fayllarni markaziy tekshirish (TZ: R1-6, R-SEC-17).

Avval hech qanday tekshiruv yo'q edi: istalgan kengaytma, istalgan hajm, soxta kontent. Media fayllar Django'ning
o'z origin'idan beriladi, shuning uchun SVG/HTML yuklash saqlanadigan XSS (stored XSS) ga, juda katta fayl esa diskni
to'ldirishga (DoS) olib kelardi.

Bitta middleware barcha multipart yuklashlarni (hozirgi va kelajakdagi view'lar) tekshiradi:
  • kengaytma ruxsat ro'yxatida bo'lishi shart (SVG/HTML/JS/PHP/EXE va boshqalar rad etiladi);
  • hajm turiga qarab cheklanadi (settings.UPLOAD_MAX_IMAGE_MB / _MODEL_MB / _VIDEO_MB);
  • fayl imzosi (magic bytes) kengaytmaga mos bo'lishi shart — `evil.html` ni `x.jpg` deb nomlab bo'lmaydi;
  • rasmlar Pillow bilan ochib ko'riladi va piksel soni cheklanadi (dekompressiya bombasi).
"""
import os

from django.conf import settings
from django.contrib import messages
from django.http import HttpResponseRedirect, JsonResponse
from django.utils.deprecation import MiddlewareMixin

IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'}
MODEL_EXTS = {'glb', 'usdz', 'stl', 'obj', 'step', 'stp'}
VIDEO_EXTS = {'mp4', 'webm', 'mov'}
DATA_EXTS = {'csv'}

MAX_IMAGE_PIXELS = 40_000_000      # ≈ 6300×6300; undan kattasi dekompressiya bombasi deb olinadi
MAX_DATA_MB = 5


def _ext(name: str) -> str:
    return os.path.splitext(name or '')[1].lstrip('.').lower()


def _head(uploaded, n=16) -> bytes:
    uploaded.seek(0)
    data = uploaded.read(n)
    uploaded.seek(0)
    return data


def _is_text_like(uploaded) -> bool:
    """STL (ASCII) / OBJ / CSV — matn bo'lishi kerak (ikkilik kod bo'lsa shubhali)."""
    uploaded.seek(0)
    chunk = uploaded.read(2048)
    uploaded.seek(0)
    return b'\x00' not in chunk


def validate_uploaded_file(uploaded) -> str:
    """Xato bo'lsa — foydalanuvchiga ko'rsatiladigan o'zbekcha matn, aks holda bo'sh satr."""
    ext = _ext(uploaded.name)
    size = uploaded.size or 0
    mb = lambda value: value * 1024 * 1024  # noqa: E731

    if ext in IMAGE_EXTS:
        limit = getattr(settings, 'UPLOAD_MAX_IMAGE_MB', 5)
        if size > mb(limit):
            return f"Rasm hajmi {limit} MB dan oshmasligi kerak (siz yuklagan: {size / 1024 / 1024:.1f} MB)"
        head = _head(uploaded, 16)
        ok = (
            (ext in ('jpg', 'jpeg') and head.startswith(b'\xff\xd8\xff'))
            or (ext == 'png' and head.startswith(b'\x89PNG\r\n\x1a\n'))
            or (ext == 'webp' and head[:4] == b'RIFF' and head[8:12] == b'WEBP')
            or (ext == 'avif' and head[4:8] == b'ftyp')
            or (ext == 'gif' and head[:4] == b'GIF8')
        )
        if not ok:
            return f"'{uploaded.name}' haqiqiy {ext.upper()} rasm emas"
        try:
            from PIL import Image
            uploaded.seek(0)
            with Image.open(uploaded) as img:
                width, height = img.size
                img.verify()
            uploaded.seek(0)
        except Exception:
            return f"'{uploaded.name}' buzilgan yoki ochib bo'lmaydigan rasm"
        if width * height > MAX_IMAGE_PIXELS:
            return "Rasm o'lchami juda katta (kamida 6000×6000 pikseldan kichik bo'lishi kerak)"
        return ''

    if ext in MODEL_EXTS:
        limit = getattr(settings, 'UPLOAD_MAX_MODEL_MB', 15)
        if size > mb(limit):
            return f"3D model hajmi {limit} MB dan oshmasligi kerak (siz yuklagan: {size / 1024 / 1024:.1f} MB)"
        head = _head(uploaded, 8)
        if ext == 'glb' and head[:4] != b'glTF':
            return f"'{uploaded.name}' haqiqiy GLB fayl emas"
        if ext == 'usdz' and head[:4] != b'PK\x03\x04':
            return f"'{uploaded.name}' haqiqiy USDZ fayl emas"
        if ext in ('obj', 'step', 'stp') and not _is_text_like(uploaded):
            return f"'{uploaded.name}' haqiqiy {ext.upper()} (matnli 3D) fayl emas"
        return ''

    if ext in VIDEO_EXTS:
        limit = getattr(settings, 'UPLOAD_MAX_VIDEO_MB', 50)
        if size > mb(limit):
            return f"Video hajmi {limit} MB dan oshmasligi kerak (siz yuklagan: {size / 1024 / 1024:.1f} MB)"
        head = _head(uploaded, 12)
        ok = (ext in ('mp4', 'mov') and head[4:8] == b'ftyp') or (ext == 'webm' and head[:4] == b'\x1a\x45\xdf\xa3')
        return '' if ok else f"'{uploaded.name}' haqiqiy {ext.upper()} video emas"

    if ext in DATA_EXTS:
        if size > mb(MAX_DATA_MB):
            return f"CSV fayl hajmi {MAX_DATA_MB} MB dan oshmasligi kerak"
        return '' if _is_text_like(uploaded) else f"'{uploaded.name}' haqiqiy CSV (matn) fayl emas"

    allowed = ', '.join(sorted(IMAGE_EXTS | MODEL_EXTS | VIDEO_EXTS | DATA_EXTS))
    return f"'{uploaded.name}' turidagi fayl ruxsat etilmaydi. Ruxsat etilgan: {allowed}"


class UploadValidationMiddleware(MiddlewareMixin):
    """Multipart (fayl yuklash) so'rovlarini view'ga yetmasdan oldin tekshiradi."""

    def process_request(self, request):
        if request.method not in ('POST', 'PUT', 'PATCH'):
            return None
        if not (request.content_type or '').startswith('multipart/'):
            return None
        for _field, files in request.FILES.lists():
            for uploaded in files:
                error = validate_uploaded_file(uploaded)
                if error:
                    return self._reject(request, error)
        return None

    @staticmethod
    def _reject(request, error):
        wants_json = (
            request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            or 'application/json' in request.headers.get('Accept', '')
        )
        if wants_json:
            return JsonResponse({'success': False, 'ok': False, 'error': error}, status=400)
        # HTML forma: xabar ko'rsatib, shu sahifaga qaytariladi
        try:
            messages.error(request, error)
        except Exception:
            pass
        return HttpResponseRedirect(request.META.get('HTTP_REFERER') or request.path)
