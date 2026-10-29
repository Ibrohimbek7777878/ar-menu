#!/usr/bin/env python3
"""Caddyfile'dagi `@hashed` (immutable kesh) regex'ini sinaydi.

Yurgizish (repo ildizidan):  python3 deploy/scripts/test_caddy_regex.py -v

Ikki qatlam:
  1) RegexTest   — regex Caddyfile'dan o'qiladi (nusxa emas) va HAQIQIY fayl nomlari (git'dagi admins/react build'i)
                   hamda qo'lda tuzilgan musbat/manfiy misollar bilan Python `re` da sinaladi. Go RE2 da bo'lmaydigan
                   konstruksiyalar (lookahead, backreference, possessive) rad etiladi.
  2) CaddyLiveTest — HAQIQIY Caddy (docker: caddy:2-alpine) shu Caddyfile bilan ko'tariladi, vaqtinchalik /srv/static
                   daraxtiga curl qilinadi: hash'li mavjud fayl `immutable` oladi, hash'siz fayl va mavjud bo'lmagan
                   (404) hash'li yo'l OLMAYDI. Python `re` va Go RE2 farqi shu yerda ushlanadi.
                   Docker yo'q bo'lsa o'tkazib yuboriladi (CADDY_LIVE_REQUIRED=1 bo'lsa — xato; CI shunday qiladi).

Faqat standart kutubxona — qo'shimcha paket kerak emas.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import uuid
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CADDYFILE = Path(os.environ.get('CADDYFILE_PATH') or REPO / 'deploy' / 'Caddyfile')   # CADDYFILE_PATH — faqat testning o'zini sinash uchun
CADDY_IMAGE = os.environ.get('CADDY_IMAGE', 'caddy:2-alpine')

# Git'ga commit qilingan haqiqiy build'lar (URL yo'li -> papka). react/ papkasi bo'lmasa (masalan toza checkout'da
# frontend build qilinmagan) shu qism o'tkazib yuboriladi; admins/ git'da turadi.
REAL_BUILDS = {
    '/static/admins/resto/assets/': REPO / 'backend' / 'static' / 'admins' / 'resto' / 'assets',
    '/static/react/assets/': REPO / 'backend' / 'static' / 'react' / 'assets',
}
HASHED_EXTENSIONS = ('.js', '.css')

# Hash'li, `immutable` OLISHI SHART bo'lgan yo'llar. Birinchi guruh — bevosita haqiqiy build'dan olingan nomlar
# (printer.BnhYhF-O.js: hash ichida `-`; Page.Bb_65GFr.js: hash ichida `_`; style-hQv6WcD-.css: hash `-` bilan tugaydi).
POSITIVE = [
    '/static/admins/resto/assets/index.DsIf2h0M.js',
    '/static/admins/resto/assets/index.DX2ZRSXf.css',
    '/static/admins/resto/assets/Page.ZRwfwkEC.js',
    '/static/admins/resto/assets/plus.XxKzowMp.js',
    '/static/admins/resto/assets/printer.BnhYhF-O.js',
    '/static/admins/resto/assets/Page.Bb_65GFr.js',
    '/static/admins/resto/assets/refresh-cw.Ba6rbkjg.js',
    '/static/react/assets/index-uOidnByD.js',
    '/static/react/assets/AdminDashboardPage-C8TJzOGK.js',
    '/static/react/assets/MenuPage-B7-dEsHs.js',
    '/static/react/assets/model-viewer-BvTrOkpu.js',
    '/static/react/assets/style-hQv6WcD-.css',
    # Vite'ning shrift/rasm resurslari (assets/ ichida hash'lanadi)
    '/static/admins/resto/assets/inter.AbCd1234.woff2',
    '/static/react/assets/logo-AbCd1234.svg',
    # Django ManifestStaticFilesStorage: name.<12 hex>.ext (Django admin statikasi ham, collectstatic'dan keyin)
    '/static/admin/css/base.0123456789ab.css',
    '/static/admin/js/core.abcdef012345.js',
    '/static/admin/img/icon-yes.0a1b2c3d4e5f.svg',
    '/static/fonts/Inter.0a1b2c3d4e5f.woff2',
    '/static/guest/js/menu.0a1b2c3d4e5f.js',
    '/static/rest_framework/css/bootstrap.min.0a1b2c3d4e5f.css',
    # Vite fayli ustiga Django ham hash qo'ysa (collectstatic admins/ ni ham o'zgartiradi)
    '/static/admins/resto/assets/index.DsIf2h0M.0a1b2c3d4e5f.js',
]

# Hash'siz yoki noto'g'ri joydagi yo'llar — `immutable` OLMASLIGI SHART.
NEGATIVE = [
    # kirish sahifalari, manifestlar, service worker — nomi o'zgarmaydi, kontenti o'zgaradi
    '/static/admins/resto/index.html',
    '/static/admins/resto/.vite/manifest.json',
    '/static/react/index.html',
    '/static/react/.vite/manifest.json',
    '/static/sw.js',
    '/static/js/sw.js',
    '/static/guest/js/sw.js',
    '/static/manifest.json',
    # Django admin statikasi hash'siz (collectstatic'dan oldingi / hash'siz havola)
    '/static/admin/css/base.css',
    '/static/admin/js/core.js',
    '/static/css/ui_components.css',
    '/static/js/three.min.js',
    '/static/decoders/meshopt_decoder.js',
    # Vite'ning public/ dan ko'chirilgan hash'siz fayllari: assets/ ichida emas
    '/static/react/favicon.svg',
    '/static/react/icons.svg',
    '/static/react/models/burger.glb',
    '/static/react/media/dish-ABCDEFGH.jpg',
    '/static/react/media/uzb-ABCDEFGH.png',
    # assets/ ichida lekin hash'siz yoki hash uzunligi noto'g'ri
    '/static/admins/resto/assets/index.js',
    '/static/admins/resto/assets/vendor.js',
    '/static/admins/resto/assets/index.DsIf2h0.js',      # 7 belgi
    '/static/admins/resto/assets/index.DsIf2h0M9.js',    # 9 belgi
    '/static/react/assets/index-uOidnBy.js',             # 7 belgi
    '/static/react/assets/index-uOidnByDx.js',           # 9 belgi
    # assets/ dan tashqarida (Vite hamma narsani assets/ ga yozadi)
    '/static/admins/resto/index.DsIf2h0M.js',
    '/static/react/index-uOidnByD.js',
    # boshqa ilova (ro'yxatda yo'q): eski Vite nusxalari — ongli ravishda immutable emas
    '/static/air_3d_menu/assets/index-DDNjqfQt.js',
    '/static/assets/index-DDNjqfQt.js',
    # Django hash uzunligi/shakli noto'g'ri
    '/static/admin/css/base.0123456789a.css',            # 11 hex
    '/static/admin/css/base.0123456789abc.css',          # 13 hex
    '/static/admin/css/base.0123456789AB.css',           # bosh harf (Django kichik hex beradi)
    '/static/admin/css/base.0123456789xy.css',           # hex emas
    # kengaytma ro'yxatda yo'q: .map, .html, .json, .txt
    '/static/admins/resto/assets/index.DsIf2h0M.js.map',
    '/static/admin/css/base.0123456789ab.css.gz',
    '/static/admin/x.0123456789ab.html',
    '/static/admin/x.0123456789ab.json',
    '/static/admins/resto/assets/readme.AbCd1234.txt',
    # /static/ dan tashqarida
    '/media/uploads/x.0123456789ab.js',
    '/media/admins/assets/x.AbCd1234.js',
    '/api/x.0123456789ab.js',
    '/x.0123456789ab.js',
]


def read_hashed_regex() -> str:
    """`@hashed { path_regexp hashed <regex> ... }` dan regex'ni ajratib oladi (bir qatorli va blokli yozuvni ham)."""
    text = CADDYFILE.read_text(encoding='utf-8')
    found = re.findall(r'^\s*(?:@hashed\s+)?path_regexp\s+hashed\s+(\S+)\s*$', text, flags=re.M)
    if len(found) != 1:
        raise AssertionError(f"Caddyfile'da aynan bitta `path_regexp hashed <regex>` bo'lishi kerak, topildi: {len(found)}")
    pattern = found[0]
    if len(pattern) >= 2 and pattern[0] == '(' and pattern[-1] == ')' and not pattern.startswith('(?'):
        pattern = pattern[1:-1]   # eski yozuv: butun regex qavsda edi
    return pattern


