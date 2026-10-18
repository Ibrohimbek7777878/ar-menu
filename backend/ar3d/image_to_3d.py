"""
Taom rasmidan 3D model (GLB) yasash provayderlari.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (5-qadam)

Standart provayder — `relief`: AI'siz, internetsiz, bepul, noutbukda soniyalarda ishlaydi.
Taom rasmi dumaloq tarelka shaklidagi hajmli (relyef) sirtga tortiladi: ustidan qaralganda
taom aynan rasmdagidek ko'rinadi, yon tomonlari taxminiy. Bu "haqiqiy skaner" emas —
lekin hech qachon boshqa taomning modelini ko'rsatmaydi.

Keyin bulut AI (Meshy/Tripo) yoki lokal TripoSR qo'shilsa — shu interfeysni amalga oshiradi
va RESTAURANT_3D_PROVIDER sozlamasi bilan tanlanadi.
"""
import io
import math

import numpy as np
from django.conf import settings
from PIL import Image, ImageOps


class Image3DError(Exception):
    """Rasmdan 3D yasab bo'lmadi (sababi admin'ga ko'rsatiladi)."""


class Image3DProvider:
    name = 'base'
    label = ''

    def generate(self, image_path: str, out_path: str) -> None:
        raise NotImplementedError


def _box_blur(arr, k):
    """Kvadrat yadroli silliqlash (scipy'siz, integral tasvir bilan)."""
    if k <= 1:
        return arr
    pad = k // 2
    a = np.pad(arr, pad, mode='edge')
    c = a.cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    h, w = arr.shape
    s = c[k:k + h, k:k + w] - c[:h, k:k + w] - c[k:k + h, :w] + c[:h, :w]
    return s / float(k * k)


def _bilinear(field, u, v):
    """field[N,N] dan (u, v) ∈ [0,1] nuqtalardagi qiymat."""
    n = field.shape[0] - 1
    x = np.clip(u * n, 0, n)
    y = np.clip(v * n, 0, n)
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    x1 = np.minimum(x0 + 1, n)
    y1 = np.minimum(y0 + 1, n)
    fx = x - x0
    fy = y - y0
    top = field[y0, x0] * (1 - fx) + field[y0, x1] * fx
    bot = field[y1, x0] * (1 - fx) + field[y1, x1] * fx
    return top * (1 - fy) + bot * fy


