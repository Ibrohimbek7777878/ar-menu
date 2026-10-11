"""⚡ Platforma admini uchun majburiy 2FA (Google Authenticator / Authy)"""
import pyotp
from django.conf import settings

ISSUER = 'ARMENU'


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(user, secret: str) -> str:
    """QR kod uchun otpauth:// URI"""
    return pyotp.TOTP(secret).provisioning_uri(name=user.phone, issuer_name=ISSUER)


def verify(secret: str, code: str, window: int = 1) -> bool:
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(str(code).strip(), valid_window=window)
    except Exception:
        return False


def qr_png_bytes(uri: str) -> bytes:
    import io
    import qrcode
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()
