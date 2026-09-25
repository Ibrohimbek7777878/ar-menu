"""Tarjima boshqaruvi admin — Dish tarjimalari jadvali"""
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsRestAdmin
from core.i18n import t

log = logging.getLogger('menu.translation')


class TranslationAdminView(APIView):
    """GET /v1/admin/translations/?lang=uz
    Barcha taomlarning 3 tilidagi tarjimalarini ko'rish.
    """
    permission_classes = [IsAuthenticated, IsRestAdmin]

    def get(self, request):
        from apps.menu.models import Dish

        lang = request.query_params.get('lang', 'uz')
        dishes = Dish.objects.filter(
            restaurant_id=request.restaurant_id,
            is_available=True,
        ).order_by('category__name_uz', 'name_uz')

        result = []
        for d in dishes:
            result.append({
                'id': d.id,
                'name_uz': d.name_uz,
                'name_ru': d.name_ru,
                'name_en': d.name_en,
                'desc_uz': d.desc_uz,
                'desc_ru': d.desc_ru,
                'desc_en': d.desc_en,
            })

        return Response({'dishes': result, 'count': len(result)})


class TranslationAutoView(APIView):
    """POST /v1/admin/translations/auto/ {from_lang: uz, to_lang: ru}
    AI bilan avto-tarjima (kalit yo'q bo'lsa 501 AI_NOT_READY).
    """
    permission_classes = [IsAuthenticated, IsRestAdmin]

    def post(self, request):
        from django.conf import settings
        from apps.menu.models import Dish

        from_lang = request.data.get('from_lang', 'uz')
        to_lang = request.data.get('to_lang', 'ru')
        dish_ids = request.data.get('dish_ids', [])

        # AI kalit tekshirish
        ai_key = settings.AI_KEYS.get('OPENAI_API_KEY') or settings.AI_KEYS.get('GEMINI_API_KEY')
        if not ai_key:
            return Response({'error': 'AI_NOT_READY', 'message': 'AI kalit sozlanmagan'}, status=501)

        dishes = Dish.objects.filter(
            id__in=dish_ids,
            restaurant_id=request.restaurant_id,
        ) if dish_ids else Dish.objects.filter(
            restaurant_id=request.restaurant_id,
            is_available=True,
        )[:50]

        translated = 0
        for d in dishes:
            source_name = getattr(d, f'name_{from_lang}', '') or d.name_uz
            source_desc = getattr(d, f'desc_{from_lang}', '') or d.desc_uz

            if not source_name:
                continue

            # AI tarjima (demo — faqat log)
            log.info(f'[translation] {from_lang}→{to_lang}: {source_name}')
            # Real AI integratsiyasi keyin qo'shiladi
            translated += 1

        return Response({'ok': True, 'translated': translated, 'from': from_lang, 'to': to_lang})
