def serialize_order(order) -> dict:
    """To'liq — KDS va ofitsiant uchun"""
    return {
        'id': order.id,
        'number': order.number,
        'status': order.status,
        'source': order.source,
        'table_id': order.table_id,
        'table_no': order.table.number if order.table_id else '—',
        'waiter_id': order.waiter_id,
        'subtotal': str(order.subtotal),
        'service_fee': str(order.service_fee),
        'total': str(order.total),
        'note': order.note,
        'eta_min': order.eta_min,
        'age_sec': order.age_sec,
        'eta_pct': order.eta_pct,
        'created_at': order.created_at.isoformat(),
        'items': [{
            'id': it.id,
            'dish_id': it.dish_id,
            'name': it.dish_name,
            'qty': it.qty,
            'price': str(it.price),
            'line_total': str(it.line_total),
            'modifiers': it.modifiers,
            'note': it.note,
            'ar_viewed': it.ar_viewed,
        } for it in order.items.all()],
    }


def serialize_order_short(order) -> dict:
    """Qisqa — admin oqimi, ro'yxatlar"""
    return {
        'id': order.id,
        'number': order.number,
        'status': order.status,
        'table_no': order.table.number if order.table_id else '—',
        'total': str(order.total),
        'eta_min': order.eta_min,
        'age_sec': order.age_sec,
        'created_at': order.created_at.isoformat(),
    }
