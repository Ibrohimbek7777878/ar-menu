from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.payments.services import create_payme, create_click, create_uzum, verify_payment
from apps.orders.models import Order

@api_view(['POST'])
@permission_classes([AllowAny])
def create_payment(request):
    order_id=request.data.get('order_id')
    provider=request.data.get('provider','payme')
    try:
        order=Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error':'order_not_found'},status=404)
    amount=int(order.total or 0)
    if provider=='click': res=create_click(order, amount)
    elif provider=='uzum': res=create_uzum(order, amount)
    else: res=create_payme(order, amount)
    return Response(res)

@api_view(['POST'])
@permission_classes([AllowAny])
def check_payment(request):
    provider=request.data.get('provider','payme')
    tid=request.data.get('transaction_id','')
    res=verify_payment(provider, tid)
    return Response(res)
