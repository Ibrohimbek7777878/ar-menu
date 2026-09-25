from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.models import Staff
from apps.accounts.serializers import StaffSerializer
from core.permissions import IsRestAdmin


class AdminStaffDetailView(APIView):
    """
    GET /v1/admin/staff/<id>/ — tenant-scoped.
    ⚡ Cross-tenant kirish 403/404.
    """
    permission_classes = [IsRestAdmin]

    def get(self, request, pk):
        # request.restaurant_id is from JWT (authenticated)
        rid = getattr(request, 'restaurant_id', None)
        if rid is None:
            return Response({'detail': 'Restoran aniqlanmadi'}, status=403)
        # Try to fetch staff that belongs to this restaurant
        staff = Staff.objects.filter(id=pk, restaurant_id=rid).first()
        if staff is None:
            # Check if exists in other restaurant → 404 to hide existence
            if Staff.objects.filter(id=pk).exists():
                return Response({'detail': 'Topilmadi'}, status=404)
            return Response({'detail': 'Topilmadi'}, status=404)
        return Response(StaffSerializer(staff).data)
