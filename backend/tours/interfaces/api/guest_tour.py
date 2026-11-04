"""
Mehmon sayri: `GET /api/restaurant/guest/tour/[?hall=<id>]` (ochiq, restoran `guest_shop_id` dan: QR stol restorani / tenant / asosiy).

Javob: `{enabled, title, duration, width, height, video: {scrub, play, low, poster}, stops: [...], hotspots: [...]}`; sayr yo'q,
e'lon qilinmagan yoki brendda «sayr» bo'limi o'chiq bo'lsa - `{enabled: false}`. Boshqa restoran ma'lumotiga yo'l YO'Q: restoran
so'rovdagi hech qaysi id dan olinmaydi (`hall` faqat shu restoran ichida filtr).
Javob `private`, ETag (304) va qisqa muddatli Cache-Control; server tomonda restoran bo'yicha qisqa kesh (tours/guest.py).
"""
from django.conf import settings
from django.views.decorators.http import require_GET

from backend.ratelimit import rate_limited
from tours import guest
from web.guest_api import guest_json
from web.restaurant_auth import guest_shop_id

BROWSER_CACHE = 'private, max-age=20, must-revalidate'


def _limit():
    """IP bo'yicha minutiga so'rovlar (restoran Wi-Fi'si bitta IP'dan chiqadi: keng). `GUEST_TOUR_RATE_LIMIT`."""
    try:
        return int(getattr(settings, 'GUEST_TOUR_RATE_LIMIT', 300))
    except (TypeError, ValueError):
        return 300


@require_GET
def guest_tour(request):
    blocked = rate_limited(request, 'guest_tour', limit=_limit(), seconds=60)
    if blocked is not None:
        return blocked
    raw_hall = request.GET.get('hall', '')
    hall_id = int(raw_hall) if raw_hall.isascii() and raw_hall.isdigit() and len(raw_hall) < 10 else None
    response = guest_json(request, guest.guest_payload(guest_shop_id(request), hall_id, request))
    response['Cache-Control'] = BROWSER_CACHE
    return response
