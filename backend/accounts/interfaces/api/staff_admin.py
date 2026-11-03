"""
Restoran Xodimlar Boshqaruvi REST API (Staff Admin API).
Faqat "xodimlar" (staff_admin) ruxsati bor xodimga: standart bo'yicha restoran egasi va boshqaruvchi; egasi boshqalarga ham
bera oladi (maxfiy ruxsat — faqat egasi). Tenant isolation, xavfsiz parollar, AuditLog va o'zini bloklashdan himoya.

Qoidalar (accounts/staff_permissions.py): o'z ruxsatingizni o'zgartirib bo'lmaydi; egasining roli/logini/ruxsati boshqa hech kimga
ochiq emas; o'zingizda yo'q ruxsatni boshqaga berib bo'lmaydi (eskalatsiya); maxfiy ruxsatni faqat egasi beradi.
"""
import secrets

from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
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
from accounts.staff_permissions import (
    can_edit_permissions,
    escalation_error,
    grantable_capabilities,
    is_owner_actor,
    is_protected_target,
    parse_capability_list,
    parse_email,
    parse_username,
    password_problems,
    permission_state,
    stored_overrides,
)
from backend import login_guard
from backend.api_input import RestoAdminAPIView, parse_text
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from web.capabilities import (
    CAPABILITY_KEYS,
    RESTAURANT_MANAGER_ROLES,
    catalog_payload,
    effective_capabilities_for,
    normalize_overrides,
    role_defaults_payload,
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

PASSWORD_MIN_LENGTH = 8


def _forbidden(message, field=None):
    body = {'error': message}
    if field:
        body['field'] = field
    return Response(body, status=status.HTTP_403_FORBIDDEN)


def _bad_request(message, field=None):
    body = {'error': message}
    if field:
        body['field'] = field
    return Response(body, status=status.HTTP_400_BAD_REQUEST)


def _serialize_staff(u, origin, actor=None):
    """Xodim javobi. `origin` — kirish havolasi boshi (`access_origin(request)`, so'rov uchun bir marta hisoblanadi).

    Kirish maydonlari (`panel_path`, `panel_label`, `login_url`, `login_unavailable_reason`) serverda hisoblanadi:
    frontend qaysi rol qayerga tushishini o'zi taxmin qilmaydi. `permissions` — shaxsiy ruxsatlar holati,
    `editable_permissions` — `actor` (joriy foydalanuvchi) bu xodimning ruxsatlarini o'zgartira oladimi.
    """
    full_name = f"{u.first_name} {u.last_name}".strip() if u.first_name or u.last_name else u.username
    return {
        'id': u.id,
        'username': u.username,
        'full_name': full_name,
        'first_name': u.first_name or '',
        'last_name': u.last_name or '',
        'email': u.email or '',
        'phone': getattr(u, 'phone', '') or '',
        'role': u.role,
        'role_display': ROLE_LABELS.get(u.role, u.role),
        'is_active': bool(u.is_active),
        'is_self': actor is not None and actor.pk == u.pk,
        'date_joined': u.date_joined.isoformat() if u.date_joined else None,
        'last_login': u.last_login.isoformat() if u.last_login else None,
        'permissions': permission_state(u),
        'editable_permissions': can_edit_permissions(actor, u),
        **staff_access(u, origin),
    }


def _capability_diff(old_role, old_extra, old_revoked, new_role, new_extra, new_revoked):
    """(granted, removed): samarali ruxsatlardagi o'zgarish (katalog tartibida)."""
    old = set(effective_capabilities_for(old_role, old_extra, old_revoked))
    new = set(effective_capabilities_for(new_role, new_extra, new_revoked))
    return ([k for k in CAPABILITY_KEYS if k in new - old], [k for k in CAPABILITY_KEYS if k in old - new])


class StaffPermissionCatalogView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/staff/permissions/catalog/ — ruxsatlar katalogi, rol standartlari va joriy foydalanuvchi
    boshqalarga bera oladigan kalitlar (`grantable`; egasi — hammasi, boshqalar — o'zida bor va maxfiy bo'lmaganlar).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('staff_admin')]

    def get(self, request):
        return Response({
            'capabilities': catalog_payload(),
            'role_defaults': role_defaults_payload(),
            'grantable': grantable_capabilities(request.user),
            'is_owner': is_owner_actor(request.user),
        })


class StaffListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/staff/ — Xodimlar ro'yxati.
    POST /api/restaurant/admin/v1/staff/ — Yangi xodim qo'shish (bir martalik parol bilan). Ixtiyoriy: `email`,
    `extra_capabilities`, `revoked_capabilities` (shaxsiy ruxsatlar, tahrirdagi qoidalar bilan).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('staff_admin')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        staff_users = (
            AdminUser.objects.filter(shop=shop, is_superuser=False)
            .order_by('id')
        )
        origin = access_origin(request)
        return Response([_serialize_staff(u, origin, request.user) for u in staff_users])

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        username = parse_text(data.get('username'), 'username', max_length=150)
        role = parse_text(data.get('role'), 'role', max_length=30)
        password = parse_text(data.get('password'), 'password', max_length=128)
        full_name = parse_text(data.get('full_name'), 'full_name', max_length=300)
        phone = parse_text(data.get('phone'), 'phone', max_length=20)
        email = parse_email(data['email']) if 'email' in data else None
        extra = parse_capability_list(data['extra_capabilities'], 'extra_capabilities') if 'extra_capabilities' in data else None
        revoked = parse_capability_list(data['revoked_capabilities'], 'revoked_capabilities') if 'revoked_capabilities' in data else None

        if not username:
            return _bad_request('Login kiritilishi shart', 'username')

        # Egasi bo'lmagan xodim (menejer) egalik va menejer rolini bera olmaydi (403)
        if not is_owner_actor(request.user) and role in ('super_admin', 'shop_owner', 'shop_manager'):
            return _forbidden('Menejer egalik yoki menejer rolini bera olmaydi', 'role')

        if role not in CREATABLE_ROLES:
            return _bad_request(f"Noto'g'ri rol. Mumkin bo'lganlar: {list(CREATABLE_ROLES)}", 'role')

        username = parse_username(username)
        if extra is not None and revoked is not None and set(extra) & set(revoked):
            return _bad_request("Bir xil ruxsat ham berilgan, ham olib tashlangan bo'lishi mumkin emas", 'revoked_capabilities')
        new_extra, new_revoked = normalize_overrides(role, extra or [], revoked or [])
        # Eskalatsiya: yangi xodim oladigan ruxsatlar (rol standarti + qo'shimcha) yaratuvchida bo'lishi shart
        granted = effective_capabilities_for(role, new_extra, new_revoked)
        error = escalation_error(request.user, granted)
        if error:
            return _forbidden(error, 'extra_capabilities' if extra else 'role')

        try:
            user, generated = create_staff(
                shop=shop,
                username=username,
                role=role,
                password=password,
                full_name=full_name,
                phone=phone,
                update=False,
                email=email,
                extra_capabilities=new_extra,
                revoked_capabilities=new_revoked,
            )
        except StaffError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_audit(
            'staff_created',
            request=request,
            actor=request.user,
            target_type='admin_user',
            target_id=user.id,
            new_value={'username': user.username, 'role': user.role, 'full_name': full_name,
                       'extra_capabilities': user.extra_capabilities, 'revoked_capabilities': user.revoked_capabilities}
        )

        data = _serialize_staff(user, access_origin(request), request.user)
        # Parol bir marta ko'rsatiladi
        data['generated_password'] = generated or password or None
        return Response(data, status=status.HTTP_201_CREATED)


class StaffDetailUpdateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/staff/<pk>/ — bitta xodim (ruxsatlari bilan).
    PATCH /api/restaurant/admin/v1/staff/<pk>/ — Xodim profili: `username` (login), `first_name`, `last_name` (yoki `full_name`),
    `phone`, `email`, `role`, `extra_capabilities`, `revoked_capabilities`. Yuborilmagan maydon o'zgarmaydi; ruxsat
    ro'yxatlari to'liq almashtiriladi va rolga moslab tozalanadi (`permissions` — javobda tozalangan holat).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('staff_admin')]

    def get(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)
        return Response(_serialize_staff(user, access_origin(request), request.user))

    def patch(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)
        actor = request.user
        data = request.data
        is_self = user.pk == actor.pk
        owner_actor = is_owner_actor(actor)

        # ── 1. Kirishni tekshirish (hech narsa yozilmaydi; noto'g'ri qiymat — 400) ─────────────────────────────────
        new_role = parse_text(data['role'], 'role', max_length=30, required=True) if 'role' in data else None
        new_username = None
        if 'username' in data:
            candidate = parse_text(data['username'], 'username', max_length=150, required=True)
            if candidate != user.username:
                new_username = parse_username(candidate, exclude_pk=user.pk)
        profile = {}
        if 'first_name' in data or 'last_name' in data:
            if 'first_name' in data:
                profile['first_name'] = parse_text(data['first_name'], 'first_name', max_length=150)
            if 'last_name' in data:
                profile['last_name'] = parse_text(data['last_name'], 'last_name', max_length=150)
        elif 'full_name' in data:
            first, _, last = parse_text(data['full_name'], 'full_name', max_length=300).partition(' ')
            profile['first_name'], profile['last_name'] = first[:150], last[:150]
        if 'phone' in data:
            profile['phone'] = parse_text(data['phone'], 'phone', max_length=20)
        if 'email' in data:
            profile['email'] = parse_email(data['email'])
        raw_extra = parse_capability_list(data['extra_capabilities'], 'extra_capabilities') if 'extra_capabilities' in data else None
        raw_revoked = parse_capability_list(data['revoked_capabilities'], 'revoked_capabilities') if 'revoked_capabilities' in data else None
        if raw_extra is not None and raw_revoked is not None and set(raw_extra) & set(raw_revoked):
            return _bad_request("Bir xil ruxsat ham berilgan, ham olib tashlangan bo'lishi mumkin emas", 'revoked_capabilities')

        # ── 2. Ruxsatlar: kim kimni tahrirlay oladi ─────────────────────────────────────────────────────────────
        # O'z rolingizni o'zgartirishdan himoya
        if is_self and new_role is not None and new_role != user.role:
            if not owner_actor:
                return _forbidden("O'z rolingizni ko'tara olmaysiz")
            return _bad_request("O'z rolingizni o'zgartira olmaysiz")

        # Egasi bo'lmagan xodim (menejer) egasi yoki boshqa menejerni o'zgartira olmaydi (403). O'z profilini (ism, telefon,
        # login) tahrirlashi mumkin: o'z rolini o'zgartirish yuqorida taqiqlangan, rol o'zgarmasa (frontend butun profilni
        # yuborsa) — xato emas.
        if not owner_actor:
            if not is_self and user.role in RESTAURANT_MANAGER_ROLES:
                return _forbidden("Menejer egasi yoki boshqa menejerni o'zgartira olmaydi")
            if new_role is not None and new_role != user.role and new_role in RESTAURANT_MANAGER_ROLES:
                return _forbidden("Menejer egalik yoki menejer rolini bera olmaydi")

        # Egasi / super_admin hisobi: logini, roli va ruxsatlarini boshqa hech kim o'zgartira olmaydi (egasi o'z loginini mumkin)
        protected = is_protected_target(user)
        if protected and not is_self and new_username is not None:
            return _forbidden("Egasining loginini boshqa foydalanuvchi o'zgartira olmaydi", 'username')
        if protected and (raw_extra or raw_revoked):
            return _forbidden("Egasi har doim hamma ruxsatga ega: uning ruxsatlarini cheklab yoki o'zgartirib bo'lmaydi",
                              'extra_capabilities' if raw_extra else 'revoked_capabilities')

        role_changed = new_role is not None and new_role != user.role
        if role_changed:
            allowed_roles = list(CREATABLE_ROLES)
            if owner_actor:
                allowed_roles.append('shop_owner')
            if new_role not in allowed_roles:
                return _bad_request(f"Noto'g'ri rol. Mumkin bo'lganlar: {allowed_roles}", 'role')

            # Oxirgi egani tushirish taqiqlanadi
            if user.role == 'shop_owner' and new_role != 'shop_owner':
                active_owners = AdminUser.objects.filter(shop=shop, role='shop_owner', is_active=True).count()
                if active_owners <= 1:
                    return _bad_request("Do'konning oxirgi egasini tushirish mumkin emas", 'role')
            if protected and not is_self:
                return _forbidden("Egasining rolini boshqa foydalanuvchi o'zgartira olmaydi", 'role')

        # Shaxsiy ruxsatlarning yangi holati (rolga moslab tozalangan) va samarali ruxsatlardagi farq
        cur_extra, cur_revoked = stored_overrides(user)
        final_role = new_role if role_changed else user.role
        new_extra, new_revoked = normalize_overrides(
            final_role, cur_extra if raw_extra is None else raw_extra, cur_revoked if raw_revoked is None else raw_revoked)
        overrides_changed = (new_extra, new_revoked) != (cur_extra, cur_revoked)
        granted, removed = _capability_diff(user.role, cur_extra, cur_revoked, final_role, new_extra, new_revoked)

        if is_self and overrides_changed:
            return _forbidden("O'z ruxsatlaringizni o'zgartira olmaysiz", 'extra_capabilities')
        error = escalation_error(actor, granted)
        if error:
            return _forbidden(error, 'extra_capabilities' if raw_extra is not None else (
                'revoked_capabilities' if raw_revoked is not None else 'role'))

        # ── 3. Yozish (bitta tranzaksiyada: o'zgarish va audit birga) ───────────────────────────────────────────
        old_username = user.username
        old_profile = {f: getattr(user, f) for f in profile}
        changed_profile = {f: v for f, v in profile.items() if v != old_profile[f]}
        update_fields = list(changed_profile)
        for field, value in changed_profile.items():
            setattr(user, field, value)
        if role_changed:
            old_profile['role'] = user.role
            changed_profile['role'] = new_role
            user.role = new_role
            update_fields.append('role')
        if new_username is not None:
            user.username = new_username
            update_fields.append('username')
        if user.extra_capabilities != new_extra:
            user.extra_capabilities = new_extra
            update_fields.append('extra_capabilities')
        if user.revoked_capabilities != new_revoked:
            user.revoked_capabilities = new_revoked
            update_fields.append('revoked_capabilities')

        if update_fields:
            try:
                with transaction.atomic():
                    user.save(update_fields=update_fields)
                    if changed_profile:
                        log_audit('staff_updated', request=request, actor=actor, target_type='admin_user', target_id=user.id,
                                  old_value={f: old_profile[f] for f in changed_profile}, new_value=changed_profile)
                    if new_username is not None:
                        log_audit('staff_username_changed', request=request, actor=actor, target_type='admin_user',
                                  target_id=user.id, old_value={'username': old_username}, new_value={'username': new_username})
                    if overrides_changed or granted or removed:
                        log_audit('staff_permissions_changed', request=request, actor=actor, target_type='admin_user',
                                  target_id=user.id,
                                  old_value={'extra': cur_extra, 'revoked': cur_revoked},
                                  new_value={'extra': new_extra, 'revoked': new_revoked, 'granted': granted, 'removed': removed})
            except IntegrityError:
                return _bad_request(f"«{new_username}» logini band. Boshqa login tanlang.", 'username')
            if new_username is not None:
                login_guard.clear_user(old_username)
                login_guard.clear_user(new_username)

        return Response(_serialize_staff(user, access_origin(request), actor))


