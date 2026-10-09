"""Eksport — Excel (openpyxl) + PDF (reportlab)"""
import io
import logging
from datetime import timedelta

from django.db.models import Sum, Count
from django.utils import timezone

log = logging.getLogger('analytics.export')


def export_orders_excel(restaurant_id: int, days: int = 30) -> bytes:
    """Buyurtmalarni Excel formatda eksport qilish"""
    from openpyxl import Workbook
    from apps.orders.models import Order

    cutoff = timezone.now() - timedelta(days=days)
    orders = Order.objects.filter(
        restaurant_id=restaurant_id,
        status__in=('paid', 'served'),
        created_at__gte=cutoff,
    ).select_related('table').order_by('-created_at')

    wb = Workbook()
    ws = wb.active
    ws.title = 'Buyurtmalar'

    # Sarlavha
    headers = ['Raqam', 'Stol', 'Holat', 'Jami', 'Xizmat', 'Sana']
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = cell.font.copy(bold=True)

    # Ma'lumotlar
    for row, o in enumerate(orders, 2):
        ws.cell(row=row, column=1, value=o.number)
        ws.cell(row=row, column=2, value=o.table.number if o.table_id else '—')
        ws.cell(row=row, column=3, value=o.get_status_display())
        ws.cell(row=row, column=4, value=float(o.total))
        ws.cell(row=row, column=5, value=float(o.service_fee))
        ws.cell(row=row, column=6, value=o.created_at.strftime('%Y-%m-%d %H:%M'))

    # Kengaytma
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_top_dishes_excel(restaurant_id: int, days: int = 30) -> bytes:
    """Top taomlarni Excel formatda eksport qilish"""
    from openpyxl import Workbook
    from apps.orders.models import OrderItem

    cutoff = timezone.now() - timedelta(days=days)

    dish_stats = (
        OrderItem.objects.filter(
            order__restaurant_id=restaurant_id,
            order__status__in=('paid', 'served'),
            order__created_at__gte=cutoff,
        )
        .values('dish_name')
        .annotate(
            total_qty=Count('id'),
            total_revenue=Sum('line_total'),
        )
        .order_by('-total_revenue')[:50]
    )

    wb = Workbook()
    ws = wb.active
    ws.title = 'Top Taomlar'

    headers = ['Taom', 'Soni', 'Daromad (UZS)']
    for col, h in enumerate(headers, 1):
        ws.cell(row=1, column=col, value=h).font = ws.cell(row=1, column=col).font.copy(bold=True)

    for row, d in enumerate(dish_stats, 2):
        ws.cell(row=row, column=1, value=d['dish_name'])
        ws.cell(row=row, column=2, value=d['total_qty'])
        ws.cell(row=row, column=3, value=float(d['total_revenue'] or 0))

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_orders_pdf(restaurant_id: int, days: int = 30) -> bytes:
    """Buyurtmalarni PDF formatda eksport qilish"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from apps.orders.models import Order

    cutoff = timezone.now() - timedelta(days=days)
    orders = list(Order.objects.filter(
        restaurant_id=restaurant_id,
        status__in=('paid', 'served'),
        created_at__gte=cutoff,
    ).select_related('table').order_by('-created_at')[:100])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Sarlavha
    elements.append(Paragraph('Buyurtmalar Hisoboti', styles['Title']))
    elements.append(Paragraph(f'Sana: {timezone.now().strftime("%Y-%m-%d")}', styles['Normal']))

    # Jadval
    data = [['Raqam', 'Stol', 'Holat', 'Jami', 'Sana']]
    for o in orders:
        data.append([
            o.number,
            o.table.number if o.table_id else '—',
            o.get_status_display(),
            f'{float(o.total):,.0f}',
            o.created_at.strftime('%m-%d %H:%M'),
        ])

    table = Table(data, colWidths=[60, 50, 80, 80, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E85D2A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
    ]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