class ReliefProvider(Image3DProvider):
    """Rasm-relyef: tarelka + taom rasmidan hajmli sirt."""

    name = 'relief'
    label = "Rasm-relyef (AI'siz, taxminiy)"

    GRID = 160            # balandlik maydoni o'lchami
    RINGS = 64            # radial halqalar
    SEGMENTS = 128        # aylana bo'laklari
    TEXTURE_PX = 1024
    DIAMETER_M = 0.26     # tarelka diametri (model-viewer metrda o'lchaydi)
    BASE_M = 0.012        # tarelka qalinligi
    HEAP_M = 0.045        # taom uyumining eng baland nuqtasi
    DETAIL_M = 0.006      # rasmdagi mayda detallar chuqurligi
    PLATE_RGB = (242, 238, 230)  # yon devor va tag (oq-krem chinni)

    def _load_square(self, image_path):
        try:
            img = Image.open(image_path)
            img = ImageOps.exif_transpose(img).convert('RGB')
        except Exception as exc:
            raise Image3DError(f"Rasmni o'qib bo'lmadi: {exc}")
        w, h = img.size
        if min(w, h) < 200:
            raise Image3DError("Rasm juda kichik (kamida 200×200 piksel kerak)")
        s = min(w, h)
        left, top = (w - s) // 2, (h - s) // 2
        square = img.crop((left, top, left + s, top + s))
        return self._crop_to_dish(square)

    def _crop_to_dish(self, square):
        """Taom (tarelka) joylashgan hududni topib, uni markazga oladi — stol/fon diskka tushmasin."""
        n = 128
        rgb = np.asarray(square.resize((n, n), Image.LANCZOS), dtype=np.float32) / 255.0
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        diff = np.linalg.norm(rgb - np.median(border, axis=0), axis=2) / math.sqrt(3)
        mask = _box_blur((diff > 0.12).astype(np.float32), 5) > 0.5
        if mask.mean() < 0.08 or mask.mean() > 0.92:
            return square                     # aniq ajratib bo'lmadi — butun kvadrat
        ys, xs = np.nonzero(mask)
        cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        half = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 * 1.04
        scale = square.size[0] / n
        box = [(cx - half) * scale, (cy - half) * scale, (cx + half) * scale, (cy + half) * scale]
        side = box[2] - box[0]
        if side < square.size[0] * 0.35:
            return square
        return square.crop(tuple(int(round(v)) for v in box))

    def _height_field(self, square):
        n = self.GRID
        rgb = np.asarray(square.resize((n, n), Image.LANCZOS), dtype=np.float32) / 255.0
        lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
        xx = xx / (n - 1) * 2 - 1
        yy = yy / (n - 1) * 2 - 1
        r = np.sqrt(xx ** 2 + yy ** 2)

        # Fon rangi — rasm chetlari; taom fon rangidan farq qiladigan va markazga yaqin piksellar
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg = np.median(border, axis=0)
        diff = np.linalg.norm(rgb - bg, axis=2) / math.sqrt(3)
        food = (diff > 0.10) & (r < 0.93)
        if food.mean() < 0.12:            # fon taomga juda o'xshash — taom markazda deb hisoblaymiz
            food = r < 0.78
        soft = _box_blur(food.astype(np.float32), 9)

        dome = np.clip(1 - r / 0.93, 0, 1) ** 0.55
        detail = _box_blur(lum, 3) - _box_blur(lum, 17)
        height = self.HEAP_M * soft * (0.6 * dome + 0.4) + self.DETAIL_M * detail * soft
        return np.clip(height, 0, None)

    def generate(self, image_path, out_path):
        import trimesh

        square = self._load_square(image_path)
        height = self._height_field(square)
        radius = self.DIAMETER_M / 2

        # Qutb (polar) to'r: markaz + halqalar
        rings, segs = self.RINGS, self.SEGMENTS
        theta = np.linspace(0, 2 * math.pi, segs, endpoint=False)
        verts, uvs = [], []

        def add(x, y, z, u, v):
            verts.append((x, y, z))
            uvs.append((u, v))
            return len(verts) - 1

        def top_uv(rr, th):
            # rasm koordinatasi: u o'ngga, v pastga (glTF uchun v teskari)
            return 0.5 + 0.5 * rr * np.cos(th), 0.5 + 0.5 * rr * np.sin(th)

        def top_height(u, v):
            return self.BASE_M + _bilinear(height, u, v)

        center_h = float(top_height(np.array([0.5]), np.array([0.5]))[0])
        c_idx = add(0.0, center_h, 0.0, 0.5, 0.5)
        ring_idx = []
        for i in range(1, rings + 1):
            rr = i / rings
            u, v = top_uv(rr, theta)
            hgt = top_height(u, v)
            idx = [add(radius * rr * math.cos(t), float(h), radius * rr * math.sin(t), float(uu), float(1 - vv))
                   for t, h, uu, vv in zip(theta, hgt, u, v)]
            ring_idx.append(idx)

        faces = []
        first = ring_idx[0]
        for j in range(segs):
            faces.append((c_idx, first[(j + 1) % segs], first[j]))
        for a, b in zip(ring_idx[:-1], ring_idx[1:]):
            for j in range(segs):
                j2 = (j + 1) % segs
                faces.append((a[j], a[j2], b[j]))
                faces.append((a[j2], b[j2], b[j]))

        # Yon devor va tag: tarelka rangi. Tekstura kvadratining burchagi (aylanadan tashqari, tepa sirt
        # ishlatmaydi) shu rangga bo'yaladi va yon/tag UV'lari o'sha nuqtaga qaraydi — avval chekka piksellar
        # pastga cho'zilib, yo'l-yo'l bo'lib ko'rinardi.
        plate_uv = (0.985, 0.985)
        edge = ring_idx[-1]
        rim = [add(verts[k][0], verts[k][1], verts[k][2], *plate_uv) for k in edge]
        bottom = [add(verts[k][0], 0.0, verts[k][2], *plate_uv) for k in edge]
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append((rim[j], rim[j2], bottom[j]))
            faces.append((rim[j2], bottom[j2], bottom[j]))
        b_center = add(0.0, 0.0, 0.0, *plate_uv)
        for j in range(segs):
            faces.append((b_center, bottom[j], bottom[(j + 1) % segs]))

        # Tekstura: JPEG (GLB hajmi kichik bo'lishi uchun)
        tex = square.resize((self.TEXTURE_PX, self.TEXTURE_PX), Image.LANCZOS)
        patch = int(self.TEXTURE_PX * 0.04)
        tex.paste(self.PLATE_RGB, (self.TEXTURE_PX - patch, 0, self.TEXTURE_PX, patch))  # glTF v teskari: yuqori o'ng burchak
        buf = io.BytesIO()
        tex.save(buf, format='JPEG', quality=85)
        buf.seek(0)
        texture = Image.open(buf)

        material = trimesh.visual.material.PBRMaterial(
            baseColorTexture=texture, metallicFactor=0.0, roughnessFactor=0.75, doubleSided=False,
        )
        mesh = trimesh.Trimesh(
            vertices=np.array(verts, dtype=np.float64),
            faces=np.array(faces, dtype=np.int64),
            visual=trimesh.visual.TextureVisuals(uv=np.array(uvs, dtype=np.float64), material=material),
            process=False,
        )
        # Uchburchak yo'nalishi qo'lda to'g'ri tuzilgan (tepa ↑, yon devor tashqariga, past ↓) — fix_normals scipy talab qiladi
        mesh.export(out_path, file_type='glb')


PROVIDERS = {
    ReliefProvider.name: ReliefProvider,
}


def get_provider() -> Image3DProvider:
    key = (getattr(settings, 'RESTAURANT_3D_PROVIDER', '') or 'relief').strip().lower()
    cls = PROVIDERS.get(key)
    if not cls:
        raise Image3DError(f"'{key}' 3D provayderi hali ulanmagan. Mavjudlari: {', '.join(PROVIDERS)}")
    return cls()
