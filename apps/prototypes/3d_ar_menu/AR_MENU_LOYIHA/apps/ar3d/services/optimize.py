import json
import logging
import os
import shutil
import subprocess

from django.conf import settings

log = logging.getLogger('ar3d.optimize')

MAX_GLB = getattr(settings, 'MAX_GLB_BYTES', 3 * 1024 * 1024)
GT = shutil.which('gltf-transform') or '/usr/local/bin/gltf-transform'
STEP_TIMEOUT = 300


def _run(args, label):
    log.debug(f'[opt] {label}: {" ".join(args)}')
    p = subprocess.run(args, capture_output=True, text=True, timeout=STEP_TIMEOUT)
    if p.returncode != 0:
        raise RuntimeError(f'{label} xato: {p.stderr[-500:]}')
    return p.stdout


def inspect_glb(path: str) -> dict:
    try:
        # If gltf-transform not available, fallback to file size only
        if not shutil.which('gltf-transform') and not os.path.exists(GT):
            return {'triangles': 0, 'textures': 0, 'materials': 0, 'bytes': os.path.getsize(path)}
        out = _run([GT, 'inspect', path, '--format', 'json'], 'inspect')
        j = json.loads(out)
        meshes = j.get('meshes', {}).get('properties', [])
        tris = sum(int(m.get('glPrimitives', 0)) for m in meshes)
        tex = j.get('textures', {}).get('properties', [])
        mats = j.get('materials', {}).get('properties', [])
        return {'triangles': tris, 'textures': len(tex), 'materials': len(mats), 'bytes': os.path.getsize(path)}
    except Exception as e:
        log.warning(f'[opt] inspect ishlamadi: {e}')
        try:
            size = os.path.getsize(path)
        except Exception:
            size = 0
        return {'triangles': 0, 'textures': 0, 'materials': 0, 'bytes': size}


def optimize_glb(input_path: str, output_path: str, real_size_cm: float, job=None) -> dict:
    tmp_a = output_path + '.a.glb'
    tmp_b = output_path + '.b.glb'
    before = inspect_glb(input_path)
    log.info(f'[opt] boshlanish: {before["bytes"]/1048576:.1f} MB, {before["triangles"]} tri')

    if job:
        try:
            job.set_stage('optimize', progress=50)
        except Exception:
            pass

    # If gltf-transform not installed, just copy and scale
    if not shutil.which('gltf-transform') and not os.path.exists(GT):
        log.warning('[opt] gltf-transform topilmadi — nusxa + scale qilinmoqda')
        shutil.copy(input_path, output_path)
        try:
            scale_and_center(output_path, real_size_cm / 100.0)
        except Exception as e:
            log.warning(f'[opt] scale xato: {e}')
        size = os.path.getsize(output_path)
        after = inspect_glb(output_path)
        return {'bytes': size, 'triangles': after['triangles'], 'textures': after['textures'], 'ok': size <= MAX_GLB, 'before_bytes': before['bytes']}

    try:
        _run([GT, 'resize', input_path, tmp_a, '--width', '1024', '--height', '1024'], 'resize')
        ratio = '0.5' if before['triangles'] > 120000 else '0.75'
        try:
            _run([GT, 'simplify', tmp_a, tmp_b, '--ratio', ratio, '--error', '0.001'], 'simplify')
        except RuntimeError as e:
            log.warning(f'[opt] simplify o\'tkazib yuborildi: {e}')
            shutil.copy(tmp_a, tmp_b)
        try:
            _run([GT, 'webp', tmp_b, tmp_a, '--quality', '85'], 'webp')
        except RuntimeError as e:
            log.warning(f'[opt] webp o\'tkazib yuborildi: {e}')
            shutil.copy(tmp_b, tmp_a)
        _run([GT, 'draco', tmp_a, output_path, '--quantize-position', '14', '--quantize-normal', '10', '--quantize-texcoord', '12'], 'draco')
        if job:
            try:
                job.set_stage('scale', progress=62)
            except Exception:
                pass
        scale_and_center(output_path, real_size_cm / 100.0)
        size = os.path.getsize(output_path)
        if size > MAX_GLB:
            log.warning(f'[opt] {size/1048576:.1f} MB > 3 MB — AGRESSIV rejim')
            aggressive_optimize(output_path, real_size_cm)
            size = os.path.getsize(output_path)
        after = inspect_glb(output_path)
        ok = size <= MAX_GLB
        log.info(f'[opt] {"✅" if ok else "⚠️"} natija: {size/1048576:.2f} MB, {after["triangles"]} tri (−{100 - 100*size//max(before["bytes"],1)}%)')
        return {'bytes': size, 'triangles': after['triangles'], 'textures': after['textures'], 'ok': ok, 'before_bytes': before['bytes']}
    finally:
        for f in (tmp_a, tmp_b):
            if os.path.exists(f):
                try:
                    os.unlink(f)
                except Exception:
                    pass


def aggressive_optimize(path: str, real_size_cm: float):
    steps = [
        (['resize', '--width', '512', '--height', '512'], 'resize-512'),
        (['simplify', '--ratio', '0.35', '--error', '0.005'], 'simplify-035'),
        (['webp', '--quality', '65'], 'webp-65'),
        (['resize', '--width', '256', '--height', '256'], 'resize-256'),
        (['simplify', '--ratio', '0.20', '--error', '0.02'], 'simplify-020'),
    ]
    tmp = path + '.ag.glb'
    for args, label in steps:
        try:
            _run([GT, args[0], path, tmp] + args[1:], label)
            shutil.move(tmp, path)
            scale_and_center(path, real_size_cm / 100.0)
            size = os.path.getsize(path)
            log.info(f'[opt] agressiv {label} → {size/1048576:.2f} MB')
            if size <= MAX_GLB:
                return
        except Exception as e:
            log.warning(f'[opt] agressiv {label} xato: {e}')
        finally:
            if os.path.exists(tmp):
                try:
                    os.unlink(tmp)
                except Exception:
                    pass
    log.error(f'[opt] ⛔ 3 MB ga tushirib bo\'lmadi: {os.path.getsize(path)/1048576:.2f} MB')


