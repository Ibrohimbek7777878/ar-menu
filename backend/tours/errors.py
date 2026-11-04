"""Video sayr xatolari: JSON javob `{error, code, field?}` (o'zbekcha `error`), DRF orqali `RestoAdminAPIView` shaklida."""
from rest_framework.exceptions import APIException


class TourError(APIException):
    status_code = 400
    default_code = 'invalid'

    def __init__(self, message, code='invalid', status=400, field=None):
        detail = {'error': message, 'code': code}
        if field:
            detail['field'] = field
        super().__init__(detail)
        self.status_code = status
        self.message = message
        self.code = code
        self.field = field

    def __str__(self):
        return self.message


def not_found():
    return TourError("Sayr topilmadi", 'not_found', 404)
