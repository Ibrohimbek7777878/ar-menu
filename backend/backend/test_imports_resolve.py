"""
Loyiha ichidagi import'lar mavjud nomlarga ishora qilishi testi (TZ: R3-2).

`from notifications.services.telegram_service import notify_new_order_to_seller` kabi mavjud bo'lmagan nomlar
funksiya ichida (lazy) import qilinganda faqat o'sha yo'l bajarilganda yiqiladi va ko'pincha `except: pass`
ichida yutilib ketadi. Bu test barcha loyiha modullarini AST bilan skanerlab, har bir loyiha-ichki
`from X import Y` / `import X.Y` mavjudligini tekshiradi (ruff F821 o'rnini bosuvchi sinov).
"""
import ast
import importlib
import importlib.util
from pathlib import Path

from django.test import SimpleTestCase

BASE = Path(__file__).resolve().parent.parent
SKIP_DIRS = {'venv', '.venv', 'node_modules', 'migrations', 'staticfiles', 'static', 'media', 'archive',
             'scripts', 'locale', '__pycache__', 'logs', 'bin', 'tests'}


def _project_roots():
    return {p.name for p in BASE.iterdir() if p.is_dir() and (p / '__init__.py').exists()} | {
        p.stem for p in BASE.glob('*.py')
    }


def _module_files():
    for path in BASE.rglob('*.py'):
        rel = path.relative_to(BASE)
        if set(rel.parts) & SKIP_DIRS or path.name.startswith('test') or path.name in ('manage.py', 'tests.py'):
            continue
        yield path, rel


def _absolute(module: str, rel: Path, level: int) -> str:
    if level == 0:
        return module
    package = list(rel.with_suffix('').parts)
    if rel.name != '__init__.py':
        package = package[:-1]
    else:
        package = package[:-1]
    package = package[:len(package) - (level - 1)] if level > 1 else package
    return '.'.join(package + ([module] if module else []))


def find_unresolved():
    roots = _project_roots()
    problems = []
    cache = {}
    for path, rel in _module_files():
        if str(rel) == 'settings.py':
            continue        # repo ildizidan ishga tushiriladigan vositalar uchun ongli moslik shimi
        try:
            tree = ast.parse(path.read_text(encoding='utf-8'))
        except (SyntaxError, UnicodeDecodeError):
            continue
        for node in ast.walk(tree):
            targets = []   # (modul, [nomlar])
            if isinstance(node, ast.ImportFrom):
                module = _absolute(node.module or '', rel, node.level)
                if module.split('.')[0] not in roots:
                    continue
                targets.append((module, [a.name for a in node.names if a.name != '*']))
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split('.')[0] in roots:
                        targets.append((alias.name, []))
            for module, names in targets:
                if module not in cache:
                    try:
                        cache[module] = importlib.import_module(module)
                    except Exception as exc:       # noqa: BLE001 — modul import qilinmasa ham xato
                        cache[module] = exc
                mod = cache[module]
                where = f'{rel}:{node.lineno}'
                if isinstance(mod, Exception):
                    problems.append(f'{where}  import {module} -> {type(mod).__name__}: {mod}')
                    continue
                for name in names:
                    if hasattr(mod, name):
                        continue
                    try:
                        if importlib.util.find_spec(f'{module}.{name}') is not None:
                            continue
                    except (ImportError, ValueError):
                        pass
                    problems.append(f'{where}  from {module} import {name}  (nom yo\'q)')
    return sorted(set(problems))


class ProjectImportsResolveTest(SimpleTestCase):
    def test_every_project_import_points_to_something_that_exists(self):
        problems = find_unresolved()
        self.assertEqual(problems, [], "Mavjud bo'lmagan loyiha import'lari:\n  " + "\n  ".join(problems))
