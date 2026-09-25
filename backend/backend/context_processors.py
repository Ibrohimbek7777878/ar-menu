"""
Translation context processor — barcha tarjimalarni template ga beradi.
Foydalanish: {{ translations.map_title }}
"""
from web.templatetags.i18n_tags import TRANSLATIONS


def translations_context(request):
    """Har bir request uchun tarjimalarni context ga qo'shish."""
    lang = getattr(request, 'language', 'uz')
    translations = TRANSLATIONS.get(lang, TRANSLATIONS['uz'])
    return {
        't': translations,
        'language': lang,
    }
