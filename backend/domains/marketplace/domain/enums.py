from enum import Enum


class ProductStatus(str, Enum):
    ACTIVE = 'active'
    DRAFT = 'draft'
    ARCHIVED = 'archived'
    OUT_OF_STOCK = 'out_of_stock'


class CourierStatus(str, Enum):
    AVAILABLE = 'available'
    BUSY = 'busy'
    OFFLINE = 'offline'


class DeliveryType(str, Enum):
    STANDARD = 'standard'
    EXPRESS = 'express'
    PICKUP = 'pickup'
