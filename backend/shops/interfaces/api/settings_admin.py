"""
Restoran Sozlamalari Admin REST API (Settings Admin API).
Do'kon egasi va menejerlar uchun umumiy restoran ma'lumotlari va biznes profilini boshqarish.
AuditLog, RBAC ('menu_admin'), validatsiya va xavfsizlik to'liq ta'minlangan.
"""
from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from web.restaurant_auth import staff_shop


class SettingsAdminView(APIView):
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
            name = str(data['name']).strip()
            if not name:
                return Response({'error': 'Restoran nomi bo\'sh bo\'lishi mumkin emas', 'field': 'name'}, status=status.HTTP_400_BAD_REQUEST)
            shop.name = name
            updated_fields.append('name')

        if 'description' in data:
            shop.description = str(data['description']).strip()
            updated_fields.append('description')

        if 'address' in data:
            shop.address = str(data['address']).strip()
            updated_fields.append('address')

        if 'phone' in data:
            shop.phone = str(data['phone']).strip()
            updated_fields.append('phone')

        if 'phone2' in data:
            shop.phone2 = str(data['phone2']).strip()
            updated_fields.append('phone2')

        if 'working_hours' in data:
            shop.working_hours = str(data['working_hours']).strip()
            updated_fields.append('working_hours')

        if 'working_days' in data:
            shop.working_days = str(data['working_days']).strip()
            updated_fields.append('working_days')

        if 'is_open' in data:
            shop.is_open = bool(data['is_open'])
            updated_fields.append('is_open')

        if 'color_primary' in data:
            color = str(data['color_primary']).strip()
            if color.startswith('#') and len(color) <= 7:
                shop.color_primary = color
                updated_fields.append('color_primary')

        if 'instagram_url' in data:
            shop.instagram_url = str(data['instagram_url']).strip()
            updated_fields.append('instagram_url')

        # Business profile ichidagi maxsus restoran sozlamalari
        bp = dict(shop.business_profile or {})
        bp_changed = False

        if 'service_fee_percent' in data:
            try:
                fee = float(data['service_fee_percent'])
                if 0 <= fee <= 100:
                    bp['service_fee_percent'] = round(fee, 2)
                    bp_changed = True
            except (ValueError, TypeError):
                pass

        if 'kds_warning_minutes' in data:
            try:
                w = int(data['kds_warning_minutes'])
                if 1 <= w <= 180:
                    bp['kds_warning_minutes'] = w
                    bp_changed = True
            except (ValueError, TypeError):
                pass

        if 'kds_critical_minutes' in data:
            try:
                c = int(data['kds_critical_minutes'])
                if 1 <= c <= 300:
                    bp['kds_critical_minutes'] = c
                    bp_changed = True
            except (ValueError, TypeError):
                pass

        if 'telegram_chat_id' in data:
            bp['telegram_chat_id'] = str(data['telegram_chat_id']).strip()
            bp_changed = True

        if 'auto_accept_orders' in data:
            bp['auto_accept_orders'] = bool(data['auto_accept_orders'])
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
