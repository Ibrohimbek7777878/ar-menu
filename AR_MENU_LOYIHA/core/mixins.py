from rest_framework.exceptions import PermissionDenied


class TenantScopedMixin:
    """
    ⚡ ViewSet'ga qo'shilsa — queryset avtomatik restaurant_id bo'yicha filtrlanadi.
    Har bir tenant ViewSet'da ISHLATILISHI SHART.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        rid = getattr(self.request, 'restaurant_id', None)
        if rid is None:
            raise PermissionDenied('Restoran aniqlanmadi')
        return qs.filter(restaurant_id=rid)

    def perform_create(self, serializer):
        serializer.save(restaurant_id=self.request.restaurant_id)


class SoftDeleteMixin:
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
