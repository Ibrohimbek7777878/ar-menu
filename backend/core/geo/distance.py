import math


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Yer sharidagi ikki nuqta orasidagi masofani (km) Haversine formulasi orqali hisoblash.
    """
    R = 6371.0  # Yer radiusi (km)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def calculate_delivery_fee(distance_km: float, base_fee: float = 10000.0, per_km_fee: float = 2000.0) -> float:
    """Masofaga qarab yetkazib berish narxini hisoblash."""
    if distance_km <= 3.0:
        return base_fee
    extra_km = distance_km - 3.0
    return round(base_fee + (extra_km * per_km_fee), -2)
