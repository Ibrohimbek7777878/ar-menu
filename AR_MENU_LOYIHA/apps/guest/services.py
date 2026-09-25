import uuid
import logging
from django.utils import timezone
from django.db import transaction
from apps.guest.models import Guest, GuestSession, SESSION_IDLE_MINUTES

log = logging.getLogger('guest.services')

DEVICE_COOKIE = 'armenu_device'
DEVICE_COOKIE_MAX_AGE = 365 * 24 * 3600      # ⚡ 1 yil


def read_device_token(request):
    """Cookie'dagi UUID. Yaroqsiz bo'lsa None."""
    raw = request.COOKIES.get(DEVICE_COOKIE, '')
    try:
        return uuid.UUID(raw)
    except (ValueError, AttributeError):
        return None


def set_device_cookie(response, token):
    response.set_cookie(DEVICE_COOKIE, str(token), max_age=DEVICE_COOKIE_MAX_AGE,
                        samesite='Lax', httponly=True, path='/')
    return response


def get_or_create_guest(restaurant_id, device_token, lang='uz'):
    """device_token bo'yicha mijozni topadi yoki yaratadi."""
    guest, created = Guest.objects.get_or_create(
        restaurant_id=restaurant_id, device_token=device_token,
        defaults={'lang': lang, 'visits': 0})
    return guest, created


@transaction.atomic
def open_session(guest, table, lang='uz'):
    """
    Ochiq sessiyani qayta ishlatadi (mijoz sahifani yangilagan bo'lishi mumkin),
    aks holda yangisini ochadi.
    """
    cutoff = timezone.now() - timezone.timedelta(minutes=SESSION_IDLE_MINUTES)

    s = (GuestSession.objects
         .filter(guest=guest, table=table, ended_at__isnull=True,
                 last_seen_at__gte=cutoff)
         .order_by('-started_at').first())

    if s:
        s.lang = lang
        s.last_seen_at = timezone.now()
        s.save(update_fields=['lang', 'last_seen_at'])
        return s, False

    # eskirgan ochiq sessiyalarni yopamiz
    GuestSession.objects.filter(guest=guest, ended_at__isnull=True,
                                last_seen_at__lt=cutoff).update(ended_at=timezone.now())

    s = GuestSession.objects.create(
        restaurant_id=guest.restaurant_id, guest=guest, table=table, lang=lang)

    Guest.objects.filter(id=guest.id).update(
        visits=guest.visits + 1, last_seen_at=timezone.now(), lang=lang)

    log.info(f'[guest] yangi sessiya {s.public_id} · stol {table.number}')
    return s, True
