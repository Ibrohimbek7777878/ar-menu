import logging
import os
import tempfile

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from core.exceptions import PlanLimit, TenantMismatch
from core.permissions import IsRestAdmin
from apps.ar3d.models import DishModel3D, Model3DJob

log = logging.getLogger('ar3d.admin')

AR_PLANS = {'pro', 'pro_fiscal', 'enterprise'}


def _check_plan(restaurant):
    plan = getattr(restaurant, 'plan', None)
    # If plan field not exists or is empty, skip check for now (dev)
    if not plan:
        return
    if plan not in AR_PLANS:
        raise PlanLimit({'reason': 'plan', 'current': plan, 'required': sorted(AR_PLANS)})
    limit = getattr(restaurant, 'ar_model_limit', None)
    if limit is not None and limit >= 0:
        used = DishModel3D.objects.filter(restaurant=restaurant, status__in=['ready', 'processing', 'queued']).count()
        if used >= limit:
            raise PlanLimit({'reason': 'limit', 'used': used, 'limit': limit})


IsAdmin = IsRestAdmin


def _get_rest(request):
    return getattr(request, 'restaurant', None) or (getattr(request, 'staff', None) and request.staff.restaurant)

def _get_rid(request):
    return getattr(request, 'restaurant_id', None) or (getattr(request, 'staff', None) and request.staff.restaurant_id)

