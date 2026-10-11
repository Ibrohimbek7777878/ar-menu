import logging
import base64
import jwt as pyjwt
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from apps.tenants.models import Restaurant
from apps.accounts.models import Staff
from apps.accounts.serializers import StaffLoginSerializer, StaffSerializer
from apps.accounts.services import find_staff_by_pin
from apps.accounts.tokens import make_pair, make_access, make_refresh, make_platform_token, decode, revoke_refresh, refresh_is_valid
from apps.accounts.throttles import LoginRateLimit
from apps.accounts import totp as totp_svc
from core.exceptions import RestaurantInactive

log = logging.getLogger('accounts.views')


def client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


class StaffLoginView(APIView):
    """
    POST /v1/staff/login/
    {"slug": "registon", "pin": "5731"}
    →  {"access": "...", "refresh": "...", "expires_in": 43200, "staff": {...}}
    ⚡ Xato javobda HECH QACHON "bunday PIN yo'q" / "restoran yo'q" farqlanmaydi.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateLimit]

    def post(self, request):
        ser = StaffLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        slug = ser.validated_data['slug']
        pin = ser.validated_data['pin']
        ip = client_ip(request)

        restaurant = Restaurant.objects.filter(slug=slug).first()
        if restaurant is None:
            log.warning(f'[login] noma\'lum restoran slug={slug} ip={ip}')
            return self._fail()
        if not restaurant.is_active:
            raise RestaurantInactive()

        staff = find_staff_by_pin(restaurant.id, pin)
        if staff is None:
            from apps.accounts.throttles import register_fail, is_ip_blocked
            register_fail(restaurant.id, ip)
            if is_ip_blocked(restaurant.id, ip):
                return Response({'error': {
                    'code': 'RATE_LIMITED',
                    'message_uz': 'Juda ko\'p urinish. 15 daqiqadan keyin urinib ko\'ring.',
                    'message_ru': 'Слишком много попыток. Повторите через 15 минут.',
                    'message_en': 'Too many attempts. Try again in 15 minutes.',
                }}, status=429)
            log.warning(f'[login] xato PIN rest={slug} ip={ip}')
            return self._fail()

        if staff.is_blocked:
            return Response({'error': {
                'code': 'RATE_LIMITED',
                'message_uz': f'Hisob {staff.blocked_until:%H:%M} gacha bloklangan',
                'message_ru': f'Аккаунт заблокирован до {staff.blocked_until:%H:%M}',
                'message_en': f'Account blocked until {staff.blocked_until:%H:%M}',
            }}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Muvaffaqiyat → hisoblagichni tozalash
        staff.failed_attempts = 0
        staff.blocked_until = None
        staff.last_login = timezone.now()
        staff.save(update_fields=['failed_attempts', 'blocked_until',
                                  'last_login', 'updated_at'])

        try:
            from apps.analytics.models import AuditLog
            AuditLog.log(restaurant_id=restaurant.id, actor=staff, action='staff.login',
                         model='Staff', object_id=staff.id, ip=ip)
        except Exception:
            pass

        data = make_pair(staff)
        data['staff'] = StaffSerializer(staff).data
        data['restaurant'] = {'id': restaurant.id, 'slug': restaurant.slug,
                              'name': restaurant.name}
        log.info(f'[login] OK staff#{staff.id} rest={slug} role={staff.role}')
        return Response(data)

    @staticmethod
    def _fail():
        """⚡ Yagona xato — foydalanuvchi sanab topa olmasin"""
        return Response({'error': {
            'code': 'INVALID_CREDENTIALS',
            'message_uz': 'Restoran yoki PIN noto\'g\'ri',
            'message_ru': 'Ресторан или PIN неверный',
            'message_en': 'Invalid restaurant or PIN',
        }}, status=status.HTTP_401_UNAUTHORIZED)


class StaffMeView(APIView):
    """GET /v1/staff/me/"""
    def get(self, request):
        staff = getattr(request, 'staff', None)
        if staff is None:
            return Response({'detail': 'Xodim emas'}, status=403)
        return Response({
            'staff': StaffSerializer(staff).data,
            'restaurant': {'id': staff.restaurant_id,
                           'slug': staff.restaurant.slug,
                           'name': staff.restaurant.name,
                           'colors': {'primary': staff.restaurant.color_primary,
                                      'accent': staff.restaurant.color_accent}},
        })


class StaffRefreshView(APIView):
    """
    POST /v1/staff/refresh/  {"refresh": "..."}
    → {"access": "...", "refresh": "...", "expires_in": 43200}
    ⚡ Rotatsiya: eski refresh bekor qilinadi (qayta ishlatilsa — o'g'irlangan).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('refresh', '')
        if not token:
            return Response({'detail': 'refresh kerak'}, status=400)

        try:
            payload = decode(token, expect_typ='refresh')
        except pyjwt.ExpiredSignatureError:
            return Response({'error': {'code': 'TOKEN_EXPIRED',
                                       'message_uz': 'Sessiya tugadi. Qayta kiring.',
                                       'message_ru': 'Сессия истекла. Войдите снова.',
                                       'message_en': 'Session expired. Please log in.'}},
                            status=401)
        except pyjwt.PyJWTError:
            return Response({'detail': 'Token yaroqsiz'}, status=401)

        jti = payload.get('jti', '')
        if not refresh_is_valid(jti):
            log.warning(f'[refresh] bekor qilingan jti={jti} — o\'g\'irlangan bo\'lishi mumkin ⛔')
            return Response({'detail': 'Token bekor qilingan'}, status=401)

        staff = Staff.objects.filter(
            id=payload['sub'], restaurant_id=payload['rid'], is_active=True
        ).select_related('restaurant').first()
        if staff is None or not staff.restaurant.is_active:
            revoke_refresh(jti)
            return Response({'detail': 'Xodim nofaol'}, status=401)

        revoke_refresh(jti)                       # ⚡ rotatsiya
        return Response({
            'access': make_access(staff),
            'refresh': make_refresh(staff),
            'expires_in': 43200,
        })


