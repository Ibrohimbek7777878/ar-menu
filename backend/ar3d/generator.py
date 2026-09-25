"""
3D model generatsiya qilish — rasmdan GLB yaratish.
Trimesh + pygltflib orqali mahsulot rasmlaridan 3D model yaratiladi.
"""
import os
import io
import logging
import numpy as np
import trimesh
import pygltflib
from PIL import Image

logger = logging.getLogger(__name__)


def generate_glb_from_image(image_path, output_path=None):
    """
    Rasmdan 3D GLB model yaratadi.
    Rasmni textura sifatida 3D shaklga (box/sphere) qo'llaydi.
    
    Args:
        image_path: Rasm fayl yo'li (absolute yoki relative)
        output_path: Saqlash yo'li (None bo'lsa avtomatik)
    
    Returns:
        str: GLB fayl yo'li yoki None
    """
    try:
        # Rasmni yuklash
        img = Image.open(image_path)
        img = img.convert('RGBA')
        
        # Rasm hajmini kichraytirish (tezlik uchun)
        max_size = 512
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        
        # GLB faylga saqlash
        if output_path is None:
            base_dir = os.path.dirname(image_path)
            name = os.path.splitext(os.path.basename(image_path))[0]
            output_path = os.path.join(base_dir, f'{name}_3d.glb')
        
        # 3D model yaratish — box shaklida (mahsulot shakli)
        width, height = img.size
        aspect = width / height
        
        # Box o'lchamlari
        box_w = 0.15 * aspect
        box_h = 0.15
        box_d = 0.02
        
        # Trimesh bilan box yaratish
        box = trimesh.creation.box(extents=[box_w, box_h, box_d])
        
        # Rasmni textura sifatida saqlash
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Material yaratish
        material = trimesh.visual.material.SimpleMaterial(image=img)
        
        # Visual qo'shish
        box.visual = trimesh.visual.TextureVisuals(material=material)
        
        # GLB formatda saqlash
        box.export(output_path, file_type='glb')
        
        logger.info(f'3D model yaratildi: {output_path}')
        return output_path
        
    except Exception as e:
        logger.error(f'3D model yaratishda xato: {e}')
        return None


def generate_glb_simple(image_path, output_path=None):
    """
    Oddiy 3D model — rasmni tekis plastinka sifatida.
    Eng tez va ishonchli usul.
    """
    try:
        img = Image.open(image_path).convert('RGBA')
        
        max_size = 512
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        
        if output_path is None:
            base_dir = os.path.dirname(image_path)
            name = os.path.splitext(os.path.basename(image_path))[0]
            output_path = os.path.join(base_dir, f'{name}_3d.glb')
        
        width, height = img.size
        # Tekis plastinka (plane)
        w = 0.1 * (width / max(width, height))
        h = 0.1 * (height / max(width, height))
        
        # Plane mesh
        vertices = np.array([
            [-w/2, -h/2, 0],
            [ w/2, -h/2, 0],
            [ w/2,  h/2, 0],
            [-w/2,  h/2, 0],
        ], dtype=np.float32)
        
        faces = np.array([
            [0, 1, 2],
            [0, 2, 3],
        ], dtype=np.uint32)
        
        # UV coords
        uv = np.array([
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
        ], dtype=np.float32)
        
        # Trimesh
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Rasmni PNG formatda saqlash
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Material
        material = trimesh.visual.material.SimpleMaterial(image=img)
        mesh.visual = trimesh.visual.TextureVisuals(material=material, uv=uv)
        
        # Export
        mesh.export(output_path, file_type='glb')
        
        logger.info(f'Simple 3D model yaratildi: {output_path}')
        return output_path
        
    except Exception as e:
        logger.error(f'Simple 3D model xato: {e}')
        return None


