import uuid
from django.core.exceptions import ValidationError
from django.http import Http404
from django.shortcuts import render, get_object_or_404

from apps.tenants.models import Restaurant


def kds_board(request):
    """GET /kds/?token=<kds_token> — TV brauzeri uchun"""
    token = request.GET.get('token', '').strip()
    if not token and getattr(request, 'restaurant', None) and getattr(request.restaurant, 'kds_token', None):
        token = str(request.restaurant.kds_token)

    if not token:
        return render(request, 'kds/board.html', {
            'restaurant': None,
            'kds_token': '',
            'ws_scheme': 'ws',
            'error': 'Token kerak. URL: /kds/?token=<kds_token>',
        }, status=200)

    try:
        uuid.UUID(token)
    except (ValueError, AttributeError):
        raise Http404("Noto'g'ri KDS token formati")

    try:
        rest = get_object_or_404(Restaurant, kds_token=token, is_active=True)
    except ValidationError:
        raise Http404("KDS token topilmadi")

    return render(request, 'kds/board.html', {
        'restaurant': rest,
        'kds_token': token,
        'ws_scheme': 'wss' if request.is_secure() else 'ws',
    })
