"""
React (Vite) build fayllarini shablonga ulash (TZ: R8-2).

Avval 17 ta shablonda `/static/react/assets/index.js?v=NN` qo'lda yozilgan va har buildda `sed` bilan almashtirilardi.
Endi Vite hash'li nom beradi (kontent o'zgarsa nom ham o'zgaradi — eski keshga tushib bo'lmaydi) va `.vite/manifest.json`
yozadi; bu teg'lar nomlarni manifestdan oladi. Manifest bo'lmasa (eski build) — oddiy `assets/index.*` nomlari.

    {% load react_assets %}
    {% react_css %}   <head> ichida
    {% react_js %}    <body> oxirida
"""
import json
import logging
from pathlib import Path

from django.conf import settings
from django import template
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

register = template.Library()
logger = logging.getLogger(__name__)

_MANIFEST_PATH = Path(settings.BASE_DIR) / 'static' / 'react' / '.vite' / 'manifest.json'
_cache = {'mtime': None, 'entry': None}


def _static_prefix():
    prefix = settings.STATIC_URL if settings.STATIC_URL.startswith('/') else '/' + settings.STATIC_URL
    return prefix.rstrip('/') + '/react/'


def _entry():
    """Manifestdagi kirish nuqtasi: {'file': ..., 'css': [...], 'imports': [...]} (fayl o'zgarsa qayta o'qiladi)."""
    try:
        mtime = _MANIFEST_PATH.stat().st_mtime
    except OSError:
        return None
    if _cache['mtime'] != mtime:
        try:
            manifest = json.loads(_MANIFEST_PATH.read_text(encoding='utf-8'))
            entry = next((v for v in manifest.values() if v.get('isEntry')), None)
            if entry is not None:
                shared = [manifest[key]['file'] for key in entry.get('imports', []) if key in manifest]
                css = list(entry.get('css', []))
                # cssCodeSplit: false bo'lganda CSS manifestda alohida 'style.css' kaliti bilan keladi
                if not css and 'style.css' in manifest:
                    css = [manifest['style.css']['file']]
                entry = {'file': entry['file'], 'css': css, 'imports': shared}
        except (ValueError, OSError, KeyError):
            logger.exception('[react_assets] manifest o\'qilmadi')
            entry = None
        _cache.update(mtime=mtime, entry=entry)
    return _cache['entry']


@register.simple_tag
def react_css():
    entry = _entry()
    files = entry['css'] if entry else ['assets/index.css']
    return format_html_join('\n    ', '<link rel="stylesheet" href="{}{}">', ((_static_prefix(), f) for f in files))


@register.simple_tag
def react_js():
    entry = _entry()
    if not entry:
        return format_html('<script type="module" src="{}assets/index.js"></script>', _static_prefix())
    preloads = format_html_join('\n    ', '<link rel="modulepreload" href="{}{}">', ((_static_prefix(), f) for f in entry['imports']))
    script = format_html('<script type="module" src="{}{}"></script>', _static_prefix(), entry['file'])
    return mark_safe(f'{preloads}\n    {script}' if entry['imports'] else script)
