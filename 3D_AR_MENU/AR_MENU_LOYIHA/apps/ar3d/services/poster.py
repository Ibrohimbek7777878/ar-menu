import logging
import os
import shutil
import subprocess
import tempfile

from PIL import Image

log = logging.getLogger('ar3d.poster')

POSTER_SIZE = 800
POSTER_QUALITY = 82

RENDER_HTML = """<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent;width:%(w)dpx;height:%(w)dpx}
model-viewer{width:%(w)dpx;height:%(w)dpx;--poster-color:transparent}</style>
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>
<model-viewer id="mv" src="%(src)s" camera-orbit="25deg 68deg auto"
  shadow-intensity="1" environment-image="neutral" exposure="1.1"
  interaction-prompt="none" disable-zoom></model-viewer>
<script type="module">
  const mv = document.getElementById('mv');
  await mv.updateComplete;
  await new Promise(r => mv.addEventListener('load', r, {once:true}));
  await new Promise(r => setTimeout(r, 900));
  const blob = await mv.toBlob({idealAspect:true, mimeType:'image/png'});
  const buf = await blob.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  document.title = 'READY';
  window.__poster = b64;
</script>"""


def render_poster(glb_path: str, out_webp: str, job=None) -> dict:
    if job:
        try:
            job.set_stage('poster', progress=80)
        except Exception:
            pass
    png = out_webp + '.png'
    try:
        if _render_chromium(glb_path, png) and os.path.exists(png):
            return _to_webp(png, out_webp, 'chromium')
    except Exception as e:
        log.warning(f'[poster] chromium ishlamadi: {e}')
    log.info('[poster] render qilinmadi — zaxira rasm yoki providersiz davom')
    return {'ok': False, 'bytes': 0, 'tool': '', 'optional': True}


def _render_chromium(glb_path: str, out_png: str) -> bool:
    chrome = (shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome'))
    if not chrome:
        return False
    d = tempfile.mkdtemp(prefix='armenu_poster_')
    try:
        local_glb = os.path.join(d, 'm.glb')
        shutil.copy(glb_path, local_glb)
        html = os.path.join(d, 'r.html')
        with open(html, 'w', encoding='utf-8') as f:
            f.write(RENDER_HTML % {'w': POSTER_SIZE, 'src': 'm.glb'})
        subprocess.run([
            chrome, '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--default-background-color=00000000',
            f'--window-size={POSTER_SIZE},{POSTER_SIZE}',
            '--virtual-time-budget=12000',
            f'--screenshot={out_png}',
            f'file://{html}',
        ], capture_output=True, timeout=90)
        return os.path.exists(out_png) and os.path.getsize(out_png) > 2000
    except Exception:
        return False
    finally:
        shutil.rmtree(d, ignore_errors=True)


def _to_webp(png_path, webp_path, tool):
    img = Image.open(png_path).convert('RGBA')
    img.thumbnail((POSTER_SIZE, POSTER_SIZE), Image.LANCZOS)
    img.save(webp_path, 'WEBP', quality=POSTER_QUALITY, method=6)
    try:
        os.unlink(png_path)
    except Exception:
        pass
    size = os.path.getsize(webp_path)
    log.info(f'[poster] ✅ {tool}: {size//1024} KB')
    return {'ok': True, 'bytes': size, 'tool': tool}


def poster_from_url(url: str, out_webp: str) -> dict:
    import requests
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        tmp = out_webp + '.src'
        with open(tmp, 'wb') as f:
            f.write(r.content)
        img = Image.open(tmp).convert('RGBA')
        img.thumbnail((POSTER_SIZE, POSTER_SIZE), Image.LANCZOS)
        img.save(out_webp, 'WEBP', quality=POSTER_QUALITY, method=6)
        try:
            os.unlink(tmp)
        except Exception:
            pass
        return {'ok': True, 'bytes': os.path.getsize(out_webp), 'tool': 'provider'}
    except Exception as e:
        log.warning(f'[poster] provider thumbnail xato: {e}')
        return {'ok': False, 'bytes': 0, 'tool': ''}
