#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PROGRESS.md ni yangilash.

Ishlatilishi:
    python3 update_progress.py V-043 ok
    python3 update_progress.py V-043 ok "izoh matni"
    python3 update_progress.py V-044 fail "OFD API javob bermadi"
    python3 update_progress.py --status          # holatni ko'rsatish
"""
import sys, re, os
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
PROGRESS = os.path.join(HERE, 'PROGRESS.md')

FAZALAR = [
    (0,  'Tayyorgarlik',          1,   12),
    (1,  'Tenant + Auth',        13,   30),
    (2,  'Menyu',                31,   54),
    (3,  'Stol + QR',            55,   66),
    (4,  'Mijoz PWA',            67,   92),
    (5,  'Buyurtma + realtime',  93,  114),
    (6,  'AR/3D',               115,  142),
    (7,  'Zal plani',           143,  150),
    (8,  'Admin panel',         151,  170),
    (9,  'AI + MCP',            171,  186),
    (10, "To'lov + fiskal",     187,  204),
    (11, 'Sodiqlik + analitika',205,  218),
    (12, 'Deploy + kuzatuv',    219,  234),
]

V1_END, V15_END = 186, 234


def faza_of(n):
    for f in FAZALAR:
        if f[2] <= n <= f[3]:
            return f
    return FAZALAR[-1]


def bar(done, total, width=20):
    filled = int(width * done / total) if total else 0
    pct = int(100 * done / total) if total else 0
    return f"[{'█'*filled}{' '*(width-filled)}] {pct:3d}%   {done}/{total}"


def read():
    return open(PROGRESS, encoding='utf-8').read()


def parse_done(text):
    """Bajarilgan vazifalar ro'yxatini oladi"""
    m = re.search(r'## Bajarilgan vazifalar\n\n<!--.*?-->\n\n```\n(.*?)\n```',
                  text, re.S)
    if not m:
        return []
    body = m.group(1).strip()
    if not body or body == '(hali bo\'sh)':
        return []
    return [l for l in body.split('\n') if l.strip()]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    text = read()

    if sys.argv[1] == '--status':
        print(re.search(r'```\n(OXIRGI_BAJARILGAN.*?)\n```', text, re.S).group(1))
        return

    task = sys.argv[1].upper().strip()
    if not re.match(r'^V-\d{3}$', task):
        sys.exit(f"❌ Noto'g'ri format: {task}. Namuna: V-043")

    status = (sys.argv[2] if len(sys.argv) > 2 else 'ok').lower()
    note = sys.argv[3] if len(sys.argv) > 3 else ''
    num = int(task.split('-')[1])
    now = datetime.now().strftime('%Y-%m-%d %H:%M')

    fz = faza_of(num)
    icon = {'ok': '✅', 'fail': '❌', 'skip': '⏭'}.get(status, '✅')

    # --- 1. Bajarilganlar ro'yxati ---
    done = parse_done(text)
    done = [l for l in done if not l.startswith(task + ' ')]   # dublikat olib tashlash
    line = f"{task} {icon} {now}  [F{fz[0]}] {note}".rstrip()
    done.append(line)
    done.sort()

    ok_count = sum(1 for l in done if '✅' in l)
    ok_nums = sorted(int(l.split()[0].split('-')[1]) for l in done if '✅' in l)
    last_ok = f"V-{ok_nums[-1]:03d}" if ok_nums else 'V-000'
    next_num = (ok_nums[-1] + 1) if ok_nums else 1
    nxt = f"V-{next_num:03d}" if next_num <= V15_END else 'TUGADI'
    nfz = faza_of(next_num) if next_num <= V15_END else fz

    # --- 2. Header blok ---
    started = re.search(r'BOSHLANGAN:\s*(.+)', text)
    started_val = started.group(1).strip() if started else '—'
    if started_val in ('—', ''):
        started_val = now

    header = (f"OXIRGI_BAJARILGAN: {last_ok}\n"
              f"KEYINGI:           {nxt}\n"
              f"FAZA:              {nfz[0]}\n"
              f"FAZA_NOMI:         {nfz[1]}\n"
              f"BOSHLANGAN:        {started_val}\n"
              f"OXIRGI_YANGILANISH:{now}")
    text = re.sub(r'```\nOXIRGI_BAJARILGAN.*?\n```',
                  f"```\n{header}\n```", text, flags=re.S)

    # --- 3. Umumiy progress ---
    v1_done = sum(1 for n in ok_nums if n <= V1_END)
    v15_done = len(ok_nums)
    prog = (f"v1  (V-001…V-186):  {bar(v1_done, V1_END)}\n"
            f"v1.5(V-001…V-234):  {bar(v15_done, V15_END)}")
    text = re.sub(r'## Umumiy progress\n\n```\n.*?\n```',
                  f"## Umumiy progress\n\n```\n{prog}\n```", text, flags=re.S)

    # --- 4. Fazalar jadvali ---
    rows = []
    for f_id, f_name, f_start, f_end in FAZALAR:
        total = f_end - f_start + 1
        d = sum(1 for n in ok_nums if f_start <= n <= f_end)
        if d == 0:      st = '⬜ boshlanmagan'
        elif d < total: st = '🟡 jarayonda'
        else:           st = '✅ tugagan'
        mark = '⚡ ' if f_id == 6 else ''
        rows.append(f"| {f_id} | {mark}{f_name} | V-{f_start:03d}…V-{f_end:03d} | {st} | {d}/{total} |")

    tbl = ("| Faza | Nomi | Vazifalar | Holat | Progress |\n"
           "|---|---|---|---|---|\n" + "\n".join(rows))
    text = re.sub(r'\| Faza \| Nomi \| Vazifalar \| Holat \| Progress \|\n\|---.*?\n\n',
                  tbl + "\n\n", text, flags=re.S)

    # --- 5. Bajarilganlar bloki ---
    text = re.sub(r'(## Bajarilgan vazifalar\n\n<!--.*?-->\n\n```\n).*?(\n```)',
                  lambda m: m.group(1) + "\n".join(done) + m.group(2),
                  text, flags=re.S)

    # --- 6. Muammolar ---
    if status == 'fail':
        prob = re.search(r'(## ⚠️ Muammolar / bloklar\n\n<!--.*?-->\n\n```\n)(.*?)(\n```)',
                         text, re.S)
        cur = prob.group(2).strip()
        cur = '' if cur == '(yo\'q)' else cur
        newp = (cur + "\n" if cur else '') + f"{task} — {note} ({now})"
        text = re.sub(r'(## ⚠️ Muammolar / bloklar\n\n<!--.*?-->\n\n```\n).*?(\n```)',
                      lambda m: m.group(1) + newp + m.group(2), text, flags=re.S)

    open(PROGRESS, 'w', encoding='utf-8').write(text)

    print(f"{icon} {task} yozildi  →  keyingi: {nxt}  (Faza {nfz[0]}: {nfz[1]})")
    print(f"   v1: {v1_done}/{V1_END}   v1.5: {v15_done}/{V15_END}")
    if nxt != 'TUGADI':
        fname = f"FAZA_{nfz[0]:02d}_*.md"
        print(f"   ➡️  Ochish: ROADMAP/01_FAZALAR/{fname}")
    else:
        print("   🎉 BARCHA VAZIFALAR TUGADI!")


if __name__ == '__main__':
    main()
