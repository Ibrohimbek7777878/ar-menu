import logging
import os
import tempfile
import time

import requests
from django.conf import settings

from core.resilience import CircuitBreaker, retry
from core.exceptions import ServiceUnavailable

log = logging.getLogger('ar3d.generate')

PROVIDER_CHAIN = [
    ('meshy', 0.50),
    ('tripo', 0.80),
    ('rodin', 1.50),
]

DOWNLOAD_TIMEOUT = 180
MAX_RAW_BYTES = 120 * 1024 * 1024


def _breaker(name):
    return CircuitBreaker(f'ai3d:{name}', fail_threshold=3, timeout=300, success_threshold=1)


def generate_3d(images: list, dish_name: str = '', job=None) -> dict:
    """
    Rasmdan 3D model yaratadi.
    Qaytaradi: {'glb_path': '...', 'provider': 'meshy', 'cost_usd': 0.5}
    """
    if not images:
        raise ServiceUnavailable({'reason': 'no_images'})

    # Try MCP router first, fallback to direct provider if not available
    try:
        from apps.ai.mcp.router import mcp
        from apps.ai.mcp.base import MCPRequest
        has_mcp = True
    except ImportError:
        has_mcp = False
        mcp = None
        MCPRequest = None

    errors = {}
    for name, cost in PROVIDER_CHAIN:
        cb = _breaker(name)
        if cb.is_open():
            log.warning(f'[3d] {name} — circuit OPEN, o\'tkazib yuborildi')
            errors[name] = 'circuit_open'
            continue

        if job:
            try:
                job.provider = name
                job.set_stage('generate', progress=25)
            except Exception:
                pass

        t0 = time.time()
        try:
            log.info(f'[3d] {name} chaqirilmoqda — "{dish_name}" ({len(images)} rasm)')
            if has_mcp:
                resp = mcp.run(MCPRequest(
                    task='image_to_3d',
                    images=images,
                    prompt=dish_name,
                    timeout=600,
                    extra={'provider': name, 'target_polycount': 40000,
                           'enable_pbr': True, 'should_remesh': True},
                ))
                if not resp.ok or not resp.content:
                    cb.on_failure()
                    errors[name] = getattr(resp, 'error', 'empty') or 'empty'
                    log.warning(f'[3d] {name} xato: {errors[name]}')
                    continue
                glb_url = (resp.content.get('glb_url') if isinstance(resp.content, dict) else None)
                if not glb_url:
                    cb.on_failure()
                    errors[name] = 'no_glb_url'
                    continue
                path = _download(glb_url)
                cb.on_success()
                took = int(time.time() - t0)
                log.info(f'[3d] ✅ {name} — {os.path.getsize(path)/1048576:.1f} MB, {took}s')
                return {
                    'glb_path': path,
                    'provider': name,
                    'cost_usd': float(getattr(resp, 'cost_usd', None) or cost),
                    'thumbnail': (resp.content.get('thumbnail') if isinstance(resp.content, dict) else ''),
                    'latency_sec': took,
                }
            else:
                # No MCP — directly try provider API if key exists
                api_result = _try_direct_provider(name, images, dish_name)
                if not api_result:
                    cb.on_failure()
                    errors[name] = 'no_api_key_or_not_configured'
                    log.warning(f'[3d] {name} skip: no API key')
                    continue
                # api_result should contain glb_url
                glb_url = api_result.get('glb_url')
                if not glb_url:
                    cb.on_failure()
                    errors[name] = 'no_glb_url'
                    continue
                path = _download(glb_url)
                cb.on_success()
                took = int(time.time() - t0)
                return {
                    'glb_path': path,
                    'provider': name,
                    'cost_usd': float(api_result.get('cost_usd') or cost),
                    'thumbnail': api_result.get('thumbnail', ''),
                    'latency_sec': took,
                }

        except Exception as e:
            cb.on_failure()
            errors[name] = str(e)[:200]
            log.warning(f'[3d] {name} istisno: {e}')

    # Graceful fallback: agar tashqi AI kalitlari bo'lmasa yoki xato bersa, kutubxonadagi mos modeldan foydalanish
    try:
        from apps.ar3d.services import library
        from apps.ar3d.models import DishLibrary
        lib, score = library.find_by_name(dish_name)
        if not lib:
            lib = DishLibrary.objects.filter(is_active=True).first()
        if lib and lib.glb_url:
            log.info(f'[3d] Fallback: kutubxonadagi {lib.key} modeli ishlatilmoqda')
            path = _download(lib.glb_url)
            return {
                'glb_path': path,
                'provider': 'library_fallback',
                'cost_usd': 0.0,
                'thumbnail': lib.poster_url or '',
                'latency_sec': 1,
            }
    except Exception as fe:
        log.warning(f'[3d] Fallback xatosi: {fe}')

    log.error(f'[3d] ⛔ HAMMA provayder yiqildi: {errors}')
    raise ServiceUnavailable({'service': '3d_generation', 'errors': errors})


def _try_direct_provider(name, images, dish_name):
    """
    Direct API fallback when MCP not available.
    Returns dict with glb_url or None if not configured.
    """
    key = getattr(settings, 'AI_KEYS', {}).get(f'{name.upper()}_API_KEY') or getattr(settings, f'{name.upper()}_API_KEY', '') or ''
    if not key and name == 'meshy':
        key = getattr(settings, 'AI_KEYS', {}).get('MESHY_API_KEY', '')
    if not key and name == 'tripo':
        key = getattr(settings, 'AI_KEYS', {}).get('TRIPO_API_KEY', '')
    if not key:
        return None
    # Placeholder: real provider integration requires API call
    # For now return None to trigger fallback chain without external calls
    # When keys are configured and worker runs, this will be extended
    log.info(f'[3d] {name} API key mavjud, lekin direct integration hali placeholder — MCP kutilmoqda')
    return None


@retry(times=3, delay=2, backoff=2, exceptions=(requests.RequestException,))
def _download(url: str) -> str:
    fd, path = tempfile.mkstemp(suffix='.glb', prefix='armenu_raw_')
    os.close(fd)
    total = 0
    with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(1024 * 256):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_RAW_BYTES:
                    f.close()
                    try:
                        os.unlink(path)
                    except Exception:
                        pass
                    raise ValueError(f'GLB juda katta: >{MAX_RAW_BYTES//1048576} MB')
                f.write(chunk)
    if total < 1024:
        try:
            os.unlink(path)
        except Exception:
            pass
        raise ValueError('GLB bo\'sh yoki buzuq')
    return path


def prepare_images(image_paths_or_urls: list) -> list:
    out = []
    base = getattr(settings, 'PUBLIC_BASE_URL', getattr(settings, 'PUBLIC_DOMAIN', '')).rstrip('/')
    # Ensure base has scheme
    if base and not base.startswith('http'):
        base = 'https://' + base
    for p in image_paths_or_urls[:6]:
        p = str(p)
        if p.startswith('http://') or p.startswith('https://'):
            out.append(p)
        elif base:
            out.append(f'{base}{p if p.startswith("/") else "/" + p}')
    return out
