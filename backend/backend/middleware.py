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
    def process_request(self, request):
        request.tenant_shop = None
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None
        role = getattr(user, 'role', '')
        # Sotuvchi /admin/* ga kirsa — xavfsiz va aqlli yo'naltirish
        if role in ('shop_owner', 'shop_manager', 'waiter') and request.path.startswith('/admin'):
            # Login, register, logout sahifalariga ruxsat beriladi (hisobni almashtirish yoki chiqish uchun)
            if request.path.startswith(('/admin/login', '/admin/register', '/admin/logout')):
                return None

            from django.shortcuts import redirect
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
        if role in ('shop_owner', 'shop_manager', 'waiter'):
            try:
                from shops.models import Shop
                # Avval user.shop, keyin owner bo'yicha
                shop = getattr(user, 'shop', None)
                if shop:
                    request.tenant_shop = shop
                else:
                    request.tenant_shop = Shop.objects.filter(owner=user).first()
                if not request.tenant_shop:
                    request.tenant_shop = Shop.objects.filter(name__icontains='restoran').first() or Shop.objects.first()
            except Exception:
                pass
        return None

    def process_response(self, request, response):
        return response


class LanguageMiddleware(MiddlewareMixin):
    def process_request(self, request):
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

        # 4. Accept-Language header (fallback)
        if not lang:
            accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            if accept.startswith('ru'):
                lang = 'ru'
            elif accept.startswith('en'):
                lang = 'en'

        # 5. Default
        if lang not in ('uz', 'ru', 'en'):
            lang = 'uz'

        # Saqlash + Django translation activate
        request.language = lang
        request.LANGUAGE_CODE = lang
        request.session['language'] = lang
        try:
            from django.utils import translation
            translation.activate(lang)
        except Exception:
            pass

        return None

    def process_response(self, request, response):
        lang = getattr(request, 'language', 'uz')
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
    def process_request(self, request):
        path = request.path

        # Faqat restoran moliya va boshqaruv xavfsiz URL-larini tekshirish
        if path.startswith(('/api/restaurant/finance/', '/api/restaurant/admin/')):
            user = getattr(request, 'user', None)
            is_auth = user and user.is_authenticated
            user_role = getattr(user, 'role', 'guest') if is_auth else 'guest'

            # Agar xodim yoki admin bo'lmasa:
            if not is_auth and user_role not in ('admin', 'manager', 'shop_owner', 'shop_manager', 'waiter'):
                from django.http import JsonResponse
                return JsonResponse({
                    'success': False,
                    'error': 'Kirish taqiqlangan: Ushbu amal faqat vakolatli restoran xodimlari uchun.',
                    'code': 'FORBIDDEN_STAFF_ONLY'
                }, status=403)

        return None

