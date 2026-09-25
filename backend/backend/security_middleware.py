"""
OWASP Xavfsizlik Middleware (Security Hardening).
- Clickjacking himoyasi (X-Frame-Options / CSP)
- MIME Confusion himoyasi (X-Content-Type-Options: nosniff)
- Referrer Policy & Permissions Policy
- Telegram Mini App (TMA) iframe ruxsatlari
"""
from django.utils.deprecation import MiddlewareMixin


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    OWASP Top 10/20 xavfsizlik sarlavhalarini barcha HTTP javoblarga o'rnatish.
    """
    def process_response(self, request, response):
        path = request.path

        # 1. MIME-type sniffing himoyasi
        response['X-Content-Type-Options'] = 'nosniff'

        # 2. Xavfsiz Referrer siyosati
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # 3. Brauzer sensorlari ruxsat siyosati (Ovozli AI copilot uchun microphone=(self))
        response['Permissions-Policy'] = 'geolocation=(self), camera=(self), microphone=(self)'

        # 4. Telegram Mini App (TMA) uchun IFrame / Clickjacking boshqaruvi
        # Telegram WebApp faqat Telegram ilovasi va web.telegram.org da iframe orqali ochilishi kerak
        if path.startswith(('/tma/', '/ar/', '/media/products/')):
            response['Content-Security-Policy'] = (
                "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org"
            )
            response.xframe_options_exempt = True
            if 'X-Frame-Options' in response:
                del response['X-Frame-Options']
        else:
            # Standart veb sahifalar begona saytlar iframeda ochilmasligi uchun
            if 'X-Frame-Options' not in response:
                response['X-Frame-Options'] = 'SAMEORIGIN'

        return response
