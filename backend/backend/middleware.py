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
