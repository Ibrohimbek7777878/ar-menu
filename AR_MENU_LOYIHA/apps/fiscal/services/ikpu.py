"""
⚡ IKPU kodini avtomatik topish — tasnif.soliq.uz ochiq API.
Admin taom nomini yozadi → tizim mos kodlarni taklif qiladi.

⛔ Tashqi xizmat — CircuitBreaker + kesh MAJBURIY (yiqilsa menyu ishlab tursin).
"""
import logging
import requests
from django.core.cache import cache
from core.resilience import CircuitBreaker, retry

log = logging.getLogger('fiscal.ikpu')

BASE_URL = 'https://tasnif.soliq.uz/api/cls-api/mxik/search/'
TIMEOUT = 6
CACHE_TTL = 60 * 60 * 24 * 7            # 7 kun (kodlar kam o'zgaradi)

_cb = CircuitBreaker('tasnif_soliq', fail_threshold=4, timeout=180)


@retry(times=2, delay=0.5, exceptions=(requests.RequestException,))
def _fetch(query: str, size: int = 20) -> list:
    resp = requests.get(BASE_URL, params={'search': query, 'size': size,
                                          'page': 0, 'lang': 'uz'},
                        timeout=TIMEOUT,
                        headers={'User-Agent': 'ARMENU/1.0'})
    resp.raise_for_status()
    payload = resp.json() or {}
    items = payload.get('data') or payload.get('content') or []
    out = []
    for it in items:
        code = str(it.get('mxikCode') or it.get('code') or '').strip()
        if not code:
            continue
        out.append({
            'code': code,
            'name_uz': it.get('nameUz') or it.get('name') or '',
            'name_ru': it.get('nameRu') or '',
            'group': it.get('groupName') or '',
            'package_codes': [
                {'code': str(p.get('code') or ''), 'name': p.get('nameUz') or ''}
                for p in (it.get('packageNames') or it.get('units') or [])
            ][:10],
        })
    return out


def search_ikpu(query: str, size: int = 20) -> dict:
    """
    Qaytadi: {'ok': bool, 'source': 'api|cache|fallback', 'items': [...]}
    ⚡ Xizmat yiqilsa — lokal FALLBACK jadvali (asosiy taomlar).
    """
    q = (query or '').strip().lower()[:60]
    if len(q) < 2:
        return {'ok': True, 'source': 'none', 'items': []}

    key = f'ikpu:q:{q}:{size}'
    cached = cache.get(key)
    if cached is not None:
        return {'ok': True, 'source': 'cache', 'items': cached}

    def _fallback():
        log.warning(f'[ikpu] tasnif.soliq.uz yiqilgan — lokal jadval: {q}')
        return _local_fallback(q)

    try:
        items = _cb.call(_fetch, q, size, fallback=_fallback)
    except Exception as e:
        log.error(f'[ikpu] xato: {e}')
        return {'ok': False, 'source': 'fallback', 'items': _local_fallback(q)}

    if items:
        cache.set(key, items, CACHE_TTL)
    return {'ok': True, 'source': 'api' if items else 'fallback', 'items': items}


# ⚡ Eng ko'p ishlatiladigan restoran IKPU kodlari (xizmat yiqilganda)
LOCAL_TABLE = [
    {'code': '10391001001000000', 'name_uz': 'Tayyor taomlar (issiq)', 'group': 'Taom'},
    {'code': '10391002001000000', 'name_uz': 'Salatlar', 'group': 'Taom'},
    {'code': '10391003001000000', 'name_uz': 'Sho\'rvalar', 'group': 'Taom'},
    {'code': '10711001001000000', 'name_uz': 'Non va non mahsulotlari', 'group': 'Non'},
    {'code': '11071001001000000', 'name_uz': 'Alkogolsiz ichimliklar', 'group': 'Ichimlik'},
    {'code': '11072001001000000', 'name_uz': 'Choy, kofe', 'group': 'Ichimlik'},
    {'code': '10521001001000000', 'name_uz': 'Muzqaymoq va shirinliklar', 'group': 'Desert'},
]


def _local_fallback(q: str) -> list:
    hits = [x for x in LOCAL_TABLE if q in x['name_uz'].lower()]
    return hits or LOCAL_TABLE[:3]


def suggest_for_dish(dish) -> list:
    """Taom nomi bo'yicha IKPU taklif — admin panelda tugma bosilganda"""
    res = search_ikpu(dish.name_uz)
    return res['items'][:5]
