"""Test fayllarini TEST ichida yasash: xlsx (openpyxl), docx (python-docx), qo'lda yozilgan PDF, zip-bomba, rasm."""
import io
import zipfile

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image


def make_xlsx(sheets):
    """sheets: {'Varaq nomi': [[katak, ...], ...]} yoki oddiy qatorlar ro'yxati."""
    import openpyxl
    if not isinstance(sheets, dict):
        sheets = {'Menyu': sheets}
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)
    for title, rows in sheets.items():
        sheet = workbook.create_sheet(title)
        for row in rows:
            sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def make_docx(items):
    """items: matn (paragraf) yoki [[katak, ...], ...] (jadval) elementlari ro'yxati."""
    import docx
    document = docx.Document()
    for item in items:
        if isinstance(item, str):
            document.add_paragraph(item)
        else:
            table = document.add_table(rows=len(item), cols=max(len(r) for r in item))
            for r, row in enumerate(item):
                for c, value in enumerate(row):
                    table.cell(r, c).text = str(value)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def make_pdf(lines):
    """Matn qatlamli minimal 1 betli PDF (Helvetica, faqat lotin harflari). `lines=[]` -> matnsiz (skanerlangan kabi) bet."""
    def esc(text):
        return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    stream = 'BT /F1 12 Tf 72 760 Td 16 TL\n' + ''.join(f'({esc(line)}) Tj T*\n' for line in lines) + 'ET' if lines else ''
    objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        f'<< /Length {len(stream)} >>\nstream\n{stream}\nendstream',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]
    out = io.BytesIO()
    out.write(b'%PDF-1.4\n')
    offsets = []
    for number, body in enumerate(objects, 1):
        offsets.append(out.tell())
        out.write(f'{number} 0 obj\n{body}\nendobj\n'.encode('latin-1'))
    xref = out.tell()
    out.write(f'xref\n0 {len(objects) + 1}\n0000000000 65535 f \n'.encode())
    for offset in offsets:
        out.write(f'{offset:010d} 00000 n \n'.encode())
    out.write(f'trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    return out.getvalue()


def make_multipage_pdf(pages):
    """`pages` ta bo'sh bet (sahifalar sonini tekshirish uchun)."""
    kids = ' '.join(f'{3 + i} 0 R' for i in range(pages))
    objects = ['<< /Type /Catalog /Pages 2 0 R >>', f'<< /Type /Pages /Kids [{kids}] /Count {pages} >>']
    objects += ['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>'] * pages
    out = io.BytesIO()
    out.write(b'%PDF-1.4\n')
    offsets = []
    for number, body in enumerate(objects, 1):
        offsets.append(out.tell())
        out.write(f'{number} 0 obj\n{body}\nendobj\n'.encode())
    xref = out.tell()
    out.write(f'xref\n0 {len(objects) + 1}\n0000000000 65535 f \n'.encode())
    for offset in offsets:
        out.write(f'{offset:010d} 00000 n \n'.encode())
    out.write(f'trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    return out.getvalue()


def make_image(fmt='PNG', size=(40, 30), color=(200, 40, 40)):
    buffer = io.BytesIO()
    Image.new('RGB', size, color).save(buffer, fmt)
    return buffer.getvalue()


def make_zip_bomb_xlsx(megabytes=60):
    """Ochilganda `megabytes` MB bo'ladigan, lekin ~60 KB siqilgan xlsx ko'rinishidagi zip."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types/>')
        archive.writestr('xl/workbook.xml', '<workbook/>')
        with archive.open('xl/media/big.bin', 'w', force_zip64=True) as handle:
            chunk = b'\x00' * (1024 * 1024)
            for _ in range(megabytes):
                handle.write(chunk)
    return buffer.getvalue()


def make_many_entries_zip(count=2100):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_STORED) as archive:
        archive.writestr('xl/workbook.xml', '<workbook/>')
        for i in range(count):
            archive.writestr(f'xl/x/{i}.txt', 'a')
    return buffer.getvalue()


def upload(name, content, content_type='application/octet-stream'):
    if isinstance(content, str):
        content = content.encode('utf-8')
    return SimpleUploadedFile(name, content, content_type=content_type)
