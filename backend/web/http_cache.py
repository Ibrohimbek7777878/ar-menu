"""
S1-4 (TZ T3): mehmon HTML sahifalari uchun shartli GET (ETag/304).

Sahifa har mehmon uchun farq qilishi mumkin (savat, stol, sessiya), shuning uchun umumiy keshga YO'L QO'YILMAYDI:
`Cache-Control: private, max-age=0, must-revalidate`. ETag javob tanasining xeshidan olinadi: 304 faqat shu so'rov uchun
hozir hisoblangan tana mijozdagi nusxa bilan aynan bir xil bo'lsa qaytadi, shuning uchun boshqa mehmonga sizish mumkin emas.
Ko'rinish to'liq bajariladi (sessiya/stol yon ta'sirlari saqlanadi); tejaladigan narsa tarmoq trafigi (50 KB -> 0).
Umumiy (CDN) kesh S3 da, sahifa mehmonga bog'liq qismlardan tozalangandan keyin.
Bayroq: settings.GUEST_PAGE_ETAG (False = eski xatti-harakat, sarlavhasiz).
"""
import hashlib
from functools import wraps

from django.conf import settings
from django.utils.cache import get_conditional_response, patch_cache_control


def conditional_guest_page(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        response = view_func(request, *args, **kwargs)
        if not getattr(settings, 'GUEST_PAGE_ETAG', True):
            return response
        if request.method not in ('GET', 'HEAD') or response.status_code != 200 or getattr(response, 'streaming', False):
            return response
        if response.has_header('ETag'):
            return response
        etag = '"%s"' % hashlib.md5(response.content, usedforsecurity=False).hexdigest()
        response['ETag'] = etag
        patch_cache_control(response, private=True, max_age=0, must_revalidate=True)
        return get_conditional_response(request, etag=etag, response=response) or response
    return wrapped