def real_build_paths():
    """(url_yo'li, fayl nomi) — git'dagi haqiqiy build'lardan; faqat hash'li js/css."""
    for prefix, folder in REAL_BUILDS.items():
        if not folder.is_dir():
            continue
        for item in sorted(folder.iterdir()):
            if item.is_file() and item.suffix in HASHED_EXTENSIONS:
                yield prefix + item.name


class RegexTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pattern = read_hashed_regex()
        cls.compiled = re.compile(cls.pattern)

    def matches(self, path: str) -> bool:
        return self.compiled.search(path) is not None

    def test_go_re2_compatible(self):
        """Caddy Go RE2 ishlatadi: lookahead/lookbehind/backreference/possessive/atomic guruh yo'q."""
        forbidden = {
            'lookahead (?= (?!': r'\(\?[=!]',
            'lookbehind (?<= (?<!': r'\(\?<[=!]',
            'atomic guruh (?>': r'\(\?>',
            'backreference \\1..\\9': r'(?<!\\)\\[1-9]',
            'possessive kvantifikator': r'(?<!\\)[+*?}]\+',
            'conditional (?(': r'\(\?\(',
        }
        for name, rx in forbidden.items():
            self.assertIsNone(re.search(rx, self.pattern), f'RE2 qo\'llamaydi: {name} — {self.pattern}')

    def test_real_build_file_names_match(self):
        paths = list(real_build_paths())
        admins = [p for p in paths if p.startswith('/static/admins/')]
        self.assertGreaterEqual(len(admins), 5, "admins build'ida kamida 5 ta hash'li fayl bo'lishi kerak (aks holda test bo'sh o'tib ketadi)")
        for path in paths:
            with self.subTest(path=path):
                self.assertTrue(self.matches(path), f"haqiqiy hash'li fayl mos kelmadi: {path}")

    def test_real_build_html_and_manifest_do_not_match(self):
        for prefix, folder in (('/static/admins/resto/', REAL_BUILDS['/static/admins/resto/assets/'].parent),
                               ('/static/react/', REAL_BUILDS['/static/react/assets/'].parent)):
            if not folder.is_dir():
                continue
            for item in folder.rglob('*'):
                if item.is_file() and item.suffix not in HASHED_EXTENSIONS:
                    url = prefix + item.relative_to(folder).as_posix()
                    with self.subTest(path=url):
                        self.assertFalse(self.matches(url), f"hash'siz fayl `immutable` olmasligi kerak: {url}")

    def test_positive_samples(self):
        for path in POSITIVE:
            with self.subTest(path=path):
                self.assertTrue(self.matches(path), f"mos kelishi kerak edi: {path}")

    def test_negative_samples(self):
        for path in NEGATIVE:
            with self.subTest(path=path):
                self.assertFalse(self.matches(path), f"mos kelmasligi kerak edi: {path}")

    def test_old_regex_would_have_failed_on_admins(self):
        """Regressiya: eski regex yangi admin fayllariga mos kelmasdi (nuqta ajratgich). Bu test o'sha xatoni qayd qiladi."""
        old = re.compile(r'(^/static/(admins|react)/.+-[A-Za-z0-9_-]{8}\.(js|css)$|^/static/.+\.[0-9a-f]{12}\.(css|js|woff2)$)')
        self.assertIsNone(old.search('/static/admins/resto/assets/index.DsIf2h0M.js'))
        self.assertTrue(self.matches('/static/admins/resto/assets/index.DsIf2h0M.js'))