class StaffLogoutView(APIView):
    """POST /v1/staff/logout/  {"refresh": "..."}"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('refresh', '')
        try:
            payload = decode(token, expect_typ='refresh')
            revoke_refresh(payload.get('jti', ''))
        except Exception:
            pass
        return Response({'ok': True})


class AdminLoginView(APIView):
    """
    POST /v1/admin/login/
    {"phone": "998901234567", "password": "...", "slug": "registon"}
    ⚡ User bir nechta restoranda admin bo'lishi mumkin —
       slug berilmasa, restoranlar ro'yxati qaytadi (tanlash uchun).
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateLimit]

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        password = request.data.get('password', '')
        slug = request.data.get('slug', '')
        ip = client_ip(request)

        user = authenticate(request, username=phone, password=password)
        if user is None or not user.is_active:
            log.warning(f'[admin-login] xato phone={phone} ip={ip}')
            return Response({'error': {
                'code': 'INVALID_CREDENTIALS',
                'message_uz': 'Telefon yoki parol noto\'g\'ri',
                'message_ru': 'Телефон или пароль неверный',
                'message_en': 'Invalid phone or password',
            }}, status=401)

        roles = Staff.objects.filter(
            user=user, is_active=True, role__in=['admin', 'manager'],
            restaurant__is_active=True
        ).select_related('restaurant')

        if not roles.exists():
            return Response({'error': {
                'code': 'TENANT_MISMATCH',
                'message_uz': 'Sizda hech qaysi restoranda admin huquqi yo\'q',
                'message_ru': 'У вас нет прав администратора ни в одном ресторане',
                'message_en': 'You have no admin rights in any restaurant',
            }}, status=403)

        if not slug:
            if roles.count() == 1:
                staff = roles.first()
            else:
                return Response({
                    'need_restaurant': True,
                    'restaurants': [{'slug': s.restaurant.slug,
                                     'name': s.restaurant.name,
                                     'role': s.role} for s in roles],
                }, status=300)
        else:
            staff = roles.filter(restaurant__slug=slug).first()
            if staff is None:
                return Response({'error': {
                    'code': 'TENANT_MISMATCH',
                    'message_uz': 'Bu restoranda huquqingiz yo\'q',
                    'message_ru': 'У вас нет прав в этом ресторане',
                    'message_en': 'No rights in this restaurant',
                }}, status=403)

        user.last_login = timezone.now()
        user.last_login_ip = ip
        user.save(update_fields=['last_login', 'last_login_ip'])

        try:
            from apps.analytics.models import AuditLog
            AuditLog.log(restaurant_id=staff.restaurant_id, actor=staff,
                         action='admin.login', model='User', object_id=user.id, ip=ip)
        except Exception:
            pass

        data = make_pair(staff)
        data['staff'] = StaffSerializer(staff).data
        data['restaurant'] = {'id': staff.restaurant_id,
                              'slug': staff.restaurant.slug,
                              'name': staff.restaurant.name}
        return Response(data)


