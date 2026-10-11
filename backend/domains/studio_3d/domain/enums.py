from enum import Enum


class PrintStatus(str, Enum):
    NEW = 'new'
    CONFIRMED = 'confirmed'
    SLICING = 'slicing'
    PRINTING = 'printing'
    READY = 'ready'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'


class MaterialType(str, Enum):
    PLA = 'PLA'
    PETG = 'PETG'
    ABS = 'ABS'
    RESIN = 'Resin'
    TPU = 'TPU'
