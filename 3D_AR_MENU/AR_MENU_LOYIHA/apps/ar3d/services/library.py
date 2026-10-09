import logging
import re
import unicodedata

from django.db.models import Q

from apps.ar3d.models import DishLibrary

log = logging.getLogger('ar3d.library')

# Kirill ↔ lotin (o'zbekcha)
CYR2LAT = str.maketrans({
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'x', 'ц': 's', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '',
    'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
})

NORMALIZE = [
    (r"o['`ʻʼ‘’]", 'o'), (r"g['`ʻʼ‘’]", 'g'),
    (r'\bsh\b', 'sh'), (r'ch', 'ch'),
    (r'[^a-z0-9\s]', ' '), (r'\s+', ' '),
]


def normalize(text: str) -> str:
    """O'sh, Ош, OSH, o`sh → osh"""
    if not text:
        return ''
    s = unicodedata.normalize('NFKD', str(text)).lower().strip()
    s = s.translate(CYR2LAT)
    for pat, rep in NORMALIZE:
        s = re.sub(pat, rep, s)
    return s.strip()


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def find_by_name(name: str, category_key: str = '', min_quality: int = 1):
    """
    3 bosqichli qidiruv. Topsa (DishLibrary, ishonch 0-1) qaytaradi.
    1. Aniq kalit / nom mosligi → 1.00
    2. Alias massivida bor → 0.95
    3. Normalizatsiya + tahrir masofasi → 0.70-0.90
    """
    if not name:
        return None, 0.0

    norm = normalize(name)
    if not norm:
        return None, 0.0

    qs = DishLibrary.objects.filter(is_active=True, quality__gte=min_quality)
    if category_key:
        qs = qs.filter(Q(category_key=category_key) | Q(category_key=''))

    # 1. Aniq moslik
    exact = qs.filter(
        Q(key=norm.replace(' ', '-')) |
        Q(name_uz__iexact=name) | Q(name_ru__iexact=name) | Q(name_en__iexact=name)
    ).order_by('-quality', '-used_by_count').first()
    if exact:
        log.info(f'[lib] aniq moslik: "{name}" → {exact.key}')
        return exact, 1.0

    # 2. Alias (GIN indeks orqali tez)
    try:
        alias_hit = qs.filter(
            Q(aliases__contains=[norm]) | Q(aliases__contains=[name.lower()])
        ).order_by('-quality', '-used_by_count').first()
        if alias_hit:
            log.info(f'[lib] alias moslik: "{name}" → {alias_hit.key}')
            return alias_hit, 0.95
    except Exception:
        # fallback: python-side filter if DB doesn't support contains
        for lib in qs.only('id', 'key', 'name_uz', 'aliases', 'quality', 'used_by_count')[:500]:
            al = [normalize(a) for a in (lib.aliases or [])]
            if norm in al or name.lower() in [a.lower() for a in (lib.aliases or [])]:
                log.info(f'[lib] alias moslik (fallback): "{name}" → {lib.key}')
                return lib, 0.95

    # 3. Fuzzy
    best, best_score = None, 0.0
    for lib in qs.only('id', 'key', 'name_uz', 'name_ru', 'name_en', 'aliases', 'quality', 'used_by_count')[:2000]:
        cands = [lib.key.replace('-', ' '), lib.name_uz, lib.name_ru, lib.name_en]
        cands += list(lib.aliases or [])
        for c in cands:
            cn = normalize(c)
            if not cn:
                continue
            if cn in norm or norm in cn:
                score = 0.90
            else:
                dist = _levenshtein(norm, cn)
                maxlen = max(len(norm), len(cn)) or 1
                score = 1.0 - dist / maxlen
            if score > best_score:
                best, best_score = lib, score

    if best and best_score >= 0.78:
        log.info(f'[lib] fuzzy moslik: "{name}" → {best.key} ({best_score:.2f})')
        return best, round(best_score, 2)

    log.info(f'[lib] "{name}" kutubxonada topilmadi')
    return None, 0.0


# ---- V-127 Semantic ----
try:
    from pgvector.django import CosineDistance
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False
    CosineDistance = None

EMB_DIM = 768
SEMANTIC_THRESHOLD = 0.28


def build_embedding_text(name: str, desc: str = '', ingredients: str = '', category: str = '') -> str:
    parts = [name, name, category, desc[:300], ingredients[:200]]
    return ' | '.join(p for p in parts if p)


