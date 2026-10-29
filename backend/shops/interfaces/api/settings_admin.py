"""
Restoran Sozlamalari Admin REST API (Settings Admin API).
Do'kon egasi va menejerlar uchun umumiy restoran ma'lumotlari va biznes profilini boshqarish.
AuditLog, RBAC ('menu_admin'), validatsiya va xavfsizlik to'liq ta'minlangan.
"""
from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response

from backend.api_input import (
    InputError,
    RestoAdminAPIView,
    parse_bool,
    parse_decimal,
    parse_int,
    parse_telegram_chat_id,
    parse_text,
)
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from web.restaurant_auth import staff_shop


class SettingsAdminView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/settings/ — Restoran sozlamalarini olish.
    PATCH /api/restaurant/admin/v1/settings/ — Restoran sozlamalarini yangilash.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('menu_admin')]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        bp = shop.business_profile or {}

        return Response({
            'id': shop.id,
            'name': shop.name,
            'slug': shop.slug,
            'description': shop.description or '',
            'address': shop.address or '',
            'phone': shop.phone or '',
            'phone2': shop.phone2 or '',
            'working_hours': shop.working_hours or '08:00-22:00',
            'working_days': shop.working_days or 'Dush-Yak',
            'is_open': bool(shop.is_open),
            'color_primary': shop.color_primary or '#16a34a',
            'color_accent': shop.color_accent or '#1A1A2E',
            'instagram_url': shop.instagram_url or '',
            'service_fee_percent': float(bp.get('service_fee_percent', 0)),
            'kds_warning_minutes': int(bp.get('kds_warning_minutes', 15)),
            'kds_critical_minutes': int(bp.get('kds_critical_minutes', 30)),
            'telegram_chat_id': str(bp.get('telegram_chat_id', '')),
            'auto_accept_orders': bool(bp.get('auto_accept_orders', False)),
            'panel_scope': getattr(shop, 'panel_scope', 'restaurant'),
        })

    def patch(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        old_values = {
            'name': shop.name,
            'address': shop.address,
            'phone': shop.phone,
            'is_open': shop.is_open,
        }

        updated_fields = []

        if 'name' in data:
            name = parse_text(data['name'], 'name', max_length=200)
            if not name:
                return Response({'error': 'Restoran nomi bo\'sh bo\'lishi mumkin emas', 'field': 'name'}, status=status.HTTP_400_BAD_REQUEST)
            shop.name = name
            updated_fields.append('name')

        # Matnli maydonlar: (kalit, maksimal uzunlik) — Shop modelidagi ustun uzunliklari (PostgreSQL ularni tekshiradi)
        for key, limit in (('description', 5000), ('address', 500), ('phone', 20), ('phone2', 20),
                           ('working_hours', 50), ('working_days', 50), ('instagram_url', 200)):
            if key in data:
                setattr(shop, key, parse_text(data[key], key, max_length=limit))
                updated_fields.append(key)

        if 'is_open' in data:
            shop.is_open = parse_bool(data['is_open'], 'is_open')
            updated_fields.append('is_open')

        if 'color_primary' in data:
            color = parse_text(data['color_primary'], 'color_primary', max_length=7)
            if not (color.startswith('#') and len(color) in (4, 7) and all(c in '0123456789abcdefABCDEF' for c in color[1:])):
                return Response({'error': "Rang #RGB yoki #RRGGBB ko'rinishida bo'lishi kerak", 'field': 'color_primary'},
                                status=status.HTTP_400_BAD_REQUEST)
            shop.color_primary = color
            updated_fields.append('color_primary')

        # Business profile ichidagi maxsus restoran sozlamalari
        bp = dict(shop.business_profile or {})
        bp_changed = False

        if 'service_fee_percent' in data:
            bp['service_fee_percent'] = float(parse_decimal(
                data['service_fee_percent'], 'service_fee_percent', minimum=Decimal('0'), maximum=Decimal('100')))
            bp_changed = True

        if 'kds_warning_minutes' in data:
            bp['kds_warning_minutes'] = parse_int(data['kds_warning_minutes'], 'kds_warning_minutes', minimum=1, maximum=180)
            bp_changed = True

        if 'kds_critical_minutes' in data:
            bp['kds_critical_minutes'] = parse_int(data['kds_critical_minutes'], 'kds_critical_minutes', minimum=1, maximum=300)
            bp_changed = True

        if 'telegram_chat_id' in data:
            chat_id = parse_telegram_chat_id(data['telegram_chat_id'])
            if chat_id:
                # Chat ID botda ADMIN huquqini beradi: boshqa egaga tegishli do'konga bog'langan chatni olib bo'lmaydi
                from notifications.admin_bot import shops_bound_to_chat
                for other in shops_bound_to_chat(chat_id):
                    if other.pk != shop.pk and (shop.owner_id is None or other.owner_id != shop.owner_id):
                        raise InputError("Bu Telegram chat ID boshqa restoranga biriktirilgan", 'telegram_chat_id')
            bp['telegram_chat_id'] = chat_id
            bp_changed = True

        if 'auto_accept_orders' in data:
            bp['auto_accept_orders'] = parse_bool(data['auto_accept_orders'], 'auto_accept_orders')
            bp_changed = True

        if bp_changed:
            shop.business_profile = bp
            updated_fields.append('business_profile')

        if updated_fields:
            shop.save(update_fields=updated_fields)

            log_audit(
                'shop_settings_updated',
                request=request,
                actor=request.user,
                target_type='shop',
                target_id=shop.id,
                old_value=old_values,
                new_value={'updated_fields': updated_fields}
            )

        return self.get(request)
