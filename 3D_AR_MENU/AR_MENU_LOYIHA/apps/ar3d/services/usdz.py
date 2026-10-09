import logging
import os
import shutil
import subprocess

from django.conf import settings

log = logging.getLogger('ar3d.usdz')

MAX_USDZ = getattr(settings, 'MAX_USDZ_BYTES', 5 * 1024 * 1024)
USD_FROM_GLTF = shutil.which('usd_from_gltf')
USDZCONVERT = shutil.which('usdzconvert')
TIMEOUT = 420


def glb_to_usdz(glb_path: str, usdz_path: str, job=None) -> dict:
    if job:
        try:
            job.set_stage('usdz', progress=72)
        except Exception:
            pass
    errors = {}

    if USD_FROM_GLTF:
        try:
            p = subprocess.run([USD_FROM_GLTF, glb_path, usdz_path], capture_output=True, text=True, timeout=TIMEOUT)
            if p.returncode == 0 and os.path.exists(usdz_path):
                return _finish(usdz_path, 'usd_from_gltf')
            errors['usd_from_gltf'] = p.stderr[-300:] if p.stderr else 'failed'
        except Exception as e:
            errors['usd_from_gltf'] = str(e)[:200]

    if USDZCONVERT:
        try:
            p = subprocess.run([USDZCONVERT, glb_path, usdz_path], capture_output=True, text=True, timeout=TIMEOUT)
            if p.returncode == 0 and os.path.exists(usdz_path):
                return _finish(usdz_path, 'usdzconvert')
            errors['usdzconvert'] = p.stderr[-300:] if p.stderr else 'failed'
        except Exception as e:
            errors['usdzconvert'] = str(e)[:200]

    if shutil.which('docker'):
        try:
            d = os.path.dirname(os.path.abspath(glb_path))
            p = subprocess.run([
                'docker', 'run', '--rm', '-v', f'{d}:/w',
                'leon/usd-from-gltf:latest',
                f'/w/{os.path.basename(glb_path)}',
                f'/w/{os.path.basename(usdz_path)}',
            ], capture_output=True, text=True, timeout=TIMEOUT)
            if p.returncode == 0 and os.path.exists(usdz_path):
                return _finish(usdz_path, 'docker')
            errors['docker'] = p.stderr[-300:] if p.stderr else 'failed'
        except Exception as e:
            errors['docker'] = str(e)[:200]

    try:
        from aspose.threed import Scene
        Scene.from_file(glb_path).save(usdz_path)
        if os.path.exists(usdz_path):
            return _finish(usdz_path, 'aspose')
    except Exception as e:
        errors['aspose'] = str(e)[:200]

    log.warning(f'[usdz] konvertatsiya ishlamadi (ixtiyoriy): {errors} — USDZ siz davom etamiz')
    # USDZ is optional — AR still works with GLB only (Android/WebXR). Don't fail pipeline.
    return {'ok': False, 'bytes': 0, 'tool': '', 'errors': errors, 'optional': True}


def _finish(usdz_path, tool):
    size = os.path.getsize(usdz_path)
    ok = size <= MAX_USDZ and size > 1024
    if not ok and size > MAX_USDZ:
        log.warning(f'[usdz] ⚠️ {size/1048576:.1f} MB > 5 MB limiti — iOS Quick Look ochmasligi mumkin')
    log.info(f'[usdz] {"✅" if ok else "⚠️"} {tool}: {size/1048576:.2f} MB')
    return {'ok': ok, 'bytes': size, 'tool': tool, 'errors': {}}
