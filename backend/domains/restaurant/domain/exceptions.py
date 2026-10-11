class RestaurantDomainException(Exception):
    """Barcha restoran domeni xatoliklari uchun asosiy sinf."""
    pass


class TableNotFoundError(RestaurantDomainException):
    pass


class TableAlreadyOccupiedError(RestaurantDomainException):
    pass


class InvalidTableStateTransitionError(RestaurantDomainException):
    pass


class WaiterCallNotFoundError(RestaurantDomainException):
    pass
