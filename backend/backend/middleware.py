"""
Til middleware — URL parameter yoki cookie orqali tilni aniqlash.
Foydalanish: ?lang=uz, ?lang=ru, ?lang=en
Cookie: language=uz
"""
from django.utils.deprecation import MiddlewareMixin


class SellerTenantMiddleware(MiddlewareMixin):
    """
    Sotuvchi tenantni aniqlash.
    shop_owner / shop_manager uchun request.tenant_shop ni o'rnatadi.
    super_admin uchun ?shop=ID orqali ixtiyoriy tanlash.
    shop_owner /admin/* ga kirsa → /seller/ ga yo'naltiriladi.
    """
    # Media/fayl so'rovlari uchun foydalanuvchi va sessiya bazadan o'qilmaydi: har rasm va 3D model so'rovi
    # avval 2 ta qo'shimcha so'rov qilardi va javobga `Vary: Cookie` qo'shib, keshlanishiga to'sqinlik qilardi
    SKIP_PREFIXES = ('/media/', '/assets/', '/static/', '/health/', '/favicon.ico')

    def process_request(self, request):
        request.tenant_shop = None
        if request.path.startswith(self.SKIP_PREFIXES):
            return None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None
        role = getattr(user, 'role', '')
        # Sotuvchi /admin/* ga kirsa — xavfsiz va aqlli yo'naltirish
        if role in ('shop_owner', 'shop_manager', 'waiter', 'kitchen', 'hostess') and request.path.startswith('/admin'):
            # Login, register, logout sahifalariga ruxsat beriladi (hisobni almashtirish yoki chiqish uchun)
            if request.path.startswith(('/admin/login', '/admin/register', '/admin/logout')):
                return None

            from django.shortcuts import redirect
            if role in ('kitchen', 'hostess'):
                from web.restaurant_auth import role_home_url
                return redirect(role_home_url(user))
            # Asosiy /admin yoki /admin/ bo'lsa -> to'g'ridan-to'g'ri o'z paneliga yo'naltirish
            if request.path in ('/admin', '/admin/'):
                if role == 'waiter':
                    return redirect('waiter_panel_web')
                return redirect('seller_dashboard_web')

            # Ichki admin sahifalariga (/admin/settings, /admin/users va h.k.) kirishga urinsa:
            from django.contrib import messages
            messages.warning(request, "Ushbu sahifa faqat Asosiy Admin uchun. Boshqaruv panelingizga yo'naltirildingiz.")
            if role == 'waiter':
                return redirect('waiter_panel_web')
            return redirect('seller_dashboard_web')
        # Super admin — ?shop=ID bilan tanlashi mumkin
        if role == 'super_admin':
            shop_id = request.GET.get('shop')
            if shop_id:
                try:
                    from shops.models import Shop
                    request.tenant_shop = Shop.objects.filter(pk=shop_id).first()
                except Exception:
                    pass
            if not request.tenant_shop:
                try:
                    from shops.models import Shop
                    request.tenant_shop = Shop.objects.filter(name__icontains='restoran').first() or Shop.objects.first()
                except Exception:
                    pass
            return None
        if role in ('shop_owner', 'shop_manager', 'waiter', 'kitchen', 'hostess'):
            try:
                from shops.models import Shop
                # Avval user.shop, keyin owner bo'yicha
                shop = getattr(user, 'shop', None)
                if shop:
                    request.tenant_shop = shop
                else:
                    request.tenant_shop = Shop.objects.filter(owner=user).first()
                # Do'koni bo'lmagan xodimga "birinchi do'kon" berilmaydi: avval boshqa biznesning ma'lumotlari ko'rinardi
            except Exception:
                pass
        return None

    def process_response(self, request, response):
        return response


class LanguageMiddleware(MiddlewareMixin):
    # Til tanlash kerak bo'lmagan so'rovlar: media/fayl so'rovlari sessiyaga umuman tegmaydi
    SKIP_PREFIXES = ('/media/', '/assets/', '/static/', '/health/', '/favicon.ico')

    def process_request(self, request):
        if request.path.startswith(self.SKIP_PREFIXES):
            request.language = 'uz'
            request._skip_language = True
            return None
        lang = None

        # 1. URL parameter'dan olish: ?lang=uz
        if 'lang' in request.GET:
            lang = request.GET.get('lang', 'uz')

        # 2. Cookie'dan olish
        if not lang:
            lang = request.COOKIES.get('language', '')

        # 3. Session'dan olish
        if not lang:
            lang = request.session.get('language', '')

        # 4. Standart til har doim 'uz' (TZ 5.6: brauzer tilidan qat'i nazar standart uz;
        # foydalanuvchi UZ/RU/EN tugmasini bossa cookie/?lang orqali saqlanadi).
        if lang not in ('uz', 'ru', 'en'):
            lang = 'uz'

        # Saqlash + Django translation activate
        request.language = lang
        request.LANGUAGE_CODE = lang
        # Sessiyaga FAQAT foydalanuvchi tilni aniq o'zgartirganda (?lang=) yoziladi. Avval har so'rovda yozilardi:
        # har sahifa va har rasm uchun bazaga UPDATE (1869 ta sessiya qatori 80 ta buyurtmaga qarshi), SQLite
        # yozuvlari navbatga tushardi va javobga `Vary: Cookie` qo'shilib keshlab bo'lmasdi (TZ R1-4). Til cookie'da.
        if 'lang' in request.GET and request.session.get('language') != lang:
            request.session['language'] = lang
        try:
            from django.utils import translation
            translation.activate(lang)
        except Exception:
            pass

        return None

    def process_response(self, request, response):
        if getattr(request, '_skip_language', False):
            return response
        lang = getattr(request, 'language', 'uz')
        if request.COOKIES.get('language') != lang:
            response.set_cookie('language', lang, max_age=365 * 24 * 60 * 60)
        # To'g'ri Content-Language header
        response['Content-Language'] = lang
        try:
            from django.utils import translation
            translation.deactivate()
        except Exception:
            pass
        return response


