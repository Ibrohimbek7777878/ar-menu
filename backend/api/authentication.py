"""
Flutter API autentifikatsiyasi.

Ikkala token turini qo'llab-quvvatlaydi:
- Mijoz tokeni: `customer_id` claim bilan (api_register/api_login chiqaradi) → request.user = Customer
- Sotuvchi/admin tokeni: standart `user_id` claim (RefreshToken.for_user) → request.user = AdminUser
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from accounts.models import Customer, AdminUser
from couriers.models import Courier


class MultiUserJWTAuthentication(JWTAuthentication):
    """customer_id claim → Customer, courier_id claim → Courier, aks holda standart AdminUser oqimi."""

    def get_user(self, validated_token):
        customer_id = validated_token.get('customer_id')
        if customer_id is not None:
            try:
                return Customer.objects.get(id=customer_id, is_active=True)
            except Customer.DoesNotExist:
                raise InvalidToken('Foydalanuvchi topilmadi yoki bloklangan')
            except (TypeError, ValueError):
                raise InvalidToken('Token ichida customer_id noto\'g\'ri')

        courier_id = validated_token.get('courier_id')
        if courier_id is not None:
            try:
                return Courier.objects.get(id=courier_id, status__in=['active', 'busy'])
            except Courier.DoesNotExist:
                raise InvalidToken('Kuryer topilmadi yoki faol emas')
            except (TypeError, ValueError):
                raise InvalidToken('Token ichida courier_id noto\'g\'ri')

        user_id = validated_token.get('user_id')
        if user_id is not None:
            try:
                return AdminUser.objects.get(pk=user_id, is_active=True)
            except AdminUser.DoesNotExist:
                raise InvalidToken('Foydalanuvchi topilmadi')

        raise InvalidToken('Token user_id/customer_id/courier_id claim\'ini o\'z ichiga olmaydi')
