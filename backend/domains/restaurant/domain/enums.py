from enum import Enum


class TableStatus(str, Enum):
    FREE = 'free'
    OCCUPIED = 'occupied'
    RESERVED = 'reserved'
    CLEANING = 'cleaning'


class WaiterCallType(str, Enum):
    WAITER = 'waiter'
    BILL = 'bill'
    WATER = 'water'
    HOOKAH = 'hookah'
    OTHER = 'other'


class WaiterCallStatus(str, Enum):
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'


class KdsItemStatus(str, Enum):
    NEW = 'new'
    COOKING = 'cooking'
    READY = 'ready'
    SERVED = 'served'
    CANCELLED = 'cancelled'