# ---- V-131 scale ----
try:
    import numpy as np
    from pygltflib import GLTF2
    HAS_PYGLTFLIB = True
except ImportError:
    HAS_PYGLTFLIB = False
    np = None
    GLTF2 = None


def _accessor_minmax(gltf, acc_idx):
    acc = gltf.accessors[acc_idx]
    if acc.min and acc.max and len(acc.min) >= 3:
        return np.array(acc.min[:3], dtype=float), np.array(acc.max[:3], dtype=float)
    return None, None


def _node_matrix(node):
    if node.matrix:
        return np.array(node.matrix, dtype=float).reshape(4, 4).T
    m = np.eye(4)
    if node.scale:
        m[:3, :3] = m[:3, :3] @ np.diag(node.scale)
    if node.rotation:
        x, y, z, wq = node.rotation
        r = np.array([
            [1-2*(y*y+z*z), 2*(x*y-z*wq), 2*(x*z+y*wq)],
            [2*(x*y+z*wq), 1-2*(x*x+z*z), 2*(y*z-x*wq)],
            [2*(x*z-y*wq), 2*(y*z+x*wq), 1-2*(x*x+y*y)],
        ], dtype=float)
        m[:3, :3] = r @ m[:3, :3]
    if node.translation:
        m[:3, 3] = node.translation
    return m


def compute_bbox(gltf):
    if not HAS_PYGLTFLIB:
        raise RuntimeError('pygltflib yo\'q')
    scene = gltf.scenes[gltf.scene or 0]
    lo = np.array([np.inf] * 3)
    hi = np.array([-np.inf] * 3)

    def walk(node_idx, parent):
        nonlocal lo, hi
        node = gltf.nodes[node_idx]
        world = parent @ _node_matrix(node)
        if node.mesh is not None:
            for prim in gltf.meshes[node.mesh].primitives:
                pos = prim.attributes.POSITION
                if pos is None:
                    continue
                amin, amax = _accessor_minmax(gltf, pos)
                if amin is None:
                    continue
                for cx in (amin[0], amax[0]):
                    for cy in (amin[1], amax[1]):
                        for cz in (amin[2], amax[2]):
                            p = world @ np.array([cx, cy, cz, 1.0])
                            lo = np.minimum(lo, p[:3])
                            hi = np.maximum(hi, p[:3])
        for child in (node.children or []):
            walk(child, world)

    for root in (scene.nodes or []):
        walk(root, np.eye(4))
    if not np.all(np.isfinite(lo)):
        raise ValueError('bbox hisoblanmadi — POSITION accessor min/max yo\'q')
    return lo, hi


def scale_and_center(glb_path: str, target_size_m: float):
    if not HAS_PYGLTFLIB:
        log.warning('[scale] pygltflib yo\'q — scale o\'tkazib yuborildi')
        return {'scale': 1.0, 'size_m': [0, 0, 0], 'target_m': target_size_m}
    if target_size_m <= 0 or target_size_m > 3.0:
        raise ValueError(f'target_size_m mantiqsiz: {target_size_m}')
    gltf = GLTF2().load(glb_path)
    lo, hi = compute_bbox(gltf)
    size = hi - lo
    center = (hi + lo) / 2.0
    current_max = float(max(size[0], size[2]))
    if current_max <= 1e-9:
        raise ValueError('model gorizontal o\'lchamsiz (yassi?)')
    scale = target_size_m / current_max
    from pygltflib import Node
    scene = gltf.scenes[gltf.scene or 0]
    old_roots = list(scene.nodes or [])
    wrapper = Node(
        name='ARMENU_scale_root',
        children=old_roots,
        scale=[scale, scale, scale],
        translation=[float(-center[0] * scale), float(-lo[1] * scale), float(-center[2] * scale)],
    )
    gltf.nodes.append(wrapper)
    scene.nodes = [len(gltf.nodes) - 1]
    gltf.save(glb_path)
    final = size * scale
    log.info(f'[scale] ⚡ {current_max:.3f} m → {target_size_m:.3f} m (×{scale:.4f}) | yakuniy: {final[0]:.3f}×{final[1]:.3f}×{final[2]:.3f} m | tag Y=0')
    return {'scale': scale, 'size_m': [float(x) for x in final], 'target_m': target_size_m}


def verify_scale(glb_path: str, expected_m: float, tol: float = 0.02) -> bool:
    if not HAS_PYGLTFLIB:
        return True
    gltf = GLTF2().load(glb_path)
    lo, hi = compute_bbox(gltf)
    size = hi - lo
    got = float(max(size[0], size[2]))
    size_ok = abs(got - expected_m) <= tol
    floor_ok = abs(float(lo[1])) <= tol
    if not size_ok:
        log.error(f'[scale] ⛔ O\'LCHAM XATO: {got:.3f} m ≠ {expected_m:.3f} m')
    if not floor_ok:
        log.error(f'[scale] ⛔ TAG Y≠0: min_y={lo[1]:.4f}')
    return size_ok and floor_ok
