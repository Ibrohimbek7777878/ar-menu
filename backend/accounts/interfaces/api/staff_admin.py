"""
Restoran Xodimlar Boshqaruvi REST API (Staff Admin API).
Faqat restoran egasi / administratori uchun ruxsat etilgan (menu_admin).
Tenant isolation, xavfsiz parollar, AuditLog va o'zini bloklashdan himoya.
"""
import secrets
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from accounts.models import AdminUser
from accounts.staff_access import access_origin, staff_access
from accounts.staff_admin import (
    CREATABLE_ROLES,
    StaffError,
    create_staff,
    end_sessions,
)
from backend.api_input import RestoAdminAPIView, parse_text
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from web.restaurant_auth import staff_shop


ROLE_LABELS = {
    'shop_owner': 'Restoran Egasi',
    'shop_manager': 'Boshqaruvchi / Menejer',
    'waiter': 'Ofitsiant',
    'kitchen': 'Oshpaz (KDS)',
    'hostess': 'Hostess / Qabulxona',
    'cashier': 'Kassir',
}


def _serialize_staff(u, origin):
    """Xodim javobi. `origin` — kirish havolasi boshi (`access_origin(request)`, so'rov uchun bir marta hisoblanadi).

    Kirish maydonlari (`panel_path`, `panel_label`, `login_url`, `login_unavailable_reason`) serverda hisoblanadi:
    frontend qaysi rol qayerga tushishini o'zi taxmin qilmaydi.
    """
    full_name = f"{u.first_name} {u.last_name}".strip() if u.first_name or u.last_name else u.username
    return {
        'id': u.id,
        'username': u.username,
        'full_name': full_name,
        'phone': getattr(u, 'phone', '') or '',
        'role': u.role,
        'role_display': ROLE_LABELS.get(u.role, u.role),
        'is_active': bool(u.is_active),
        'date_joined': u.date_joined.isoformat() if u.date_joined else None,
        'last_login': u.last_login.isoformat() if u.last_login else None,
        **staff_access(u, origin),
    }


class StaffListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/staff/ — Xodimlar ro'yxati.
    POST /api/restaurant/admin/v1/staff/ — Yangi xodim qo'shish (bir martalik parol bilan).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        staff_users = (
            AdminUser.objects.filter(shop=shop, is_superuser=False)
            .order_by('id')
        )
        origin = access_origin(request)
        return Response([_serialize_staff(u, origin) for u in staff_users])

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        username = parse_text(request.data.get('username'), 'username', max_length=150)
        role = parse_text(request.data.get('role'), 'role', max_length=30)
        password = parse_text(request.data.get('password'), 'password', max_length=128)
        full_name = parse_text(request.data.get('full_name'), 'full_name', max_length=300)
        phone = parse_text(request.data.get('phone'), 'phone', max_length=20)

        if not username:
            return Response({'error': 'Login kiritilishi shart', 'field': 'username'}, status=status.HTTP_400_BAD_REQUEST)

        # Menejer egalik (shop_owner) va menejer rolini bera olmaydi (403)
        if request.user.role == 'shop_manager' and role in ('super_admin', 'shop_owner', 'shop_manager'):
            return Response({'error': 'Menejer egalik yoki menejer rolini bera olmaydi', 'field': 'role'}, status=status.HTTP_403_FORBIDDEN)

        if role not in CREATABLE_ROLES:
            return Response({
                'error': f'Noto\'g\'ri rol. Mumkin bo\'lganlar: {list(CREATABLE_ROLES)}',
                'field': 'role'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user, generated = create_staff(
                shop=shop,
                username=username,
                role=role,
                password=password,
                full_name=full_name,
                phone=phone,
                update=False
            )
        except StaffError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_audit(
            'staff_created',
            request=request,
            actor=request.user,
            target_type='admin_user',
            target_id=user.id,
            new_value={'username': user.username, 'role': user.role, 'full_name': full_name}
        )

        data = _serialize_staff(user, access_origin(request))
        # Parol bir marta ko'rsatiladi
        data['generated_password'] = generated or password or None
        return Response(data, status=status.HTTP_201_CREATED)


class StaffDetailUpdateView(RestoAdminAPIView):
    """
    PATCH /api/restaurant/admin/v1/staff/<pk>/ — Xodim ma'lumotlarini (rol, ism, telefon) tahrirlash.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def patch(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        data = request.data
        new_role = parse_text(data['role'], 'role', max_length=30, required=True) if 'role' in data else None

        # O'z rolingizni o'zgartirishdan himoya
        if user.pk == request.user.pk:
            if new_role is not None and new_role != user.role:
                if request.user.role == 'shop_manager':
                    return Response({'error': 'O\'z rolingizni ko\'tara olmaysiz'}, status=status.HTTP_403_FORBIDDEN)
                return Response({'error': 'O\'z rolingizni o\'zgartira olmaysiz'}, status=status.HTTP_400_BAD_REQUEST)

        # Menejer egasi yoki boshqa menejerni o'zgartira olmaydi (403). O'z profilini (ism, telefon) tahrirlashi mumkin:
        # o'z rolini o'zgartirish yuqorida alohida taqiqlangan, rol o'zgarmasa (frontend butun profilni yuborsa) — xato emas.
        if request.user.role == 'shop_manager':
            if user.pk != request.user.pk and user.role in ('super_admin', 'shop_owner', 'shop_manager'):
                return Response({'error': 'Menejer egasi yoki boshqa menejerni o\'zgartira olmaydi'}, status=status.HTTP_403_FORBIDDEN)
            if new_role is not None and new_role != user.role and new_role in ('super_admin', 'shop_owner', 'shop_manager'):
                return Response({'error': 'Menejer egalik yoki menejer rolini bera olmaydi'}, status=status.HTTP_403_FORBIDDEN)

        update_fields = []

        if 'full_name' in data:
            full_name = parse_text(data['full_name'], 'full_name', max_length=300)
            first, _, last = full_name.partition(' ')
            user.first_name = first[:150]
            user.last_name = last[:150]
            update_fields.extend(['first_name', 'last_name'])

        if 'phone' in data:
            user.phone = parse_text(data['phone'], 'phone', max_length=20)
            update_fields.append('phone')

        if new_role is not None:
            if new_role != user.role:
                allowed_roles = list(CREATABLE_ROLES)
                if request.user.role in ('shop_owner', 'super_admin'):
                    allowed_roles.append('shop_owner')
                if new_role not in allowed_roles:
                    return Response({'error': f'Noto\'g\'ri rol. Mumkin bo\'lganlar: {allowed_roles}'}, status=status.HTTP_400_BAD_REQUEST)

                # Oxirgi egani tushirish taqiqlanadi
                if user.role == 'shop_owner' and new_role != 'shop_owner':
                    active_owners = AdminUser.objects.filter(shop=shop, role='shop_owner', is_active=True).count()
                    if active_owners <= 1:
                        return Response({'error': 'Do\'konning oxirgi egasini tushirish mumkin emas'}, status=status.HTTP_400_BAD_REQUEST)

                user.role = new_role
                update_fields.append('role')

        if update_fields:
            user.save(update_fields=update_fields)
            log_audit(
                'staff_updated',
                request=request,
                actor=request.user,
                target_type='admin_user',
                target_id=user.id,
                new_value={f: getattr(user, f) for f in update_fields}
            )

        return Response(_serialize_staff(user, access_origin(request)))


class StaffBlockView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/block/ — Xodimni bloklash (barcha sessiyalari darhol tugatiladi).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # O'zini o'zi bloklash taqiqlanadi
        if user.pk == request.user.pk:
            return Response({'error': 'O\'z akkauntingizni bloklay olmaysiz'}, status=status.HTTP_400_BAD_REQUEST)

        # Menejer egasi yoki boshqa menejerni bloklay olmaydi (403)
        if request.user.role == 'shop_manager' and user.role in ('super_admin', 'shop_owner', 'shop_manager'):
            return Response({'error': 'Menejer egasi yoki boshqa menejerni bloklay olmaydi'}, status=status.HTTP_403_FORBIDDEN)

        # Do'konning oxirgi egasini bloklash taqiqlanadi (400)
        if user.role in ('super_admin', 'shop_owner'):
            active_owners = AdminUser.objects.filter(shop=shop, role='shop_owner', is_active=True).count()
            if active_owners <= 1:
                return Response({'error': 'Do\'konning oxirgi egasini bloklab bo\'lmaydi'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save(update_fields=['is_active'])
        ended_sessions = end_sessions(user)

        log_audit(
            'staff_blocked',
            request=request,
            actor=request.user,
            target_type='admin_user',
            target_id=user.id,
            new_value={'is_active': False, 'sessions_ended': ended_sessions}
        )

        return Response({
            'status': 'blocked',
            'id': user.id,
            'username': user.username,
            'sessions_ended': ended_sessions
        })


class StaffUnblockView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/unblock/ — Xodimni blokdan chiqarish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # Menejer egasi yoki boshqa menejerni blokdan chiqara olmaydi (403)
        if request.user.role == 'shop_manager' and user.role in ('super_admin', 'shop_owner', 'shop_manager'):
            return Response({'error': 'Menejer egasi yoki boshqa menejerni blokdan chiqara olmaydi'}, status=status.HTTP_403_FORBIDDEN)

        user.is_active = True
        user.save(update_fields=['is_active'])

        log_audit(
            'staff_unblocked',
            request=request,
            actor=request.user,
            target_type='admin_user',
            target_id=user.id,
            new_value={'is_active': True}
        )

        return Response({
            'status': 'unblocked',
            'id': user.id,
            'username': user.username
        })


class StaffResetPasswordView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/reset-password/ — Parolni yangilash.
    Parol bir marta ko'rsatiladi va xodimning faol sessiyalari tugatiladi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # Menejer egasi yoki boshqa menejer parolini tiklay olmaydi (403)
        if request.user.role == 'shop_manager' and user.role in ('super_admin', 'shop_owner', 'shop_manager'):
            return Response({'error': 'Menejer egasi yoki boshqa menejer parolini tiklay olmaydi'}, status=status.HTTP_403_FORBIDDEN)

        # Boshqa restoran egasining parolini o'zgartirish taqiqlanadi (403)
        if user.role in ('super_admin', 'shop_owner') and user.pk != request.user.pk:
            return Response({'error': 'Rahbariyat parolini bu yerdan o\'zgartirib bo\'lmaydi'}, status=status.HTTP_403_FORBIDDEN)

        password = parse_text(request.data.get('password'), 'password', max_length=128)
        generated = None
        if not password:
            password = generated = secrets.token_urlsafe(9)

        try:
            validate_password(password)
        except ValidationError as exc:
            return Response({'error': 'Parol yetarli kuchli emas: ' + ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])
        end_sessions(user)

        log_audit(
            'staff_password_reset',
            request=request,
            actor=request.user,
            target_type='admin_user',
            target_id=user.id,
            new_value={'status': 'password_reset'}
        )

        return Response({
            'status': 'password_reset',
            'id': user.id,
            'username': user.username,
            'generated_password': generated or password
        })
