from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Courier
from .serializers import CourierSerializer, CourierLocationSerializer


class CourierViewSet(viewsets.ModelViewSet):
    queryset = Courier.objects.all()
    serializer_class = CourierSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['patch'])
    def update_location(self, request, pk=None):
        courier = self.get_object()
        serializer = CourierLocationSerializer(courier, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        couriers = Courier.objects.filter(status='active')
        serializer = CourierSerializer(couriers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def go_online(self, request, pk=None):
        courier = self.get_object()
        courier.status = 'active'
        courier.save()
        return Response({'status': 'online'})

    @action(detail=True, methods=['post'])
    def go_offline(self, request, pk=None):
        courier = self.get_object()
        courier.status = 'offline'
        courier.save()
        return Response({'status': 'offline'})