@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def ar_generate(request):
    from apps.menu.models import Dish
    rest = _get_rest(request)
    _check_plan(rest)
    dish = Dish.objects.filter(id=request.data.get('dish_id'), restaurant_id=rest.id).first()
    if dish is None:
        raise TenantMismatch({'dish_id': request.data.get('dish_id')})
    running = Model3DJob.objects.filter(dish=dish, status__in=['queued', 'running']).first()
    if running:
        return Response({'job_id': running.id, 'status': running.status, 'message': 'Bu taom uchun generatsiya allaqachon navbatda'}, status=status.HTTP_200_OK)
    images = request.data.get('images') or []
    if isinstance(images, str):
        images = [images]
    if request.FILES:
        for f in request.FILES.getlist('images')[:6]:
            from django.core.files.storage import default_storage
            path = default_storage.save(f'ar/src/{dish.id}/{f.name}', f)
            images.append(default_storage.url(path))
    if not images and getattr(dish, 'image', None):
        try:
            images = [dish.image.url] if dish.image else []
        except Exception:
            images = []
    if not images:
        return Response({'error': {'code': 'VALIDATION_ERROR', 'message_uz': 'Kamida 1 ta rasm kerak (3-6 ta yaxshiroq)', 'message_ru': 'Нужна минимум 1 фотография (лучше 3-6)', 'message_en': 'At least 1 image required (3-6 is better)'}}, status=status.HTTP_400_BAD_REQUEST)
    try:
        size_cm = float(request.data.get('real_size_cm') or 25)
    except (TypeError, ValueError):
        size_cm = 25.0
    if not (3 <= size_cm <= 200):
        return Response({'error': {'code': 'VALIDATION_ERROR', 'message_uz': "O'lcham 3-200 sm oralig'ida bo'lishi kerak", 'message_ru': 'Размер должен быть от 3 до 200 см', 'message_en': 'Size must be between 3 and 200 cm'}}, status=status.HTTP_400_BAD_REQUEST)
    m3d, _ = DishModel3D.objects.get_or_create(dish=dish, defaults={'restaurant_id': rest.id})
    m3d.status = 'queued'
    m3d.progress = 0
    m3d.real_size_cm = size_cm
    m3d.error_msg = ''
    m3d.save()
    job = Model3DJob.objects.create(restaurant_id=rest.id, dish=dish, model=m3d, images=images, real_size_cm=size_cm, prefer_library=bool(request.data.get('prefer_library', True)), created_by=getattr(request, 'staff', None))
    log.info(f'[admin] 3D navbatga: Job#{job.id} dish={dish.id} "{dish.name_uz}" {size_cm} sm')
    return Response({'job_id': job.id, 'dish_id': dish.id, 'status': 'queued', 'real_size_cm': size_cm, 'message': 'Navbatga qo\'yildi. Odatda 2-5 daqiqa oladi.'}, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_jobs(request):
    qs = (Model3DJob.objects.select_related('dish').filter(restaurant_id=_get_rid(request)).order_by('-created_at')[:50])
    return Response({'jobs': [{'id': j.id, 'dish_id': j.dish_id, 'dish_name': j.dish.name_uz, 'status': j.status, 'stage': j.stage, 'stage_label': dict(Model3DJob.STAGE).get(j.stage, j.stage), 'progress': j.progress, 'provider': j.provider, 'cost_usd': float(j.cost_usd), 'error': j.error[:200] if j.error else '', 'created_at': j.created_at.isoformat()} for j in qs]})


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_library_search(request):
    from apps.ar3d.services.library import find_by_name
    from apps.ar3d.models import DishLibrary
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': []})
    best, score = find_by_name(q)
    try:
        qs = list(DishLibrary.objects.filter(is_active=True).filter(aliases__contains=[q.lower()])[:10])
    except Exception:
        qs = list(DishLibrary.objects.filter(is_active=True)[:10])
    seen, out = set(), []
    for lib in ([best] if best else []) + qs:
        if lib is None or lib.id in seen:
            continue
        seen.add(lib.id)
        out.append({'id': lib.id, 'key': lib.key, 'name': lib.name_uz, 'poster': lib.poster_url, 'glb': lib.glb_url, 'real_size_cm': float(lib.real_size_cm), 'quality': lib.quality, 'used_by': lib.used_by_count, 'confidence': score if lib is best else None})
    return Response({'results': out})


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def ar_use_library(request):
    from apps.menu.models import Dish
    from apps.ar3d.models import DishLibrary
    from apps.ar3d.services.library import copy_from_library
    rest = _get_rest(request)
    _check_plan(rest)
    dish = Dish.objects.filter(id=request.data.get('dish_id'), restaurant_id=rest.id).first()
    lib = DishLibrary.objects.filter(id=request.data.get('library_id'), is_active=True).first()
    if dish is None or lib is None:
        raise TenantMismatch({'reason': 'not_found'})
    size = request.data.get('real_size_cm')
    m3d = copy_from_library(dish, lib, real_size_cm=float(size) if size else None)
    return Response({'ok': True, 'dish_id': dish.id, 'real_size_cm': float(m3d.real_size_cm), 'cost_usd': 0.0, 'source': 'library'})


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_models(request):
    from apps.menu.models import Dish
    from apps.ar3d.models import DishModel3D
    qs = Dish.objects.filter(restaurant_id=_get_rid(request)).select_related('model3d').order_by('name_uz')[:200]
    out = []
    for d in qs:
        m = getattr(d, 'model3d', None)
        out.append({
            'dish_id': d.id,
            'dish_name': d.name_uz,
            'dish_image': d.image.url if getattr(d, 'image', None) and d.image else '',
            'status': m.status if m else 'none',
            'source': m.source if m else '',
            'progress': m.progress if m else 0,
            'real_size_cm': float(m.real_size_cm) if m else float(getattr(d, 'real_size_cm', 25) or 25),
            'glb': m.url_glb() if m else '',
            'usdz': m.url_usdz() if m else '',
            'poster': m.url_poster() if m else '',
            'glb_bytes': m.glb_bytes if m else 0,
            'usdz_bytes': m.usdz_bytes if m else 0,
            'poly_count': m.poly_count if m else 0,
            'view_count': m.view_count if m else 0,
            'convert_rate': m.convert_rate if m else 0,
            'error_msg': m.error_msg if m else '',
            'stage': '',
            'stage_label': '',
        })
    # Merge with jobs for processing items
    jobs = {j.dish_id: j for j in Model3DJob.objects.filter(restaurant_id=_get_rid(request), status__in=['queued', 'running']).select_related('dish')}
    for o in out:
        j = jobs.get(o['dish_id'])
        if j:
            o['status'] = j.status if o['status'] == 'none' else o['status']
            o['progress'] = j.progress
            o['stage'] = j.stage
            o['stage_label'] = dict(Model3DJob.STAGE).get(j.stage, j.stage)
    return Response({'models': out})


@api_view(['GET'])
@permission_classes([IsAdmin])
def ar_analytics_view(request):
    from apps.ar3d.analytics import full_report
    days = min(365, max(1, int(request.query_params.get('days') or 30)))
    return Response(full_report(_get_rid(request), days))


@api_view(['POST'])
@permission_classes([IsAdmin])
@parser_classes([MultiPartParser, FormParser])
def ar_upload(request):
    from apps.menu.models import Dish
    from apps.ar3d.services import optimize, usdz as usdz_svc, poster as poster_svc, storage
    rest = _get_rest(request)
    _check_plan(rest)
    dish = Dish.objects.filter(id=request.data.get('dish_id'), restaurant_id=rest.id).first()
    if dish is None:
        raise TenantMismatch({'dish_id': request.data.get('dish_id')})
    f = request.FILES.get('glb')
    if f is None or not f.name.lower().endswith('.glb'):
        return Response({'error': {'code': 'VALIDATION_ERROR', 'message_uz': 'GLB fayl yuklang (.glb)', 'message_ru': 'Загрузите GLB файл (.glb)', 'message_en': 'Please upload a GLB file (.glb)'}}, status=status.HTTP_400_BAD_REQUEST)
    if f.size > 150 * 1024 * 1024:
        return Response({'error': {'code': 'VALIDATION_ERROR', 'message_uz': 'Fayl juda katta (maks 150 MB)', 'message_ru': 'Файл слишком большой (макс 150 МБ)', 'message_en': 'File too large (max 150 MB)'}}, status=status.HTTP_400_BAD_REQUEST)
    try:
        size_cm = float(request.data.get('real_size_cm') or 25)
    except (TypeError, ValueError):
        size_cm = 25.0
    if not (3 <= size_cm <= 200):
        return Response({'error': {'code': 'VALIDATION_ERROR', 'message_uz': "O'lcham 3-200 sm bo'lsin"}}, status=status.HTTP_400_BAD_REQUEST)
    tmpdir = tempfile.mkdtemp(prefix='armenu_up_')
    try:
        raw = os.path.join(tmpdir, 'raw.glb')
        with open(raw, 'wb') as out:
            for chunk in f.chunks():
                out.write(chunk)
        m3d, _ = DishModel3D.objects.get_or_create(dish=dish, defaults={'restaurant_id': rest.id})
        m3d.status = 'processing'
        m3d.progress = 20
        m3d.real_size_cm = size_cm
        m3d.save()
        glb_out = os.path.join(tmpdir, f'dish_{dish.id}.glb')
        opt = optimize.optimize_glb(raw, glb_out, size_cm)
        expected_m = size_cm / 100.0
        if not optimize.verify_scale(glb_out, expected_m):
            m3d.status = 'failed'
            m3d.error_msg = 'O\'lcham nazorati o\'tmadi'
            m3d.save()
            return Response({'error': {'code': 'VALIDATION_ERROR', 'message_uz': "Model o'lchamga moslanmadi. Boshqa fayl sinab ko'ring.", 'message_ru': 'Модель не масштабируется. Попробуйте другой файл.', 'message_en': 'Model could not be scaled. Try another file.'}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        usdz_out = os.path.join(tmpdir, f'dish_{dish.id}.usdz')
        uf = request.FILES.get('usdz')
        if uf and uf.name.lower().endswith('.usdz'):
            with open(usdz_out, 'wb') as out:
                for c in uf.chunks():
                    out.write(c)
            u = {'ok': os.path.getsize(usdz_out) <= 5 * 1024 * 1024, 'bytes': os.path.getsize(usdz_out), 'tool': 'uploaded'}
        else:
            u = usdz_svc.glb_to_usdz(glb_out, usdz_out)
        poster_out = os.path.join(tmpdir, f'dish_{dish.id}.webp')
        pf = request.FILES.get('poster')
        if pf:
            from PIL import Image
            Image.open(pf).convert('RGBA').save(poster_out, 'WEBP', quality=82)
            pr = {'ok': True, 'bytes': os.path.getsize(poster_out)}
        else:
            pr = poster_svc.render_poster(glb_out, poster_out)
        for old in (m3d.glb_url, m3d.usdz_url, m3d.poster_url):
            try:
                storage.delete(old)
            except Exception:
                pass
        m3d.glb_url = storage.upload(glb_out, 'ar/glb', dish.id)
        m3d.usdz_url = storage.upload(usdz_out, 'ar/usdz', dish.id) if u.get('ok') else ''
        m3d.poster_url = storage.upload(poster_out, 'ar/poster', dish.id) if pr.get('ok') else ''
        m3d.glb_bytes = opt['bytes']
        m3d.usdz_bytes = u.get('bytes', 0)
        m3d.poly_count = opt.get('triangles', 0)
        m3d.status = 'ready'
        m3d.source = 'upload'
        m3d.progress = 100
        m3d.library = None
        m3d.ready_at = timezone.now()
        m3d.save()
        try:
            from core.ws import ws_send, g_admin
            ws_send(g_admin(rest.id), 'model3d.ready', {'dish_id': dish.id, 'dish_name': dish.name_uz, 'source': 'upload', 'cost_usd': 0.0, 'real_size_cm': size_cm, 'glb_bytes': opt['bytes']})
        except Exception:
            pass
        return Response({'ok': True, 'dish_id': dish.id, 'glb': m3d.glb_url, 'usdz': m3d.usdz_url, 'poster': m3d.poster_url, 'glb_mb': round(opt['bytes'] / 1048576, 2), 'usdz_mb': round(u.get('bytes', 0) / 1048576, 2), 'triangles': opt.get('triangles', 0), 'real_size_cm': size_cm, 'scale_m': round(size_cm / 100, 3)}, status=status.HTTP_201_CREATED)
    finally:
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)