def get_embedding(text: str):
    """
    MCP orqali embedding oladi (Gemini/OpenAI — arzon).
    Xato bo'lsa None qaytadi.
    Faza 9 tugamagan bo'lsa — doim None.
    """
    try:
        from apps.ai.mcp.router import mcp
        from apps.ai.mcp.base import MCPRequest
    except ImportError:
        return None
    try:
        resp = mcp.run(MCPRequest(task='embedding', prompt=text[:2000], timeout=20))
        if not resp.ok or not resp.content:
            log.warning(f'[lib] embedding olinmadi: {getattr(resp, "error", "?")}')
            return None
        vec = resp.content if isinstance(resp.content, list) else resp.content.get('embedding')
        if not vec or len(vec) != EMB_DIM:
            log.warning(f'[lib] embedding o\'lchami noto\'g\'ri: {len(vec) if vec else 0}')
            return None
        return vec
    except Exception as e:
        log.warning(f'[lib] embedding xatosi: {e}')
        return None


def find_semantic(name: str, desc: str = '', ingredients: str = '', category_key: str = '', top_k: int = 5):
    """
    Semantik qidiruv — pgvector HNSW indeks orqali.
    """
    text = build_embedding_text(name, desc, ingredients, category_key)
    vec = get_embedding(text)
    if vec is None:
        return None, 0.0

    if not HAS_PGVECTOR:
        return None, 0.0

    qs = DishLibrary.objects.filter(is_active=True, embedding__isnull=False)
    if category_key:
        qs = qs.filter(category_key=category_key)

    try:
        rows = list(qs.annotate(dist=CosineDistance('embedding', vec)).order_by('dist')[:top_k])
    except Exception as e:
        log.warning(f'[lib] semantic query xato: {e}')
        return None, 0.0

    if not rows:
        return None, 0.0

    best = rows[0]
    dist = float(getattr(best, 'dist', 1.0))
    if dist > SEMANTIC_THRESHOLD:
        log.info(f'[lib] semantik: eng yaqini {best.key} (dist={dist:.3f}) — uzoq')
        return None, 0.0

    confidence = round(max(0.0, 1.0 - dist), 2)
    log.info(f'[lib] semantik moslik: "{name}" → {best.key} (dist={dist:.3f}, ishonch={confidence})')
    return best, confidence


def find_best(dish, min_confidence: float = 0.78):
    """
    To'liq qidiruv zanjiri — worker shuni chaqiradi.
      1. Nom/alias (bepul, tez)
      2. Semantik (arzon: ~$0.0001)
    """
    cat_key = getattr(getattr(dish, 'category', None), 'library_key', '') or getattr(dish, 'category_key', '') or ''

    lib, score = find_by_name(getattr(dish, 'name_uz', '') or '', category_key=cat_key)
    if lib and score >= min_confidence:
        return lib, score, 'name'

    lib2, score2 = find_semantic(
        getattr(dish, 'name_uz', '') or '', desc=getattr(dish, 'desc_uz', '') or '',
        ingredients=getattr(dish, 'ingredients_uz', '') or '', category_key=cat_key)
    if lib2 and score2 >= min_confidence:
        return lib2, score2, 'semantic'

    return None, max(score, score2), 'none'


GENERIC_WORDS = {
    'osh', 'palov', 'manti', 'somsa', 'lagmon', 'shashlik', 'norin', 'dimlama',
    'chuchvara', 'mastava', 'shurpa', 'kabob', 'non', 'choy', 'salat', 'sho\'rva',
    'borsh', 'plov', 'pilaf', 'ayron', 'qatiq', 'sumalak', 'halim', 'tuxum',
    'kompot', 'moroz', 'tort', 'pirog', 'burger', 'pizza', 'lavash', 'donar',
}

MIN_QUALITY_FOR_LIBRARY = 2


def is_generic_dish(name: str) -> bool:
    norm = normalize(name)
    if not norm:
        return False
    words = norm.split()
    if len(words) > 3:
        return False
    return any(w in GENERIC_WORDS for w in words)


def suggest_key(name: str) -> str:
    base = normalize(name).replace(' ', '-')[:70].strip('-')
    if not base:
        base = 'dish'
    key, i = base, 1
    while DishLibrary.objects.filter(key=key).exists():
        i += 1
        key = f'{base}-{i}'
        if i > 50:
            import uuid
            key = f'{base}-{uuid.uuid4().hex[:6]}'
            break
    return key


def build_aliases(dish) -> list:
    raw = [getattr(dish, 'name_uz', ''), getattr(dish, 'name_ru', ''), getattr(dish, 'name_en', '')]
    out = set()
    for r in raw:
        if not r:
            continue
        out.add(str(r).lower().strip())
        out.add(normalize(r))
    out.discard('')
    return sorted(out)[:20]