class PlatformLoginView(APIView):
    """
    POST /v1/platform/login/
    1-qadam: {"phone","password"}          → {"need_2fa": true}
    2-qadam: {"phone","password","code"}   → {"access": "..."}
    ⛔ 2FA yoqilmagan platforma admini kira OLMAYDI.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateLimit]

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        password = request.data.get('password', '')
        code = request.data.get('code', '')
        ip = client_ip(request)

        user = authenticate(request, username=phone, password=password)
        if user is None or not user.is_platform_admin or not user.is_active:
            log.warning(f'[platform-login] rad etildi phone={phone} ip={ip}')
            return Response({'error': {
                'code': 'INVALID_CREDENTIALS',
                'message_uz': 'Kirish rad etildi',
                'message_ru': 'Доступ запрещён',
                'message_en': 'Access denied',
            }}, status=401)

        if not user.totp_enabled:
            return Response({'error': {
                'code': 'TOTP_REQUIRED',
                'message_uz': '2FA yoqilmagan. /v1/platform/2fa/setup/ ni bajaring.',
                'message_ru': '2FA не включена.',
                'message_en': '2FA is not enabled.',
            }}, status=403)

        if not code:
            return Response({'need_2fa': True}, status=200)

        if not totp_svc.verify(user.totp_secret, code):
            log.warning(f'[platform-login] 2FA xato phone={phone} ip={ip}')
            return Response({'error': {
                'code': 'INVALID_2FA',
                'message_uz': 'Kod noto\'g\'ri',
                'message_ru': 'Неверный код',
                'message_en': 'Invalid code',
            }}, status=401)

        user.last_login = timezone.now()
        user.last_login_ip = ip
        user.save(update_fields=['last_login', 'last_login_ip'])
        log.info(f'[platform-login] OK user#{user.id} ip={ip}')
        return Response({'access': make_platform_token(user), 'expires_in': 43200})


class Platform2FASetupView(APIView):
    """
    POST /v1/platform/2fa/setup/  → secret + QR (base64 PNG)
    POST /v1/platform/2fa/confirm/ {"code": "123456"} → yoqiladi
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        password = request.data.get('password', '')
        user = authenticate(request, username=phone, password=password)
        if user is None or not user.is_platform_admin:
            return Response({'detail': 'Kirish rad etildi'}, status=401)

        code = request.data.get('code')
        if code:                                    # tasdiqlash qadami
            if not totp_svc.verify(user.totp_secret, code):
                return Response({'detail': 'Kod noto\'g\'ri'}, status=400)
            user.totp_enabled = True
            user.save(update_fields=['totp_enabled'])
            return Response({'enabled': True})

        secret = totp_svc.new_secret()              # yaratish qadami
        user.totp_secret = secret
        user.totp_enabled = False
        user.save(update_fields=['totp_secret', 'totp_enabled'])
        uri = totp_svc.provisioning_uri(user, secret)
        png = base64.b64encode(totp_svc.qr_png_bytes(uri)).decode()
        return Response({'secret': secret, 'uri': uri, 'qr_png_base64': png})
