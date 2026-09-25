import json
from django.shortcuts import redirect, get_object_or_404, render
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

from orders.models import Order
from .models import Payment
from .payment_service import create_order_payment, confirm_webhook, get_payment_status


@csrf_exempt
@require_POST
def payment_create(request, order_pk):
    """To'lov yaratish."""
    order = get_object_or_404(Order, pk=order_pk)
    method = request.POST.get('method', 'cash')
    return_url = request.build_absolute_uri('/payment/success/')

    result = create_order_payment(order, method, return_url)

    if result['success']:
        if result.get('payment_url'):
            return redirect(result['payment_url'])
        messages.success(request, result.get('message', 'To\'lov yaratildi'))
        return redirect('customer_orders')
    else:
        messages.error(request, result.get('error', 'To\'lov xatolik'))
        return redirect('customer_cart')


@csrf_exempt
@require_POST
def payment_callback_click(request):
    """Click webhook — to'lov tasdiqlash."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST.dict()

    result = confirm_webhook('click', data)
    return JsonResponse(result)


@csrf_exempt
@require_POST
def payment_callback_payme(request):
    """Payme webhook — to'lov tasdiqlash."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST.dict()

    result = confirm_webhook('payme', data)
    return JsonResponse(result)


@csrf_exempt
@require_POST
def payment_callback_uzcard(request):
    """UzCard webhook — to'lov tasdiqlash."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST.dict()

    result = confirm_webhook('uzcard', data)
    return JsonResponse(result)


def payment_status(request, payment_id):
    """To'lov holatini tekshirish."""
    result = get_payment_status(payment_id)
    return JsonResponse(result)


def payment_success_page(request):
    """To'lov muvaffaqiyatli sahifasi."""
    return render(request, 'customer/payment_success.html')


def payment_failed_page(request):
    """To'lov xatolik sahifasi."""
    return render(request, 'customer/payment_failed.html')