def generate_glb_from_4_angles(front_path, back_path=None, right_path=None, left_path=None, output_path=None):
    """
    4 ta rakursdagi rasmlardan (Oldi, Orqasi, O'ng, Chap) 3D GLB model yaratadi.
    Har bir tomon o'zining haqiqiy rasmi bilan qoplanadi.
    
    Args:
        front_path: Oldi tomon rasmi (majburiy)
        back_path: Orqa tomon rasmi (ixtiyoriy)
        right_path: O'ng tomon rasmi (ixtiyoriy)
        left_path: Chap/Yuqori tomon rasmi (ixtiyoriy)
        output_path: Saqlash yo'li
    
    Returns:
        str: GLB fayl yo'li yoki None
    """
    try:
        if not front_path or not os.path.exists(front_path):
            return None
            
        img_f = Image.open(front_path).convert('RGBA')
        img_b = Image.open(back_path).convert('RGBA') if back_path and os.path.exists(back_path) else img_f.transpose(Image.FLIP_LEFT_RIGHT)
        img_r = Image.open(right_path).convert('RGBA') if right_path and os.path.exists(right_path) else img_f.crop((int(img_f.width * 0.8), 0, img_f.width, img_f.height))
        img_l = Image.open(left_path).convert('RGBA') if left_path and os.path.exists(left_path) else img_f.crop((0, 0, int(img_f.width * 0.2), img_f.height))

        # Standart 512x512 kvadrantlarga birlashtirish (Texture Atlas 1024x1024)
        q_size = 512
        atlas = Image.new('RGBA', (q_size * 2, q_size * 2), (255, 255, 255, 255))
        atlas.paste(img_f.resize((q_size, q_size), Image.LANCZOS), (0, 0))
        atlas.paste(img_b.resize((q_size, q_size), Image.LANCZOS), (q_size, 0))
        atlas.paste(img_l.resize((q_size, q_size), Image.LANCZOS), (0, q_size))
        atlas.paste(img_r.resize((q_size, q_size), Image.LANCZOS), (q_size, q_size))

        w_px, h_px = img_f.size
        aspect = w_px / max(h_px, 1)
        w = 0.20 * min(aspect, 1.6)
        h = 0.20
        d = 0.08

        # 24 vertex (har bir 6 yuz uchun mustaqil 4 ta cho'qqi va UV)
        v_front = [[-w/2, -h/2, d/2], [w/2, -h/2, d/2], [w/2, h/2, d/2], [-w/2, h/2, d/2]]
        v_back  = [[w/2, -h/2, -d/2], [-w/2, -h/2, -d/2], [-w/2, h/2, -d/2], [w/2, h/2, -d/2]]
        v_right = [[w/2, -h/2, d/2], [w/2, -h/2, -d/2], [w/2, h/2, -d/2], [w/2, h/2, d/2]]
        v_left  = [[-w/2, -h/2, -d/2], [-w/2, -h/2, d/2], [-w/2, h/2, d/2], [-w/2, h/2, -d/2]]
        v_top   = [[-w/2, h/2, d/2], [w/2, h/2, d/2], [w/2, h/2, -d/2], [-w/2, h/2, -d/2]]
        v_bottom= [[-w/2, -h/2, -d/2], [w/2, -h/2, -d/2], [w/2, -h/2, d/2], [-w/2, -h/2, d/2]]

        vertices = np.array(v_front + v_back + v_right + v_left + v_top + v_bottom, dtype=np.float32)

        faces = []
        for i in range(6):
            base = i * 4
            faces.append([base, base + 1, base + 2])
            faces.append([base, base + 2, base + 3])
        faces = np.array(faces, dtype=np.uint32)

        # UV koordinatalari:
        # Atlas kvadrantlari:
        # Top-Left (u: 0..0.5, v: 0.5..1.0) -> Oldi (Front)
        # Top-Right (u: 0.5..1.0, v: 0.5..1.0) -> Orqa (Back)
        # Bottom-Left (u: 0..0.5, v: 0..0.5) -> Chap (Left)
        # Bottom-Right (u: 0.5..1.0, v: 0..0.5) -> O'ng (Right)
        uv_front  = [[0.0, 0.5], [0.5, 0.5], [0.5, 1.0], [0.0, 1.0]]
        uv_back   = [[0.5, 0.5], [1.0, 0.5], [1.0, 1.0], [0.5, 1.0]]
        uv_right  = [[0.5, 0.0], [1.0, 0.0], [1.0, 0.5], [0.5, 0.5]]
        uv_left   = [[0.0, 0.0], [0.5, 0.0], [0.5, 0.5], [0.0, 0.5]]
        uv_top    = [[0.0, 0.95], [0.5, 0.95], [0.5, 1.0], [0.0, 1.0]]
        uv_bottom = [[0.0, 0.5], [0.5, 0.5], [0.5, 0.55], [0.0, 0.55]]

        uvs = np.array(uv_front + uv_back + uv_right + uv_left + uv_top + uv_bottom, dtype=np.float32)

        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        material = trimesh.visual.material.SimpleMaterial(image=atlas)
        mesh.visual = trimesh.visual.TextureVisuals(material=material, uv=uvs)

        if output_path is None:
            base_dir = os.path.dirname(front_path)
            name = os.path.splitext(os.path.basename(front_path))[0]
            output_path = os.path.join(base_dir, f'{name}_4angle_3d.glb')

        mesh.export(output_path, file_type='glb')
        logger.info(f'4-rakursli 3D model yaratildi: {output_path}')
        return output_path
    except Exception as e:
        logger.error(f'4-rakursli 3D model yaratishda xato: {e}')
        return None


