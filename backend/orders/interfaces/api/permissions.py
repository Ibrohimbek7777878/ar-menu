"""
Restoran REST API ruxsatlari (TZ: R-SEC-02).

Avval global AllowAny tufayli istalgan anonim so'rov stol hisobini yopib, moliyani o'qiy olardi.
Endi: mehmon endpoint'lari ochiq (menyu, buyurtma, chaqiruv, bron yaratish),
xodim endpoint'lari faqat login qilgan xodimga va faqat o'z restorani doirasida.
"""
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission

from api.authentication import MultiUserJWTAuthentication
from web.restaurant_auth import RESTAURANT_MANAGER_ROLES, is_restaurant_staff

# React xodim panellari Django sessiyasi bilan ishlaydi (CSRF tekshiriladi), Flutter/Bot — JWT bilan.
RESTAURANT_API_AUTHENTICATION = [SessionAuthentication, MultiUserJWTAuthentication]


class IsRestaurantStaff(BasePermission):
    message = "Bu amal faqat restoran xodimlari uchun."

    def has_permission(self, request, view):
        return is_restaurant_staff(request.user)


class IsRestaurantManager(BasePermission):
    message = "Bu amal faqat restoran rahbariyati uchun."

    def has_permission(self, request, view):
        return is_restaurant_staff(request.user, RESTAURANT_MANAGER_ROLES)
