from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from apps.ar3d.models import DishLibrary
from apps.ar3d.services.library import library_stats, normalize


@api_view(['GET'])
@permission_classes([IsAdminUser])
def platform_library(request):
    q = request.query_params.get('q', '').strip()
    cat = request.query_params.get('cat', '')
    qs = DishLibrary.objects.all()
    if cat:
        qs = qs.filter(category_key=cat)
    if q:
        n = normalize(q)
        from django.db.models import Q
        qs = qs.filter(Q(name_uz__icontains=q) | Q(name_ru__icontains=q) | Q(name_en__icontains=q) | Q(key__icontains=n) | Q(aliases__contains=[q.lower()]))
    qs = qs.order_by('-used_by_count')[:200]
    return Response({
        'stats': library_stats(),
        'items': [{
            'id': l.id, 'key': l.key, 'name_uz': l.name_uz, 'name_ru': l.name_ru, 'name_en': l.name_en,
            'aliases': l.aliases, 'category_key': l.category_key,
            'poster': l.poster_url, 'glb': l.glb_url, 'usdz': l.usdz_url,
            'real_size_cm': float(l.real_size_cm),
            'glb_mb': round(l.glb_bytes / 1048576, 2),
            'usdz_mb': round(l.usdz_bytes / 1048576, 2),
            'poly_count': l.poly_count, 'quality': l.quality,
            'source': l.source, 'used_by_count': l.used_by_count,
            'is_active': l.is_active, 'has_embedding': l.embedding is not None,
        } for l in qs],
    })


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def platform_library_item(request, pk):
    lib = DishLibrary.objects.filter(id=pk).first()
    if lib is None:
        return Response({'error': 'not_found'}, status=404)
    if request.method == 'DELETE':
        lib.is_active = False
        lib.save(update_fields=['is_active'])
        return Response({'ok': True, 'deactivated': True})
    for f in ('name_uz', 'name_ru', 'name_en', 'category_key', 'cuisine', 'quality', 'is_active', 'real_size_cm'):
        if f in request.data:
            setattr(lib, f, request.data[f])
    if 'aliases' in request.data:
        lib.aliases = [str(a).lower().strip() for a in request.data['aliases'] if str(a).strip()][:30]
    lib.save()
    if 'real_size_cm' in request.data:
        from apps.ar3d.models import DishModel3D
        DishModel3D.objects.filter(library=lib).update(real_size_cm=lib.real_size_cm)
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def platform_library_reindex(request):
    from apps.ar3d.services.library import get_embedding, build_embedding_text
    n = 0
    for lib in DishLibrary.objects.filter(embedding__isnull=True, is_active=True)[:200]:
        emb = get_embedding(build_embedding_text(lib.name_uz, '', ' '.join(lib.aliases or []), lib.category_key))
        if emb:
            lib.embedding = emb
            lib.save(update_fields=['embedding'])
            n += 1
    return Response({'ok': True, 'reindexed': n})
