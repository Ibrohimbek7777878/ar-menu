"""
S0-3 (TZ T1): Django ichida bitta so'rov vaqti qayerga ketishini o'lchaydi (cProfile), tarmoqsiz va serversiz.

Foydalanish (backend papkasidan, MUHIT PRODUCTION'GA YAQIN: DEBUG=False; scratch baza nusxasi bilan):
    DJANGO_SKIP_DOTENV=1 DEBUG=False SECRET_KEY=<50+ belgi> ALLOW_SQLITE_IN_PRODUCTION=True SECURE_SSL_REDIRECT=False \
    DATABASE_URL=sqlite:////abs/yo'l/scratch.sqlite3 ./venv/bin/python ../loadtest/profile_django.py [--n 1500]

Chiqish: har yo'l uchun o'rtacha vaqt (profilsiz), SQL soni, middleware'larning O'Z vaqti (ichkariga chaqiruvlarsiz), eng og'ir
funksiyalar va paketlar bo'yicha taqsimot. Faqat O'QIYDI (GET); haqiqiy `backend/db.sqlite3` ga ishlamaydi (himoya).
"""
import argparse
import cProfile
import io
import os
import pstats
import sys
import time
from collections import defaultdict
from pathlib import Path

if not os.environ.get('DATABASE_URL'):
    sys.exit("Xavfsizlik: DATABASE_URL berilmagan: haqiqiy backend/db.sqlite3 ishlatilmaydi. Scratch baza nusxasini ko'rsating.")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, os.getcwd())

import django  # noqa: E402

django.setup()

from django.db import connection  # noqa: E402
from django.test import Client  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402

DEFAULT_PATHS = ['/menu/', '/', '/api/v1/restaurant/menu/', '/health/']


def group_of(filename: str) -> str:
    """Faylni "paket" guruhiga ajratadi: django/db, django/template, rest_framework, loyiha (backend/...) va h.k."""
    f = filename.replace('\\', '/')
    if 'site-packages/' in f:
        parts = f.split('site-packages/')[1].split('/')
        return '/'.join(parts[:2]) if parts[0] == 'django' and len(parts) > 2 else parts[0]
    if f.startswith('<') or f == '~':
        return 'python (ichki)'
    try:
        rel = Path(f).resolve().relative_to(Path(os.getcwd()).resolve())
        return 'loyiha/' + (rel.parts[0] if len(rel.parts) > 1 else rel.stem)
    except ValueError:
        return 'boshqa'


def measure(path: str, n: int, extra: dict) -> dict:
    client = Client(HTTP_HOST='127.0.0.1')
    for _ in range(30):  # isitish: kesh, import, ulanish
        client.get(path, **extra)
    with CaptureQueriesContext(connection) as q:
        resp = client.get(path, **extra)
    queries = [s['sql'] for s in q.captured_queries]

    t0 = time.perf_counter()
    for _ in range(n):
        client.get(path, **extra)
    mean_ms = (time.perf_counter() - t0) / n * 1000

    prof = cProfile.Profile()
    prof.enable()
    for _ in range(n):
        client.get(path, **extra)
    prof.disable()
    return {'path': path, 'status': resp.status_code, 'size': len(resp.content), 'mean_ms': mean_ms, 'queries': queries, 'prof': prof, 'n': n}


def report(r: dict, top: int) -> None:
    st = pstats.Stats(r['prof'], stream=io.StringIO())
    n = r['n']
    total = sum(v[2] for v in st.stats.values())  # jami tottime
    print(f"\n## {r['path']}  (HTTP {r['status']}, {r['size'] / 1024:.1f} KB)")
    print(f"- o'rtacha: **{r['mean_ms']:.2f} ms/so'rov** (profilsiz, {n} marta), SQL: **{len(r['queries'])}**")
    tables = defaultdict(int)
    for sql in r['queries']:
        key = sql.split(' FROM ')[1].split()[0].strip('"') if ' FROM ' in sql else sql[:30]
        tables[key] += 1
    if tables:
        print('- SQL jadvallari: ' + ', '.join(f'{k} ×{v}' for k, v in sorted(tables.items(), key=lambda kv: -kv[1])))

    groups = defaultdict(float)
    for (filename, _line, _name), (_cc, _nc, tt, _ct, _callers) in st.stats.items():
        groups[group_of(filename)] += tt
    print(f"\nPaketlar bo'yicha O'Z vaqti (profil ostida, jami {total / n * 1000:.2f} ms/so'rov):")
    for g, tt in sorted(groups.items(), key=lambda kv: -kv[1])[:10]:
        print(f'  {tt / n * 1000:7.3f} ms  {tt / total * 100:5.1f}%  {g}')

    print("\nMiddleware'larning O'Z vaqti (ichkariga chaqiruvlarsiz), ms/so'rov:")
    rows = []
    for (filename, line, name), (_cc, nc, tt, ct, _callers) in st.stats.items():
        if 'middleware' in filename.lower() and name in ('__call__', 'process_request', 'process_response', 'process_view', 'process_template_response'):
            rows.append((tt / n * 1000, ct / n * 1000, f"{Path(filename).name}:{line}({name})"))
    for own, cum, label in sorted(rows, reverse=True)[:12]:
        print(f'  {own:7.3f} ms (kumulyativ {cum:7.3f})  {label}')

    print(f"\nEng og'ir {top} funksiya (o'z vaqti):")
    funcs = sorted(st.stats.items(), key=lambda kv: -kv[1][2])[:top]
    for (filename, line, name), (_cc, nc, tt, _ct, _callers) in funcs:
        print(f'  {tt / n * 1000:7.3f} ms  {nc / n:6.1f} chaqiruv  {Path(filename).name}:{line}({name})')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=1500)
    ap.add_argument('--top', type=int, default=12)
    ap.add_argument('--paths', default=','.join(DEFAULT_PATHS))
    args = ap.parse_args()
    from django.conf import settings
    print(f"# Django profil (S0-3): DEBUG={settings.DEBUG}, baza={connection.vendor}, so'rov/yo'l={args.n}")
    if settings.DEBUG:
        print('OGOHLANTIRISH: DEBUG=True: Django har SQL ni xotirada saqlaydi va sekinroq; production o\'lchovi uchun DEBUG=False bering.')
    for path in [p for p in args.paths.split(',') if p]:
        report(measure(path, args.n, {}), args.top)
    # shartli GET (304): ETag bilan qaytgan mehmon
    client = Client(HTTP_HOST='127.0.0.1')
    etag = client.get('/api/v1/restaurant/menu/').get('ETag')
    if etag:
        print('\n(304 o\'lchovi: ETag bilan)')
        report(measure('/api/v1/restaurant/menu/', args.n, {'HTTP_IF_NONE_MATCH': etag}), args.top)


if __name__ == '__main__':
    main()