class MultiProductHostPortMiddleware(MiddlewareMixin):
    """
    3 Ta Mustaqil Mahsulotni alohida Port va alohida URL bo'yicha marshrutlovchi yadroviy middleware:
    - Port 8001 -> backend.urls_restaurant (Mahsulot #1: Restoran 3D/AR & NFC Menyu)
    - Port 8002 -> backend.urls_market (Mahsulot #2: Online Store Gipermarket)
    - Port 8003 -> backend.urls_studio (Mahsulot #3: 3D Studio & Buyurtma Chop Etish)
    - Host / Subdomain / Header yoki DJANGO_PRODUCT o'zgaruvchisi orqali ham avtomatik aniqlanadi.
    """
    def process_request(self, request):
        import os

        # 1. Atrof-muhit o'zgaruvchisidan (masalan, alohida Gunicorn instancelari)
        env_product = os.environ.get('DJANGO_PRODUCT', '').strip().lower()
        if env_product == 'restaurant':
            request.urlconf = 'backend.urls_restaurant'
            request.product_code = 'restaurant'
            return None
        elif env_product == 'market':
            request.urlconf = 'backend.urls_market'
            request.product_code = 'market'
            return None
        elif env_product == 'studio':
            request.urlconf = 'backend.urls_studio'
            request.product_code = 'studio'
            return None

        # 2. Maxsus HTTP Header (Reverse Proxy / Load Balancer)
        header_prod = request.META.get('HTTP_X_PRODUCT', '').strip().lower()
        if header_prod in ('restaurant', 'market', 'studio'):
            request.urlconf = f'backend.urls_{header_prod}'
            request.product_code = header_prod
            return None

        # 3. Port bo'yicha aniqlash (8001, 8002, 8003)
        try:
            port = str(request.get_port() or '')
        except Exception:
            port = ''
        server_port = str(request.META.get('SERVER_PORT', ''))
        forwarded_port = str(request.META.get('HTTP_X_FORWARDED_PORT', ''))
        effective_port = port or forwarded_port or server_port

        if effective_port == '8001':
            request.urlconf = 'backend.urls_restaurant'
            request.product_code = 'restaurant'
            return None
        elif effective_port == '8002':
            request.urlconf = 'backend.urls_market'
            request.product_code = 'market'
            return None
        elif effective_port == '8003':
            request.urlconf = 'backend.urls_studio'
            request.product_code = 'studio'
            return None

        # 4. Host / Domen / Subdomen bo'yicha aniqlash (Cloudflare tunnel yoki maxsus domenlar)
        try:
            host = request.get_host().lower().split(':')[0]
        except Exception:
            host = ''

        if any(k in host for k in ('restaurant', 'restoran', 'menyu', 'ar-menu', 'cafe', 'choyxona')):
            request.urlconf = 'backend.urls_restaurant'
            request.product_code = 'restaurant'
            return None
        elif any(k in host for k in ('market', 'store', 'shop', 'gipermarket', 'bazar', 'bozor')):
            request.urlconf = 'backend.urls_market'
            request.product_code = 'market'
            return None
        elif any(k in host for k in ('studio', 'print', '3dprint', 'model', 'slicer')):
            request.urlconf = 'backend.urls_studio'
            request.product_code = 'studio'
            return None

        # Standart holatda ROOT_URLCONF ishlaydi
        request.product_code = 'default'
        return None


class RestaurantStaffRBACMiddleware(MiddlewareMixin):
    """
    Restoran operatsiyalari uchun Role-Based Access Control (RBAC) Middleware.
    - Oddiy mijozlar (/api/finance/, /api/admin/) ma'lumotlarini so'ray olmaydi.
    - Xodimlar uchun o'z sohalariga doir kirishni kafolatlaydi.
    """
    # Avval faqat '/api/restaurant/...' tekshirilardi, real marshrut esa '/api/v1/restaurant/...' — himoya ishlamas edi.
    # Asosiy tekshiruv DRF permission'larida (orders/interfaces/api/permissions.py); bu — qo'shimcha qatlam.
    PROTECTED_PREFIXES = (
        '/api/v1/restaurant/finance/',
        '/api/restaurant/finance/',
        '/api/restaurant/admin/',
    )

    def process_request(self, request):
        if not request.path.startswith(self.PROTECTED_PREFIXES):
            return None
        # /api/restaurant/admin/v1/ marshrutlari view darajasida to'g'ri (401/403/200) boshqariladi
        if request.path.startswith('/api/restaurant/admin/v1/'):
            return None
        # JWT (Authorization header) bilan kelgan so'rovni DRF permission o'zi tekshiradi
        if request.META.get('HTTP_AUTHORIZATION'):
            return None

        from web.restaurant_auth import RESTAURANT_MANAGER_ROLES, is_restaurant_staff
        if is_restaurant_staff(getattr(request, 'user', None), RESTAURANT_MANAGER_ROLES):
            return None

        from django.http import JsonResponse
        return JsonResponse({
            'success': False,
            'error': 'Kirish taqiqlangan: Ushbu amal faqat vakolatli restoran xodimlari uchun.',
            'code': 'FORBIDDEN_STAFF_ONLY'
        }, status=403)

