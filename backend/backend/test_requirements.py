"""
requirements.txt to'liqligi testi (TZ: R0-1).

Kodda import qilinadigan har bir tashqi paket requirements.txt'da bo'lishi shart. Avval numpy/trimesh/pygltflib,
sentry-sdk, psutil ro'yxatda yo'q edi — toza o'rnatishda 3D generatsiya va monitoring jimgina buzilardi.
Test o'rnatilgan paketlarni import nomi → paket nomiga xaritalaydi (importlib.metadata), shuning uchun yangi
paket qo'shilganda ham o'zi tekshiradi.
"""
import ast
import re
import sys
from importlib import metadata
from pathlib import Path

from django.test import SimpleTestCase

BASE = Path(__file__).resolve().parent.parent
SKIP_DIRS = {'venv', '.venv', 'node_modules', 'migrations', 'staticfiles', 'static', 'media', 'archive',
             'scripts', 'locale', '__pycache__', 'logs', 'bin'}

# Ixtiyoriy yoki shartli import qilinadigan, ishlash uchun shart bo'lmagan paketlar
OPTIONAL = {'psycopg', 'MySQLdb'}


def _normalize(name: str) -> str:
    return re.sub(r'[-_.]+', '-', name).lower()


def _requirements() -> set:
    names = set()
    for line in (BASE / 'requirements.txt').read_text().splitlines():
        line = line.split('#')[0].strip()
        if not line:
            continue
        names.add(_normalize(re.split(r'[=<>!~\[; ]', line, maxsplit=1)[0]))
    return names


def _project_packages() -> set:
    return {p.name for p in BASE.iterdir() if p.is_dir() and (p / '__init__.py').exists()} | {
        p.stem for p in BASE.glob('*.py')
    }


def _imported_top_level_modules():
    local = _project_packages()
    found = {}
    for path in BASE.rglob('*.py'):
        rel = path.relative_to(BASE)
        if set(rel.parts) & SKIP_DIRS or path.name.startswith('test') or path.name == 'tests.py':
            continue
        try:
            tree = ast.parse(path.read_text(encoding='utf-8'))
        except (SyntaxError, UnicodeDecodeError):
            continue
        for node in ast.walk(tree):
            mods = []
            if isinstance(node, ast.Import):
                mods = [a.name.split('.')[0] for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                mods = [node.module.split('.')[0]]
            for mod in mods:
                if mod in sys.stdlib_module_names or mod in local or mod in OPTIONAL:
                    continue
                found.setdefault(mod, str(rel))
    return found


class RequirementsCompletenessTest(SimpleTestCase):
    def test_every_third_party_import_is_in_requirements(self):
        required = _requirements()
        dist_map = metadata.packages_distributions()
        missing = []
        for module, where in sorted(_imported_top_level_modules().items()):
            dists = dist_map.get(module)
            if not dists:
                continue        # o'rnatilmagan modul (shartli/ixtiyoriy) — bu test uni baholay olmaydi
            if not any(_normalize(d) in required for d in dists):
                missing.append(f"{module} ({', '.join(dists)}) <- {where}")
        self.assertEqual(missing, [], "requirements.txt'da yo'q paketlar:\n  " + "\n  ".join(missing))
