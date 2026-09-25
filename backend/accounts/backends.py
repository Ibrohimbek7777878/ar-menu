"""
Custom authentication backends — Customer model uchun.
"""
from django.contrib.auth.backends import ModelBackend
from accounts.models import Customer


class CustomerBackend(ModelBackend):
    """Customer model uchun authentication backend."""

    def authenticate(self, request, phone=None, password=None, **kwargs):
        if phone is None:
            phone = kwargs.get('username')

        if phone is None:
            return None

        try:
            customer = Customer.objects.get(phone=phone)
        except Customer.DoesNotExist:
            return None

        if password and customer.check_password(password):
            return customer
        return None

    def get_user(self, user_id):
        try:
            return Customer.objects.get(pk=user_id)
        except Customer.DoesNotExist:
            return None
