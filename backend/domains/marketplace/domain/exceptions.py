class MarketplaceDomainException(Exception):
    pass


class ProductOutOfStockError(MarketplaceDomainException):
    pass


class ShopClosedError(MarketplaceDomainException):
    pass


class InvalidPriceError(MarketplaceDomainException):
    pass
