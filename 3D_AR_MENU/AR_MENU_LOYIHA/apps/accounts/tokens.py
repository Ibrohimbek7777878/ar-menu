"""
⚡ ENG MUHIM XAVFSIZLIK NUQTASI.
restaurant_id token ichida imzolanadi — klient uni o'zgartira olmaydi.
Har so'rovda TenantMiddleware token'dan restaurant_id ni oladi.
⛔ restaurant_id ni HECH QACHON so'rov body/query'dan olma.
"""
import uuid
import logging
import datetime as dt
import jwt
from django.conf import settings
from django.core.cache import cache

log = logging.getLogger('accounts.tokens')

ALG = 'HS256'
ACCESS_TTL = 60 * 60 * 12          # 12 soat (smena davomiyligi)
REFRESH_TTL = 60 * 60 * 24 * 30     # 30 kun


def _secret() -> str:
    return getattr(settings, 'JWT_SECRET', None) or settings.SECRET_KEY


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def make_access(staff) -> str:
    payload = {
        'typ': 'access',
        'sub': str(staff.id),
        'rid': staff.restaurant_id,        # ⚡ restaurant_id — imzolangan
        'role': staff.role,
        'name': staff.full_name,
        'uid': staff.user_id,
        'jti': str(uuid.uuid4()),
        'iat': int(_now().timestamp()),
        'exp': int((_now() + dt.timedelta(seconds=ACCESS_TTL)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALG)


def make_refresh(staff) -> str:
    jti = str(uuid.uuid4())
    payload = {
        'typ': 'refresh',
        'sub': str(staff.id),
        'rid': staff.restaurant_id,
        'jti': jti,
        'iat': int(_now().timestamp()),
        'exp': int((_now() + dt.timedelta(seconds=REFRESH_TTL)).timestamp()),
    }
    cache.set(f'rt:{jti}', staff.id, REFRESH_TTL)     # bekor qilish uchun
    return jwt.encode(payload, _secret(), algorithm=ALG)


def make_pair(staff) -> dict:
    return {
        'access': make_access(staff),
        'refresh': make_refresh(staff),
        'expires_in': ACCESS_TTL,
    }


def make_platform_token(user) -> str:
    """Super-admin tokeni — rid YO'Q (platforma darajasi)"""
    payload = {
        'typ': 'platform',
        'sub': str(user.id),
        'rid': None,
        'role': 'platform_admin',
        'jti': str(uuid.uuid4()),
        'iat': int(_now().timestamp()),
        'exp': int((_now() + dt.timedelta(seconds=ACCESS_TTL)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALG)


def decode(token: str, expect_typ: str = None) -> dict:
    """Xato bo'lsa jwt.PyJWTError tashlaydi"""
    data = jwt.decode(token, _secret(), algorithms=[ALG])
    if expect_typ and data.get('typ') != expect_typ:
        raise jwt.InvalidTokenError(f'token turi noto\'g\'ri: {data.get("typ")}')
    return data


def revoke_refresh(jti: str):
    cache.delete(f'rt:{jti}')


def refresh_is_valid(jti: str) -> bool:
    return cache.get(f'rt:{jti}') is not None
