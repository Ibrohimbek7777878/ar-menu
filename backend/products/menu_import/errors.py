"""Menyuni ommaviy kiritish: xatolar (view ularni TZ dagi kodlar bilan JSON javobga aylantiradi).

TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md
"""

SUPPORTED_HINT = (
    "Qo'llab-quvvatlanadi: matn, .txt, .csv, .xlsx, .docx, .pdf va rasm (jpg, png, webp). "
    "Excel/Word'da «Boshqacha saqlash → .xlsx / .docx» qiling; Samsung Notes'da «Ulashish → PDF/Matn»; "
    "iPhone Eslatmalarda «Nusxa olish» yoki PDF."
)


class MenuImportError(Exception):
    """Asosiy sinf: `status` HTTP kodi, `code` mashina o'qiydigan kod, `message` foydalanuvchi uchun o'zbekcha matn."""
    status = 400
    code = 'bad_request'

    def __init__(self, message, *, code=None, status=None, extra=None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status:
            self.status = status
        self.extra = extra or {}


class InvalidInput(MenuImportError):
    status = 400
    code = 'invalid_input'


class InvalidFile(MenuImportError):
    """Fayl buzuq, parolli yoki kengaytmasi tarkibiga mos emas."""
    status = 400
    code = 'invalid_file'


class EmptyFile(MenuImportError):
    status = 400
    code = 'empty_file'


class FileTooLarge(MenuImportError):
    status = 413
    code = 'file_too_large'


class UnsupportedType(MenuImportError):
    status = 415
    code = 'unsupported_type'


class RateLimited(MenuImportError):
    status = 429
    code = 'rate_limited'


class NothingRecognized(MenuImportError):
    status = 422
    code = 'nothing_recognized'


class AIUnavailable(MenuImportError):
    status = 503
    code = 'ai_unavailable'


class CommitRejected(MenuImportError):
    """Tasdiqlashda bitta ham qator xato bo'lsa hech narsa yozilmaydi. `extra['rows']` = [{row_id, field, message}]."""
    status = 400
    code = 'validation_failed'


class BatchNotFound(MenuImportError):
    status = 404
    code = 'batch_not_found'


class Conflict(MenuImportError):
    status = 409
    code = 'conflict'
