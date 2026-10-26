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
from rest_framework.views import APIView

from accounts.models import AdminUser
from accounts.staff_admin import (
    CREATABLE_ROLES,
    StaffError,
    block_staff,
    create_staff,
    end_sessions,
)
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


def _serialize_staff(u):
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
    }


class StaffListCreateView(APIView):
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
        return Response([_serialize_staff(u) for u in staff_users])

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        username = str(request.data.get('username', '')).strip()
        role = str(request.data.get('role', '')).strip()
        password = str(request.data.get('password', '')).strip()
        full_name = str(request.data.get('full_name', '')).strip()
        phone = str(request.data.get('phone', '')).strip()

        if not username:
            return Response({'error': 'Login kiritilishi shart', 'field': 'username'}, status=status.HTTP_400_BAD_REQUEST)

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

        data = _serialize_staff(user)
        # Parol bir marta ko'rsatiladi
        data['generated_password'] = generated or password or None
        return Response(data, status=status.HTTP_201_CREATED)


class StaffDetailUpdateView(APIView):
    """
    PATCH /api/restaurant/admin/v1/staff/<pk>/ — Xodim ma'lumotlarini (rol, ism, telefon) tahrirlash.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def patch(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        data = request.data
        update_fields = []

        if 'full_name' in data:
            full_name = str(data['full_name']).strip()
            first, _, last = full_name.partition(' ')
            user.first_name = first[:150]
            user.last_name = last[:150]
            update_fields.extend(['first_name', 'last_name'])

        if 'phone' in data:
            user.phone = str(data['phone'])[:20]
            update_fields.append('phone')

        if 'role' in data:
            new_role = data['role']
            if new_role != user.role:
                # O'z rolingizni pasaytirib yuborishdan himoya
                if user.pk == request.user.pk:
                    return Response({'error': 'O\'z rolingizni o\'zgartira olmaysiz'}, status=status.HTTP_400_BAD_REQUEST)
                if new_role not in CREATABLE_ROLES:
                    return Response({'error': f'Noto\'g\'ri rol. Mumkin bo\'lganlar: {list(CREATABLE_ROLES)}'}, status=status.HTTP_400_BAD_REQUEST)
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

        return Response(_serialize_staff(user))


class StaffBlockView(APIView):
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

        # Egasi akkauntini bloklash taqiqlanadi
        if user.role in ('super_admin', 'shop_owner'):
            return Response({'error': 'Restoran egasini bloklab bo\'lmaydi'}, status=status.HTTP_400_BAD_REQUEST)

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


class StaffUnblockView(APIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/unblock/ — Xodimni blokdan chiqarish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

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


class StaffResetPasswordView(APIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/reset-password/ — Parolni yangilash.
    Parol bir marta ko'rsatiladi va xodimning faol sessiyalari tugatiladi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # Boshqa restoran egasining parolini o'zgartirish taqiqlanadi
        if user.role in ('super_admin', 'shop_owner') and user.pk != request.user.pk:
            return Response({'error': 'Rahbariyat parolini bu yerdan o\'zgartirib bo\'lmaydi'}, status=status.HTTP_400_BAD_REQUEST)

        password = str(request.data.get('password', '')).strip()
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
            new_value={'username': user.username}
        )

        return Response({
            'status': 'password_reset',
            'id': user.id,
            'username': user.username,
            'generated_password': generated or password,
        })