def _docker_available() -> bool:
    if not shutil.which('docker'):
        return False
    try:
        return subprocess.run(['docker', 'info'], capture_output=True, timeout=30).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


class CaddyLiveTest(unittest.TestCase):
    """Haqiqiy Caddy (Go RE2) bilan: `Cache-Control` sarlavhasi."""

    container = None
    tmp = None

    @classmethod
    def setUpClass(cls):
        if os.environ.get('SKIP_CADDY_LIVE') == '1':
            raise unittest.SkipTest('SKIP_CADDY_LIVE=1')
        if not _docker_available():
            if os.environ.get('CADDY_LIVE_REQUIRED') == '1':
                raise AssertionError('CADDY_LIVE_REQUIRED=1, lekin docker mavjud emas')
            raise unittest.SkipTest('docker mavjud emas — haqiqiy Caddy sinovi o\'tkazib yuborildi')

        cls.tmp = Path(tempfile.mkdtemp(prefix='caddy-regex-'))
        static = cls.tmp / 'static'
        cls.existing = sorted(set(POSITIVE) | set(NEGATIVE) | set(real_build_paths()))
        for url in cls.existing:
            target = cls.tmp / url.lstrip('/')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('/* sinov */\n', encoding='utf-8')
        for folder, _dirs, _files in os.walk(cls.tmp):
            os.chmod(folder, 0o755)
        for file in cls.tmp.rglob('*'):
            if file.is_file():
                os.chmod(file, 0o644)

        name = f'caddy-regex-{uuid.uuid4().hex[:10]}'
        run = subprocess.run(
            ['docker', 'run', '-d', '--rm', '--name', name, '-p', '127.0.0.1::80',
             '-v', f'{CADDYFILE}:/etc/caddy/Caddyfile:ro',
             '-v', f'{static}:/srv/static:ro',
             '-e', 'DOMAIN=:80', CADDY_IMAGE],
            capture_output=True, text=True, timeout=180,
        )
        if run.returncode != 0:
            shutil.rmtree(cls.tmp, ignore_errors=True)
            raise AssertionError(f'Caddy konteyneri ishga tushmadi: {run.stderr.strip()}')
        cls.container = name
        port_out = subprocess.run(['docker', 'port', name, '80/tcp'], capture_output=True, text=True, timeout=30).stdout
        match = re.search(r':(\d+)\s*$', port_out.strip().splitlines()[0]) if port_out.strip() else None
        if not match:
            cls._cleanup()
            raise AssertionError(f'Caddy porti aniqlanmadi: {port_out!r}')
        cls.base = f'http://127.0.0.1:{match.group(1)}'
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                cls.fetch('/static/sw.js')
                return
            except (urllib.error.URLError, ConnectionError, OSError):
                time.sleep(0.3)
        logs = subprocess.run(['docker', 'logs', name], capture_output=True, text=True).stdout[-2000:]
        cls._cleanup()
        raise AssertionError(f'Caddy 30 soniyada javob bermadi:\n{logs}')

    @classmethod
    def _cleanup(cls):
        if cls.container:
            subprocess.run(['docker', 'rm', '-f', cls.container], capture_output=True, timeout=60)
            cls.container = None
        if cls.tmp:
            shutil.rmtree(cls.tmp, ignore_errors=True)
            cls.tmp = None

    @classmethod
    def tearDownClass(cls):
        cls._cleanup()

    @classmethod
    def fetch(cls, path: str):
        """(status, Cache-Control) — redirectlarsiz."""
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        opener = urllib.request.build_opener(NoRedirect)
        try:
            with opener.open(cls.base + path, timeout=10) as resp:
                return resp.status, resp.headers.get('Cache-Control', '')
        except urllib.error.HTTPError as exc:
            return exc.code, exc.headers.get('Cache-Control', '')

    def test_existing_files_get_immutable_exactly_when_python_regex_matches(self):
        compiled = re.compile(read_hashed_regex())
        for path in self.existing:
            with self.subTest(path=path):
                status, cache = self.fetch(path)
                if path.startswith('/static/'):
                    self.assertEqual(status, 200, f'fayl topilmadi: {path}')
                # /static/ dan tashqari yo'llar (media — ulanmagan, /api — web ga proksi) javob kodi bo'yicha emas,
                # faqat `immutable` olmasligi bo'yicha tekshiriladi
                expected = compiled.search(path) is not None
                self.assertEqual('immutable' in cache, expected,
                                 f'Caddy (RE2) va Python regex farq qildi: {path} -> Cache-Control={cache!r}')
                if expected:
                    self.assertIn('max-age=31536000', cache)

    def test_real_admin_file_is_immutable(self):
        status, cache = self.fetch('/static/admins/resto/assets/index.DsIf2h0M.js')
        self.assertEqual(status, 200)
        self.assertEqual(cache, 'public, max-age=31536000, immutable')

    def test_unhashed_files_are_not_immutable(self):
        for path in ('/static/admins/resto/index.html', '/static/sw.js', '/static/admin/css/base.css'):
            with self.subTest(path=path):
                status, cache = self.fetch(path)
                self.assertEqual(status, 200)
                self.assertNotIn('immutable', cache)

    def test_missing_hashed_file_is_not_cached_forever(self):
        """Hash'li nomga mos, lekin diskda yo'q fayl: 404 ga `immutable` yopishmasin (brauzer 404 ni bir yil keshlamasin)."""
        for path in ('/static/admins/resto/assets/Yoq.AbCd1234.js', '/static/react/assets/Yoq-AbCd1234.js',
                     '/static/admin/css/yoq.0123456789ab.css'):
            with self.subTest(path=path):
                status, cache = self.fetch(path)
                self.assertEqual(status, 404)
                self.assertNotIn('immutable', cache)
                self.assertNotIn('31536000', cache)


if __name__ == '__main__':
    unittest.main(verbosity=2)
