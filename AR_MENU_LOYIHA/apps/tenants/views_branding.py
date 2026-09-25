import io
from PIL import Image

from django.core.files.base import ContentFile
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from core.permissions import IsRestAdmin

MAX_LOGO_BYTES = 4 * 1024 * 1024
ALLOWED_FORMATS = {'PNG', 'JPEG', 'WEBP', 'JPG'}
HEX = set('0123456789abcdefABCDEF')


def _hex_ok(v):
    return (isinstance(v, str) and len(v) == 7 and v[0] == '#'
            and all(c in HEX for c in v[1:]))


class BrandingView(APIView):
    """
    GET   /v1/admin/branding/
    PATCH /v1/admin/branding/ (ranglar, nom, telefon, xizmat haqi)
    """
    permission_classes = [IsAuthenticated, IsRestAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        r = request.restaurant
        return Response({
            'name': r.name,
            'slug': r.slug,
            'phone': r.phone,
            'address': r.address,
            'logo': r.logo.url if r.logo else None,
            'color_primary': r.color_primary or '#E85D2A',
            'color_accent': r.color_accent or '#1A1A2E',
            'service_fee_pct': float(r.service_fee_pct),
            'default_lang': r.default_lang,
            'langs_enabled': r.langs_enabled,
        })

    def patch(self, request):
        r = request.restaurant
        d = request.data
        fields = []

        if 'color_primary' in d:
            if not _hex_ok(d['color_primary']):
                raise ValidationError({'color_primary': '#RRGGBB formatida bo\'lsin'})
            r.color_primary = d['color_primary']
            fields.append('color_primary')

        if 'color_accent' in d:
            if not _hex_ok(d['color_accent']):
                raise ValidationError({'color_accent': '#RRGGBB formatida bo\'lsin'})
            r.color_accent = d['color_accent']
            fields.append('color_accent')

        if 'name' in d and d['name'].strip():
            r.name = d['name'].strip()[:200]
            fields.append('name')

        if 'phone' in d:
            r.phone = d['phone'].strip()[:20]
            fields.append('phone')

        if 'address' in d:
            r.address = d['address'].strip()
            fields.append('address')

        if 'service_fee_pct' in d:
            try:
                pct = float(d['service_fee_pct'])
                if 0 <= pct <= 100:
                    r.service_fee_pct = pct
                    fields.append('service_fee_pct')
            except (ValueError, TypeError):
                pass

        if fields:
            r.menu_version += 1
            fields.append('menu_version')
            r.save(update_fields=fields)
            cache.delete(f'rest:slug:{r.slug}')
            cache.clear()

        return self.get(request)


class BrandingLogoView(APIView):
    """
    POST /v1/admin/branding/logo/ (multipart logo yuklash)
    """
    permission_classes = [IsAuthenticated, IsRestAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        f = request.FILES.get('file') or request.FILES.get('logo')
        if not f:
            raise ValidationError({'file': 'Logo fayli yuklanmadi'})
        if f.size > MAX_LOGO_BYTES:
            raise ValidationError({'file': 'Maksimum hajm 4 MB'})

        try:
            img = Image.open(f)
            img.verify()
            f.seek(0)
            img = Image.open(f)
        except Exception:
            raise ValidationError({'file': 'Rasm formati noto\'g\'ri'})

        # WebP formatiga optimallashtirish
        img = img.convert('RGBA' if img.mode in ('RGBA', 'LA') else 'RGB')
        img.thumbnail((512, 512), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='WEBP', quality=90)

        r = request.restaurant
        r.logo.save(f'logo_{r.slug}.webp', ContentFile(buf.getvalue()), save=False)
        r.menu_version += 1
        r.save(update_fields=['logo', 'menu_version'])
        cache.delete(f'rest:slug:{r.slug}')
        cache.clear()

        return Response({
            'ok': True,
            'logo': r.logo.url,
            'menu_version': r.menu_version
        })
