"""DRF autentifikatsiya klassi — Bearer JWT"""
import jwt
import logging
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.accounts.tokens import decode

log = logging.getLogger('accounts.auth')


class StaffJWTAuthentication(BaseAuthentication):
    """
    ⚡ Muvaffaqiyatli bo'lsa:
       request.user       = User (yoki AnonymousUser)
       request.auth       = payload dict
       request.staff      = Staff
       request.restaurant_id = payload['rid']   ← TENANT SCOPE
    """
    keyword = 'Bearer'

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith(self.keyword + ' '):
            return None
        token = header[len(self.keyword) + 1:].strip()
        if not token:
            return None

        try:
            payload = decode(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token muddati tugagan')
        except jwt.PyJWTError as e:
            log.warning(f'[auth] noto\'g\'ri token: {e}')
            raise AuthenticationFailed('Token yaroqsiz')

        typ = payload.get('typ')
        if typ == 'platform':
            return self._platform(request, payload)
        if typ != 'access':
            raise AuthenticationFailed('Token turi noto\'g\'ri')
        return self._staff(request, payload)

    def _staff(self, request, payload):
        from apps.accounts.models import Staff
        staff = Staff.objects.filter(
            id=payload['sub'], restaurant_id=payload['rid'], is_active=True
        ).select_related('restaurant', 'user').first()
        if staff is None:
            raise AuthenticationFailed('Xodim topilmadi yoki nofaol')
        if not staff.restaurant.is_active:
            raise AuthenticationFailed('Restoran nofaol')

        # ⚡ TENANT SCOPE — token ichidan, so'rovdan EMAS
        request.staff = staff
        request.restaurant = staff.restaurant
        request.restaurant_id = staff.restaurant_id
        user = staff.user
        if user is not None:
            user.staff = staff
        return (user, payload)

    def _platform(self, request, payload):
        from apps.accounts.models import User
        user = User.objects.filter(id=payload['sub'], is_platform_admin=True,
                                   is_active=True).first()
        if user is None:
            raise AuthenticationFailed('Platforma admini topilmadi')
        request.staff = None
        request.restaurant_id = None
        return (user, payload)

    def authenticate_header(self, request):
        return self.keyword