class StaffBlockView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/block/ — Xodimni bloklash (barcha sessiyalari darhol tugatiladi).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('staff_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # O'zini o'zi bloklash taqiqlanadi
        if user.pk == request.user.pk:
            return Response({'error': 'O\'z akkauntingizni bloklay olmaysiz'}, status=status.HTTP_400_BAD_REQUEST)

        # Menejer egasi yoki boshqa menejerni bloklay olmaydi (403)
        if not is_owner_actor(request.user) and user.role in RESTAURANT_MANAGER_ROLES:
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
    permission_classes = [capability('staff_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # Menejer egasi yoki boshqa menejerni blokdan chiqara olmaydi (403)
        if not is_owner_actor(request.user) and user.role in RESTAURANT_MANAGER_ROLES:
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
    permission_classes = [capability('staff_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)

        # Menejer egasi yoki boshqa menejer parolini tiklay olmaydi (403)
        if not is_owner_actor(request.user) and user.role in RESTAURANT_MANAGER_ROLES:
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


class StaffSetPasswordView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/staff/<pk>/set-password/ `{password}` — xodimga YANGI parolni egasi o'zi o'rnatadi.
    (`reset-password` esa tasodifiy parol yaratadi va u o'zgarmagan.)

    • Parol Django `validate_password` bilan tekshiriladi (kamida 8 belgi, oddiy/raqamli/loginga o'xshash parol — 400).
    • Xodimning boshqa sessiyalari tugaydi (sessiya hash'i parolga bog'liq + ochiq sessiyalar o'chiriladi),
      shu loginning kirish urinishlari bloki tozalanadi.
    • O'z parolingizni o'zgartirishda JORIY parol (`current_password`) ham talab qilinadi (o'g'irlangan sessiya bilan
      hisobni egallab olib bo'lmasin); joriy sessiya saqlanadi.
    • Parol javobda ham, auditda ham, jurnalda ham yozilmaydi — audit faqat "parol o'zgartirildi" faktini saqlaydi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('staff_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        user = get_object_or_404(AdminUser, pk=pk, shop=shop, is_superuser=False)
        actor = request.user
        is_self = user.pk == actor.pk

        # Egasi bo'lmagan xodim egasi yoki boshqa menejer parolini o'rnata olmaydi; egasining parolini boshqa hech kim
        if not is_self and not is_owner_actor(actor) and user.role in RESTAURANT_MANAGER_ROLES:
            return _forbidden("Menejer egasi yoki boshqa menejer parolini o'zgartira olmaydi")
        if not is_self and is_protected_target(user):
            return _forbidden("Rahbariyat parolini bu yerdan o'zgartirib bo'lmaydi")

        password = parse_text(request.data.get('password'), 'password', max_length=128, required=True)
        current = None
        if is_self:
            current = parse_text(request.data.get('current_password'), 'current_password', max_length=128, required=True)

        if len(password) < PASSWORD_MIN_LENGTH:
            return _bad_request(f"Parol yetarli kuchli emas: kamida {PASSWORD_MIN_LENGTH} belgi bo'lishi kerak", 'password')
        try:
            validate_password(password, user=user)
        except ValidationError as exc:
            return _bad_request('Parol yetarli kuchli emas: ' + password_problems(exc), 'password')

        if is_self:
            if login_guard.is_locked(request, user.username):
                return Response({'error': login_guard.LOCK_MESSAGE}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            if not user.check_password(current):
                login_guard.record_failure(request, user.username, scope='restaurant')
                return _bad_request("Joriy parol noto'g'ri", 'current_password')

        with transaction.atomic():
            user.set_password(password)
            user.save(update_fields=['password'])
            log_audit(
                'staff_password_set',
                request=request,
                actor=actor,
                target_type='admin_user',
                target_id=user.id,
                new_value={'status': 'password_changed', 'self': is_self}
            )

        keep = None
        session = getattr(request._request, 'session', None)
        if is_self and session is not None and session.session_key:
            keep = session.session_key
        ended = end_sessions(user, keep_session_key=keep)
        if keep:
            # Joriy sessiya yangi parol hash'i bilan davom etadi (xodim o'zini chiqarib yubormaydi), qolganlari tugagan
            update_session_auth_hash(request._request, user)
        login_guard.clear_user(user.username)

        return Response({
            'status': 'password_changed',
            'id': user.id,
            'username': user.username,
            'sessions_ended': ended,
        })
