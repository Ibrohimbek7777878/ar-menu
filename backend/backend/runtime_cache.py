"""
S1-2 / S1-3 (TZ T2, T15): har so'rovda bir xil javob beradigan DB o'qishlarini jarayon ichida qisqa muddat saqlash.

Nima keshlanadi:
- `AppSetting` jadvalining to'liq nusxasi (kalit -> qiymat). Avval `/menu/` da 3 ta alohida SQL ketardi
  (`site_context`, `spa_session`, asosiy restoran slug'i).
- Asosiy restoranning **ID** si. Do'konning o'zi (Shop nusxasi) keshlanmaydi: jarayondagi umumiy model obyektini biror joy
  `save()` qilib yuborsa, boshqa oqimlarga eskirgan maydonlarni yozib yuborishi mumkin. ID bo'yicha qidiruv esa bitta
  PK so'rovi.

Qoidalar:
- TTL `settings.APPSETTING_CACHE_TTL` (soniya). **0 = o'chiq**: har chaqiruvda DB (eski xatti-harakat). Testlarda 0 (har test
  o'z tranzaksiyasida ishlaydi; rollback signal bermaydi, kesh test chegarasidan o'tib qolmasligi kerak).
- Yozish: `AppSetting`/`Shop`/`Table` o'zgarsa signal shu jarayon keshini darhol tozalaydi. `QuerySet.update()` signal bermaydi:
  shunday joylar `invalidate_runtime_cache()` ni o'zi chaqiradi. Boshqa jarayonlar (gunicorn worker'lar) o'zgarishni
  **TTL ichida (standart 5 s)** ko'radi; admin sozlamalar sahifasi DB'dan to'g'ridan-to'g'ri o'qiydi, shuning uchun u darhol.
- Oqimlar xavfsizligi: snapshot hech qachon joyida o'zgartirilmaydi, to'liq yangi lug'at bilan almashtiriladi. Yuklash paytida
  bekor qilish bo'lsa (generation o'zgardi), eskirgan natija keshga yozilmaydi.
"""
import threading
import time

from django.conf import settings

_lock = threading.Lock()
_generation = 0
_settings_snapshot = None  # (amal qilish muddati [monotonic], {key: value})
_default_shop_cache = None  # (amal qilish muddati, slug, shop_id)
_shop_value_cache = {}  # {(egasi, kalit): (amal qilish muddati, qiymat)}: do'kon bo'yicha kichik qiymatlar (masalan fasl)
_SHOP_VALUE_CACHE_MAX = 512


def _ttl() -> float:
    try:
        return max(0.0, float(getattr(settings, 'APPSETTING_CACHE_TTL', 0) or 0))
    except (TypeError, ValueError):
        return 0.0


def runtime_cache_enabled() -> bool:
    return _ttl() > 0


def invalidate_runtime_cache() -> None:
    """Shu jarayon keshini tozalaydi (sozlama, do'kon yoki stol o'zgarganda)."""
    global _generation, _settings_snapshot, _default_shop_cache, _shop_value_cache
    with _lock:
        _generation += 1
        _settings_snapshot = None
        _default_shop_cache = None
        _shop_value_cache = {}


def _load_app_settings() -> dict:
    from notifications.models import AppSetting
    return {row.key: row.value for row in AppSetting.objects.all()}


def get_app_settings() -> dict:
    """AppSetting'larning {key: value} nusxasi. Qaytarilgan lug'atni chaqiruvchi o'zgartirishi mumkin (har safar nusxa)."""
    global _settings_snapshot
    ttl = _ttl()
    if ttl <= 0:
        return _load_app_settings()
    snap = _settings_snapshot
    now = time.monotonic()
    if snap is not None and snap[0] > now:
        return dict(snap[1])
    gen = _generation
    data = _load_app_settings()
    with _lock:
        if gen == _generation:
            _settings_snapshot = (now + ttl, data)
    return dict(data)


def get_app_setting(key: str):
    """Bitta kalit qiymati (`str`) yoki None. `key` kichik harfga keltiriladi (jadvaldagi kalitlar kichik harfda)."""
    return get_app_settings().get(str(key).lower())


def cached_default_shop_id(slug: str, resolver):
    """
    Asosiy restoran ID si. `resolver()` kesh bo'sh yoki muddati o'tgan bo'lsa to'liq qidiruvni bajaradi va ID (yoki None)
    qaytaradi. Slug o'zgargan bo'lsa (admin boshqa restoran tanladi) kesh yaroqsiz hisoblanadi.
    """
    global _default_shop_cache
    ttl = _ttl()
    if ttl <= 0:
        return resolver()
    entry = _default_shop_cache
    now = time.monotonic()
    if entry is not None and entry[0] > now and entry[1] == slug:
        return entry[2]
    gen = _generation
    shop_id = resolver()
    with _lock:
        if gen == _generation and shop_id is not None:
            _default_shop_cache = (now + ttl, slug, shop_id)
    return shop_id


def cached_shop_value(owner, key: str, resolver):
    """
    Do'kon (yoki stol tokeni) bo'yicha kichik qiymat: `resolver()` natijasi TTL soniya jarayonda saqlanadi.
    `owner` — hash'lanadigan kalit (shop_id yoki ('table', token)). TTL=0 da har safar `resolver()` (kesh o'chiq).
    Natija `None` bo'lishi mumkin va u ham saqlanadi. Do'kon/stol/sozlama o'zgarsa signal hammasini tozalaydi.
    """
    global _shop_value_cache
    ttl = _ttl()
    if ttl <= 0:
        return resolver()
    cache_key = (owner, key)
    now = time.monotonic()
    entry = _shop_value_cache.get(cache_key)
    if entry is not None and entry[0] > now:
        return entry[1]
    gen = _generation
    value = resolver()
    with _lock:
        if gen == _generation:
            if len(_shop_value_cache) >= _SHOP_VALUE_CACHE_MAX:
                _shop_value_cache = {}  # chegaradan oshsa to'liq tozalanadi (oddiy, o'sib ketmaydi)
            _shop_value_cache[cache_key] = (now + ttl, value)
    return value


def _on_change(sender, **kwargs):
    invalidate_runtime_cache()


def connect_runtime_cache_signals():
    from django.db.models.signals import post_delete, post_save
    from notifications.models import AppSetting
    from shops.models import Shop
    from tables_restaurant.models import Table
    for model in (AppSetting, Shop, Table):
        tag = f'runtime_cache_{model.__name__}'
        post_save.connect(_on_change, sender=model, dispatch_uid=f'{tag}_save')
        post_delete.connect(_on_change, sender=model, dispatch_uid=f'{tag}_del')