def library_stats() -> dict:
    from django.db.models import Sum, Avg, Count
    agg = DishLibrary.objects.filter(is_active=True).aggregate(total=Count('id'), used=Sum('used_by_count'), avg_q=Avg('quality'), avg_size=Avg('glb_bytes'))
    total = agg['total'] or 0
    used = agg['used'] or 0
    return {
        'total': total,
        'total_usage': used,
        'saved_usd': round(max(0, used - total) * 0.5, 2),
        'avg_quality': round(float(agg['avg_q'] or 0), 2),
        'avg_glb_mb': round((agg['avg_size'] or 0) / 1048576, 2),
    }


def add_to_library(dish, m3d, job=None, force: bool = False):
    if m3d.status != 'ready' or not m3d.glb_url:
        return None
    if getattr(m3d, 'library_id', None):
        return m3d.library
    if not force and not is_generic_dish(getattr(dish, 'name_uz', '')):
        log.info(f'[lib] "{getattr(dish, "name_uz", "")}" — brend taomi, kutubxonaga qo\'shilmadi')
        return None
    existing, score = find_by_name(getattr(dish, 'name_uz', ''))
    if existing and score >= 0.95:
        log.info(f'[lib] "{getattr(dish, "name_uz", "")}" allaqachon kutubxonada: {existing.key}')
        m3d.library = existing
        m3d.save(update_fields=['library'])
        return existing
    cat_key = getattr(getattr(dish, 'category', None), 'library_key', '') or 'other'
    emb = get_embedding(build_embedding_text(getattr(dish, 'name_uz', ''), getattr(dish, 'desc_uz', '') or '', getattr(dish, 'ingredients_uz', '') or '', cat_key))
    lib = DishLibrary.objects.create(
        key=suggest_key(getattr(dish, 'name_uz', '')),
        name_uz=getattr(dish, 'name_uz', ''),
        name_ru=getattr(dish, 'name_ru', '') or '',
        name_en=getattr(dish, 'name_en', '') or '',
        aliases=build_aliases(dish),
        category_key=cat_key,
        cuisine='uzbek',
        glb_url=m3d.glb_url,
        usdz_url=m3d.usdz_url,
        poster_url=m3d.poster_url,
        preview_360=m3d.preview_360,
        real_size_cm=m3d.real_size_cm,
        glb_bytes=m3d.glb_bytes,
        usdz_bytes=m3d.usdz_bytes,
        poly_count=m3d.poly_count,
        quality=3,
        source='ai',
        embedding=emb,
        used_by_count=1,
        is_active=True,
    )
    m3d.library = lib
    m3d.save(update_fields=['library'])
    log.info(f'[lib] KUTUBXONAGA QO\'SHILDI: {lib.key} — keyingi restoranlar uchun BEPUL')
    try:
        from core.queue import enqueue
        enqueue('notify', 'library_new_item', library_id=lib.id, key=lib.key, dish_name=getattr(dish, 'name_uz', ''))
    except Exception:
        pass
    return lib


# ---- V-128 copy_from_library ----
from django.db import transaction
from django.utils import timezone


def copy_from_library(dish, lib: DishLibrary, real_size_cm=None, actor=None):
    """
    Kutubxona modelini restoran taomiga biriktiradi.
    Fayl nusxalanmaydi — CDN URL ulashiladi.
    """
    from apps.ar3d.models import DishModel3D
    try:
        from core.ws import ws_send, g_admin
        has_ws = True
    except ImportError:
        has_ws = False

    size = real_size_cm if real_size_cm is not None else lib.real_size_cm

    with transaction.atomic():
        m3d, _created = DishModel3D.objects.update_or_create(
            dish=dish,
            defaults=dict(
                restaurant_id=dish.restaurant_id,
                library=lib,
                glb_url=lib.glb_url,
                usdz_url=lib.usdz_url,
                poster_url=lib.poster_url,
                preview_360=lib.preview_360,
                real_size_cm=size,
                glb_bytes=lib.glb_bytes,
                usdz_bytes=lib.usdz_bytes,
                poly_count=lib.poly_count,
                status='ready',
                source='library',
                progress=100,
                error_msg='',
                ready_at=timezone.now(),
            ))
        try:
            lib.bump_usage()
        except Exception:
            pass

    log.info(f'[lib] BEPUL nusxa: dish#{dish.id} ← {lib.key} ({size} sm) — 0 xarajat')

    if has_ws:
        try:
            ws_send(g_admin(dish.restaurant_id), 'model3d.ready', {
                'dish_id': dish.id, 'dish_name': getattr(dish, 'name_uz', ''),
                'source': 'library', 'library_key': lib.key,
                'real_size_cm': float(size), 'cost_usd': 0.0,
            })
        except Exception:
            pass
    return m3d