def create_3d_for_product(product, force_ai=False):
    """
    Mahsulot uchun 3D model yaratadi:
    1. Agar force_ai=False bo'lsa va ko'p rakursli rasm yo'q bo'lsa, avval kutubxonadan qidiradi.
    2. Mahsulot rasmlaridan (oldingi, orqa, o'ng, chap) 4-rakursli yoki 3D model hosil qiladi.
    
    Returns:
        (bool, str): (muvaffaqiyat, model_url_yoki_xato)
    """
    from ar3d.services import auto_attach_library_3d
    from ar3d.models import Product3DModel
    from django.conf import settings

    has_multi_angles = bool(product.image2 or product.image3 or getattr(product, 'image4', None))

    # 1. Kutubxonadan qidirish (agar maxsus AI majburlanmagan va ko'p rakurs berilmagan bo'lsa)
    if not force_ai and not has_multi_angles:
        ok, matched = auto_attach_library_3d(product, force=True)
        if ok and matched:
            return True, matched.glb_url

    # 2. Rasmlardan yaratish
    if not product.image:
        return False, "Rasm yo'q"

    try:
        front_path = product.image.path if product.image else None
        if not front_path or not os.path.exists(front_path):
            return False, "Asosiy rasm fayli topilmadi"

        back_path = product.image2.path if (product.image2 and os.path.exists(product.image2.path)) else None
        right_path = product.image3.path if (product.image3 and os.path.exists(product.image3.path)) else None
        left_path = product.image4.path if (getattr(product, 'image4', None) and os.path.exists(product.image4.path)) else None

        media_dir = os.path.dirname(front_path)
        target_glb_path = os.path.join(media_dir, f'product_{product.pk}_3d.glb')

        glb_path = generate_glb_from_4_angles(
            front_path=front_path,
            back_path=back_path,
            right_path=right_path,
            left_path=left_path,
            output_path=target_glb_path
        )

        if not glb_path or not os.path.exists(glb_path):
            # Fallback to simple
            glb_path = generate_glb_simple(front_path, target_glb_path)

        if glb_path and os.path.exists(glb_path):
            rel_path = os.path.relpath(glb_path, settings.MEDIA_ROOT)
            model_url = f'/media/{rel_path}'

            product.ar_model = model_url
            product.has_3d = True
            product.save(update_fields=['ar_model', 'has_3d'])

            Product3DModel.objects.update_or_create(
                product=product,
                defaults={
                    'status': 'ready',
                    'source': 'ai_generated_4angles' if has_multi_angles else 'ai_generated',
                    'real_size_cm': 20,
                }
            )

            return True, model_url
        else:
            return False, '3D model yaratilmadi'

    except Exception as e:
        logger.error(f'create_3d_for_product xato: {e}')
        return False, str(e)
