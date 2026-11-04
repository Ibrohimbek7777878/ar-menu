"""
Sayr admin API (`/api/restaurant/admin/v1/tours/`). Ruxsat: `settings_admin` (rahbariyat). Restoran FAQAT xodimning o'zi
(`staff_shop`): begona restoran sayri - 404. Xato javobi: `{error, code, field?}` (o'zbekcha `error`).

  GET    tours/                       -> {results: [Tour]}   (arxivlanganlarsiz; ?include_archived=1 bilan ular ham)
  POST   tours/                       {title, hall_id?} -> 201 Tour
  GET    tours/<id>/                  -> Tour
  PATCH  tours/<id>/                  {title?, hall_id?, archived?: false} -> Tour
  DELETE tours/<id>/                  -> arxivlash (qattiq o'chirish yo'q) -> Tour (+ archived: true)
  POST   tours/<id>/video/            multipart `video` -> 202 Tour (status: processing); mijoz GET tours/<id>/ ni so'rab turadi
  PUT    tours/<id>/stops/            {stops: [{title, t}]} (yoki to'g'ridan-to'g'ri ro'yxat) - to'liq almashtirish, atomik -> Tour
  PUT    tours/<id>/hotspots/         {hotspots: [{table_id, label?, t_start, t_end, x, y}]} - to'liq almashtirish, atomik -> Tour
  POST   tours/<id>/publish/          -> Tour (shu zal uchun avvalgi e'lon qilingani `ready` ga qaytadi)
  POST   tours/<id>/unpublish/        -> Tour
  POST   tours/<id>/ai-suggest/       -> 202 {ai_status: 'running'}
  DELETE tours/<id>/ai-suggestions/   -> Tour (takliflar tashlanadi, ishlayotgan AI so'rovi bekor qilinadi)
"""
from rest_framework import status as http
from rest_framework.response import Response

from backend.api_input import RestoAdminAPIView
from orders.audit import log_audit
from orders.interfaces.api.permissions import RESTAURANT_API_AUTHENTICATION, capability
from tours import services
from tours.errors import TourError, not_found
from tours.models import Tour
from tours.serializers import tour_json, with_children
from web.restaurant_auth import staff_shop


def _shop(request):
    shop = staff_shop(request)
    if shop is None:
        raise TourError("Restoran topilmadi", 'not_found', 404)
    return shop


def _fresh(shop, pk):
    """Javob uchun to'liq (nuqta va belgilar bilan) sayr: yozishdan keyingi eng yangi holat."""
    tour = with_children(Tour.objects.filter(shop=shop, pk=pk)).first()
    if tour is None:
        raise not_found()
    return tour


def _audit(request, action, tour, **new_value):
    log_audit(action, request=request, actor=request.user, target_type='tour', target_id=tour.pk,
              new_value={'title': tour.title, 'status': tour.status, **new_value})


class TourAdminBase(RestoAdminAPIView):
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('settings_admin')]


class ToursAdminView(TourAdminBase):

    def get(self, request):
        shop = _shop(request)
        qs = Tour.objects.filter(shop=shop)
        if request.GET.get('include_archived') not in ('1', 'true', 'yes'):
            qs = qs.filter(is_archived=False)
        return Response({'results': [tour_json(t) for t in with_children(qs.order_by('-id'))[:200]]})

    def post(self, request):
        shop = _shop(request)
        tour = services.create_tour(shop, request.data)
        _audit(request, 'tour_created', tour)
        return Response(tour_json(_fresh(shop, tour.pk)), status=http.HTTP_201_CREATED)


class TourDetailAdminView(TourAdminBase):

    def get(self, request, pk):
        return Response(tour_json(_fresh(_shop(request), pk)))

    def patch(self, request, pk):
        shop = _shop(request)
        tour = services.update_tour(shop, pk, request.data)
        _audit(request, 'tour_updated', tour, keys=sorted(k for k in request.data if k in ('title', 'hall_id', 'archived')))
        return Response(tour_json(_fresh(shop, pk)))

    def delete(self, request, pk):
        shop = _shop(request)
        tour = services.archive_tour(shop, pk)
        _audit(request, 'tour_archived', tour)
        return Response(tour_json(_fresh(shop, pk)))


class TourVideoAdminView(TourAdminBase):

    def post(self, request, pk):
        shop = _shop(request)
        tour = services.upload_video(shop, pk, request.FILES.get('video'))
        _audit(request, 'tour_video_uploaded', tour, size=tour.source_size, duration_s=tour.duration_s)
        return Response(tour_json(_fresh(shop, pk)), status=http.HTTP_202_ACCEPTED)


class TourListBodyAdminView(TourAdminBase):
    """PUT tanasi JSON obyekt YOKI to'g'ridan-to'g'ri ro'yxat bo'lishi mumkin."""

    def initial(self, request, *args, **kwargs):
        # RestoAdminAPIView.initial() tananing obyekt ekanini talab qiladi; bu yerda ro'yxat ham qabul qilinadi (services._items tekshiradi)
        super(RestoAdminAPIView, self).initial(request, *args, **kwargs)


class TourStopsAdminView(TourListBodyAdminView):

    def put(self, request, pk):
        shop = _shop(request)
        services.replace_stops(shop, pk, request.data)
        tour = _fresh(shop, pk)
        _audit(request, 'tour_stops_replaced', tour, count=len(tour.stops.all()))
        return Response(tour_json(tour))


class TourHotspotsAdminView(TourListBodyAdminView):

    def put(self, request, pk):
        shop = _shop(request)
        services.replace_hotspots(shop, pk, request.data)
        tour = _fresh(shop, pk)
        _audit(request, 'tour_hotspots_replaced', tour, count=len(tour.hotspots.all()))
        return Response(tour_json(tour))


class TourPublishAdminView(TourAdminBase):

    def post(self, request, pk):
        shop = _shop(request)
        tour = services.publish(shop, pk)
        _audit(request, 'tour_published', tour)
        return Response(tour_json(_fresh(shop, pk)))


class TourUnpublishAdminView(TourAdminBase):

    def post(self, request, pk):
        shop = _shop(request)
        tour = services.unpublish(shop, pk)
        _audit(request, 'tour_unpublished', tour)
        return Response(tour_json(_fresh(shop, pk)))


class TourAiSuggestAdminView(TourAdminBase):

    def post(self, request, pk):
        shop = _shop(request)
        tour = services.request_ai(shop, pk)
        _audit(request, 'tour_ai_requested', tour)
        return Response({'ai_status': tour.ai_status}, status=http.HTTP_202_ACCEPTED)


class TourAiSuggestionsAdminView(TourAdminBase):

    def delete(self, request, pk):
        shop = _shop(request)
        tour = services.clear_ai_suggestions(shop, pk)
        _audit(request, 'tour_ai_suggestions_cleared', tour)
        return Response(tour_json(_fresh(shop, pk)))
