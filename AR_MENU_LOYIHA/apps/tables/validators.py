from rest_framework.exceptions import ValidationError

MAX_OBJECTS = 400
MAX_SIZE_M = 200.0
SHAPES = {'round', 'square', 'rect', 'oval'}
KINDS = {'table', 'wall', 'bar', 'door'}


def _num(v, field, lo, hi):
    if not isinstance(v, (int, float)) or isinstance(v, bool):
        raise ValidationError({field: 'raqam bo\'lishi kerak'})
    v = float(v)
    if not (lo <= v <= hi):
        raise ValidationError({field: f'{lo} … {hi} oralig\'ida bo\'lsin'})
    return round(v, 3)


def validate_plan(plan: dict, allowed_table_ids: set) -> dict:
    """
    Tozalangan plan_json qaytaradi. ⚡ Faqat shu restoranning stollari ruxsat.
    Noma'lum maydonlar TASHLAB YUBORILADI (kelajakda z/height qo'shiladi).
    """
    if not isinstance(plan, dict):
        raise ValidationError({'plan_json': 'obyekt bo\'lishi kerak'})

    size = plan.get('size') or {}
    w = _num(size.get('w', 20), 'size.w', 1, MAX_SIZE_M)
    h = _num(size.get('h', 12), 'size.h', 1, MAX_SIZE_M)
    grid = _num(plan.get('grid', 0.25), 'grid', 0.05, 2.0)

    raw = plan.get('objects') or []
    if not isinstance(raw, list):
        raise ValidationError({'objects': 'ro\'yxat bo\'lishi kerak'})
    if len(raw) > MAX_OBJECTS:
        raise ValidationError({'objects': f'maksimum {MAX_OBJECTS} ta obyekt'})

    seen_ids, seen_tables, out = set(), set(), []
    for i, o in enumerate(raw):
        if not isinstance(o, dict):
            raise ValidationError({f'objects[{i}]': 'obyekt bo\'lishi kerak'})
        kind = o.get('kind')
        if kind not in KINDS:
            raise ValidationError({f'objects[{i}].kind': f'noma\'lum tur: {kind}'})

        oid = str(o.get('id') or f'{kind}{i}')[:40]
        if oid in seen_ids:
            raise ValidationError({f'objects[{i}].id': 'takrorlangan id'})
        seen_ids.add(oid)

        item = {'id': oid, 'kind': kind}

        if kind == 'wall':
            item['x1'] = _num(o.get('x1', 0), f'objects[{i}].x1', -MAX_SIZE_M, MAX_SIZE_M)
            item['y1'] = _num(o.get('y1', 0), f'objects[{i}].y1', -MAX_SIZE_M, MAX_SIZE_M)
            item['x2'] = _num(o.get('x2', 0), f'objects[{i}].x2', -MAX_SIZE_M, MAX_SIZE_M)
            item['y2'] = _num(o.get('y2', 0), f'objects[{i}].y2', -MAX_SIZE_M, MAX_SIZE_M)
            item['thickness'] = _num(o.get('thickness', 0.15),
                                     f'objects[{i}].thickness', 0.02, 1.0)
        else:
            item['x'] = _num(o.get('x', 0), f'objects[{i}].x', -MAX_SIZE_M, MAX_SIZE_M)
            item['y'] = _num(o.get('y', 0), f'objects[{i}].y', -MAX_SIZE_M, MAX_SIZE_M)
            item['w'] = _num(o.get('w', 1.0), f'objects[{i}].w', 0.1, 30.0)
            item['h'] = _num(o.get('h', 1.0), f'objects[{i}].h', 0.1, 30.0)
            item['rot'] = int(_num(o.get('rot', 0), f'objects[{i}].rot', -360, 360)) % 360

        if kind == 'table':
            tid = o.get('table_id')
            if not isinstance(tid, int):
                raise ValidationError({f'objects[{i}].table_id': 'butun son kerak'})
            if tid not in allowed_table_ids:
                # ⚡ Cross-tenant himoya
                raise ValidationError({f'objects[{i}].table_id':
                                       'stol bu restoranga tegishli emas'})
            if tid in seen_tables:
                raise ValidationError({f'objects[{i}].table_id':
                                       'stol planda ikki marta'})
            seen_tables.add(tid)
            shape = o.get('shape', 'square')
            if shape not in SHAPES:
                raise ValidationError({f'objects[{i}].shape': f'noma\'lum shakl: {shape}'})
            item['table_id'] = tid
            item['shape'] = shape
            item['seats'] = int(_num(o.get('seats', 4), f'objects[{i}].seats', 1, 40))

        # v3 tayyorgarligi — berilgan bo'lsa saqlanadi
        if 'z' in o:
            item['z'] = _num(o['z'], f'objects[{i}].z', -10, 50)
        if 'height' in o:
            item['height'] = _num(o['height'], f'objects[{i}].height', 0.05, 20)

        out.append(item)

    from apps.tables.models import PLAN_SCHEMA_VERSION
    return {'schema': PLAN_SCHEMA_VERSION, 'size': {'w': w, 'h': h},
            'grid': grid, 'objects': out}
