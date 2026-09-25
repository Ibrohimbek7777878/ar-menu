# FAZA 7 — ZAL PLANI (2D)

**Vazifalar:** V-143 … V-150 · **Muddat:** 1 hafta
**Maqsad:** Admin zal planini canvas'da chizadi (stol, devor, bar, eshik),
ofitsiant esa shu planni jonli holat ranglari bilan ko'radi (O-05).

> ⚡ **KELAJAK:** `plan_json` ichidagi har bir obyektga keyinchalik `z` va `height`
> maydonlari qo'shilsa — aynan shu ma'lumot **3D zalga (v3)** aylanadi.
> Shuning uchun bugundan koordinata tizimi metrda, obyekt sxemasi kengaytiriladigan.

> ⚠️ Boshlashdan oldin FAZA 3 (Stol + QR, V-055…V-066) va FAZA 5 (Buyurtma +
> realtime, V-093…V-114) tugagan bo'lishi SHART — `Table`, `Order`, `Call`
> modellari va `rest_<id>_waiters` WS guruhi mavjud bo'lishi kerak.

---

## V-143 — `FloorPlan` modeli va `plan_json` sxemasi

**Fayl:** `apps/tables/models_floorplan.py`
```python
from django.db import models
from core.models import TenantModel


PLAN_SCHEMA_VERSION = 1

# ⚡ plan_json sxemasi (v1 — 2D, v3 da z/height qo'shiladi):
# {
#   "schema": 1,
#   "size": {"w": 20.0, "h": 12.0},        # zal o'lchami, METR
#   "grid": 0.25,                            # snap qadami, metr
#   "objects": [
#     {"id":"t1","kind":"table","table_id":15,"x":2.0,"y":3.0,
#      "shape":"round","w":1.2,"h":1.2,"rot":0,"seats":4},
#     {"id":"w1","kind":"wall","x1":0,"y1":0,"x2":20,"y2":0,"thickness":0.2},
#     {"id":"b1","kind":"bar","x":14,"y":1,"w":5,"h":0.8,"rot":0},
#     {"id":"d1","kind":"door","x":10,"y":0,"w":1.2,"rot":0},
#   ]
# }
# v3 uchun zaxira: har obyektga "z": 0.0, "height": 0.75 qo'shiladi.


class FloorPlan(TenantModel):
    """Bitta zal / qavat plani."""
    name_uz = models.CharField(max_length=120)
    name_ru = models.CharField(max_length=120, blank=True)
    name_en = models.CharField(max_length=120, blank=True)
    floor    = models.SmallIntegerField(default=1, db_index=True)
    plan_json = models.JSONField(default=dict, blank=True)
    version   = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    sort      = models.SmallIntegerField(default=0)

    class Meta:
        ordering = ['floor', 'sort', 'id']
        indexes = [models.Index(fields=['restaurant', 'is_active', 'floor'])]

    def __str__(self):
        return f'{self.name_uz} ({self.floor}-qavat)'

    def name(self, lang='uz'):
        return (getattr(self, f'name_{lang}', '') or self.name_uz
                or self.name_ru or self.name_en or '')

    @property
    def objects_list(self):
        return (self.plan_json or {}).get('objects', [])

    def table_ids(self):
        return [o['table_id'] for o in self.objects_list
                if o.get('kind') == 'table' and o.get('table_id')]
```

`apps/tables/models.py` oxiriga:
```python
from apps.tables.models_floorplan import FloorPlan, PLAN_SCHEMA_VERSION  # noqa
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations tables && python manage.py migrate
python manage.py shell -c "from apps.tables.models import FloorPlan; print(FloorPlan._meta.db_table)"
```

---

## V-144 — ⚡ `plan_json` validatsiyasi (KRITIK)

Foydalanuvchi JSON'ni to'g'ridan-to'g'ri POST qiladi — **ishonchsiz kirish**.
Har bir obyekt tekshirilishi SHART.

**Fayl:** `apps/tables/validators.py`
```python
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
```

✅ **Test:** `tests/test_floorplan_validate.py`
```python
import pytest
from rest_framework.exceptions import ValidationError
from apps.tables.validators import validate_plan


def test_foreign_table_rejected():
    plan = {'size': {'w': 10, 'h': 10}, 'objects': [
        {'id': 't1', 'kind': 'table', 'table_id': 999, 'x': 1, 'y': 1,
         'w': 1, 'h': 1, 'shape': 'round'}]}
    with pytest.raises(ValidationError):
        validate_plan(plan, allowed_table_ids={1, 2})


def test_duplicate_table_rejected():
    o = {'kind': 'table', 'table_id': 1, 'x': 1, 'y': 1, 'w': 1, 'h': 1,
         'shape': 'round'}
    plan = {'size': {'w': 10, 'h': 10},
            'objects': [dict(o, id='a'), dict(o, id='b')]}
    with pytest.raises(ValidationError):
        validate_plan(plan, allowed_table_ids={1})


def test_clean_plan_keeps_z_for_v3():
    plan = {'size': {'w': 10, 'h': 10}, 'objects': [
        {'id': 'b1', 'kind': 'bar', 'x': 1, 'y': 1, 'w': 3, 'h': 0.8,
         'z': 0, 'height': 1.1, 'junk': 'x'}]}
    out = validate_plan(plan, allowed_table_ids=set())
    assert out['objects'][0]['height'] == 1.1
    assert 'junk' not in out['objects'][0]
```

---

## V-145 — API: plan CRUD + saqlash/yuklash

**Fayl:** `apps/tables/serializers_floorplan.py`
```python
from rest_framework import serializers
from apps.tables.models import FloorPlan
from apps.tables.validators import validate_plan


class FloorPlanListSerializer(serializers.ModelSerializer):
    tables_count = serializers.SerializerMethodField()

    class Meta:
        model = FloorPlan
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'floor',
                  'sort', 'is_active', 'version', 'tables_count', 'updated_at']

    def get_tables_count(self, obj):
        return len(obj.table_ids())


class FloorPlanDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = FloorPlan
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'floor', 'sort',
                  'is_active', 'version', 'plan_json', 'updated_at']
        read_only_fields = ['version']

    def validate_plan_json(self, value):
        from apps.tables.models import Table
        rid = self.context['request'].restaurant_id
        allowed = set(Table.objects.filter(
            restaurant_id=rid, is_active=True).values_list('id', flat=True))
        return validate_plan(value, allowed)

    def update(self, instance, validated_data):
        if 'plan_json' in validated_data:
            instance.version = (instance.version or 0) + 1
        return super().update(instance, validated_data)
```

**Fayl:** `apps/tables/views_floorplan.py`
```python
import logging
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.mixins import TenantScopedMixin
from apps.accounts.permissions import IsRestaurantAdmin, IsStaff
from apps.tables.models import FloorPlan
from apps.tables.serializers_floorplan import (
    FloorPlanListSerializer, FloorPlanDetailSerializer)
from apps.tables.services_floorplan import build_live_plan, broadcast_plan_saved

log = logging.getLogger('tables.floorplan')


class FloorPlanViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/floorplans/            — ro'yxat
    GET    /api/v1/floorplans/<id>/       — plan_json bilan
    POST   /api/v1/floorplans/            — yangi zal
    PATCH  /api/v1/floorplans/<id>/       — plan saqlash (version++)
    GET    /api/v1/floorplans/<id>/live/  — ofitsiant uchun holat bilan
    """
    queryset = FloorPlan.objects.all()
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get_serializer_class(self):
        return (FloorPlanListSerializer if self.action == 'list'
                else FloorPlanDetailSerializer)

    def get_permissions(self):
        if self.action == 'live':
            return [IsAuthenticated(), IsStaff()]
        return super().get_permissions()

    @transaction.atomic
    def perform_update(self, serializer):
        obj = serializer.save()
        log.info(f'[plan] saqlandi id={obj.id} v={obj.version} '
                 f'obj={len(obj.objects_list)}')
        transaction.on_commit(lambda: broadcast_plan_saved(obj))

    @action(detail=True, methods=['get'])
    def live(self, request, pk=None):
        """⚡ Plan + har stolning JORIY holati (O-05 uchun)."""
        plan = self.get_object()
        return Response(build_live_plan(plan), status=status.HTTP_200_OK)
```

**Fayl:** `apps/tables/urls.py` (mavjudiga qo'shiladi)
```python
from rest_framework.routers import DefaultRouter
from apps.tables.views_floorplan import FloorPlanViewSet

router = DefaultRouter()
router.register('floorplans', FloorPlanViewSet, basename='floorplan')
urlpatterns = router.urls
```

✅ **Tekshirish:**
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:8060/api/v1/floorplans/ | python3 -m json.tool
# {"count": 0, "results": []}
```

---

## V-146 — ⚡ Stol holati servisi (O-05 rang mantiqи)

**Fayl:** `apps/tables/services_floorplan.py`
```python
import logging
from django.utils import timezone
from django.db.models import Q

from core.ws import ws_send, g_waiters, g_admin

log = logging.getLogger('tables.floorplan')

# ⚡ O-05 rang prioriteti (yuqoridan pastga — birinchi mos kelgan g'olib)
#   red    🔴 tayyor buyurtma bor (pulsatsiya)
#   purple 🟣 hisob so'ralgan / javobsiz chaqiruv
#   yellow 🟡 aktiv buyurtma kutmoqda
#   blue   🔵 band (mijoz o'tirgan, buyurtmasi yo'q)
#   green  🟢 bo'sh
COLOR_ORDER = ['red', 'purple', 'yellow', 'blue', 'green']

ACTIVE_ORDER_STATUSES = ('new', 'accepted', 'cooking')
READY_STATUSES = ('ready',)


def table_color(state: dict) -> str:
    if state.get('has_ready_order'):
        return 'red'
    if state.get('has_pending_call'):
        return 'purple'
    if state.get('has_active_order'):
        return 'yellow'
    if state.get('is_occupied'):
        return 'blue'
    return 'green'


def collect_table_states(restaurant_id: int, table_ids: list) -> dict:
    """
    Bitta zal uchun BARCHA stol holatini 3 ta so'rovda yig'adi (N+1 yo'q).
    Qaytadi: {table_id: {...state..., 'color': 'red'}}
    """
    from apps.orders.models import Order
    from apps.calls.models import Call

    if not table_ids:
        return {}

    states = {tid: {'table_id': tid, 'is_occupied': False,
                    'has_active_order': False, 'has_ready_order': False,
                    'has_pending_call': False, 'order_id': None,
                    'order_number': '', 'total': 0, 'guests': 0,
                    'waiting_min': 0} for tid in table_ids}

    orders = (Order.objects
              .filter(restaurant_id=restaurant_id, table_id__in=table_ids,
                      status__in=ACTIVE_ORDER_STATUSES + READY_STATUSES)
              .only('id', 'table_id', 'status', 'number', 'total',
                    'guests', 'created_at')
              .order_by('created_at'))

    now = timezone.now()
    for o in orders:
        s = states.get(o.table_id)
        if s is None:
            continue
        s['is_occupied'] = True
        if o.status in READY_STATUSES:
            s['has_ready_order'] = True
        else:
            s['has_active_order'] = True
        if s['order_id'] is None:
            s['order_id'] = o.id
            s['order_number'] = o.number
            s['guests'] = o.guests or 0
            s['waiting_min'] = int((now - o.created_at).total_seconds() // 60)
        s['total'] = int(s['total']) + int(o.total or 0)

    calls = (Call.objects
             .filter(restaurant_id=restaurant_id, table_id__in=table_ids,
                     status='pending')
             .only('table_id', 'kind'))
    for c in calls:
        s = states.get(c.table_id)
        if s is not None:
            s['has_pending_call'] = True
            s['is_occupied'] = True
            s['call_kind'] = c.kind

    for s in states.values():
        s['color'] = table_color(s)
    return states


def build_live_plan(plan) -> dict:
    """Plan + stol holatlari — O-05 va admin jonli zal uchun."""
    from apps.tables.models import Table

    tids = plan.table_ids()
    states = collect_table_states(plan.restaurant_id, tids)
    nums = dict(Table.objects.filter(id__in=tids).values_list('id', 'number'))
    for tid, st in states.items():
        st['number'] = nums.get(tid, '')

    return {
        'id': plan.id,
        'name_uz': plan.name_uz, 'name_ru': plan.name_ru, 'name_en': plan.name_en,
        'floor': plan.floor,
        'version': plan.version,
        'plan_json': plan.plan_json or {},
        'tables': states,
        'ts': timezone.now().isoformat(),
    }


def broadcast_plan_saved(plan):
    """Plan tahrirlangach — ochiq ekranlar qayta yuklaydi."""
    payload = {'plan_id': plan.id, 'version': plan.version, 'floor': plan.floor}
    ws_send(g_waiters(plan.restaurant_id), 'plan.updated', payload)
    ws_send(g_admin(plan.restaurant_id), 'plan.updated', payload)


def broadcast_table_state(restaurant_id: int, table_id: int):
    """
    ⚡ Buyurtma/chaqiruv holati o'zgarganda — FAQAT shu stol yangilanadi.
    Butun plan qayta yuklanmaydi (trafik tejaladi).
    """
    st = collect_table_states(restaurant_id, [table_id]).get(table_id)
    if not st:
        return
    ws_send(g_waiters(restaurant_id), 'table.state', st)
    ws_send(g_admin(restaurant_id), 'table.state', st)
```

**Signal ulash — `apps/tables/apps.py`:**
```python
from django.apps import AppConfig


class TablesConfig(AppConfig):
    name = 'apps.tables'

    def ready(self):
        from apps.tables import signals_floorplan  # noqa
```

**Fayl:** `apps/tables/signals_floorplan.py`
```python
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.models import Order
from apps.calls.models import Call
from apps.tables.services_floorplan import broadcast_table_state


@receiver(post_save, sender=Order)
def _order_changed(sender, instance, **kwargs):
    if not instance.table_id:
        return
    rid, tid = instance.restaurant_id, instance.table_id
    transaction.on_commit(lambda: broadcast_table_state(rid, tid))


@receiver(post_save, sender=Call)
def _call_changed(sender, instance, **kwargs):
    if not instance.table_id:
        return
    rid, tid = instance.restaurant_id, instance.table_id
    transaction.on_commit(lambda: broadcast_table_state(rid, tid))
```

✅ **Test:** `tests/test_table_color.py`
```python
from apps.tables.services_floorplan import table_color


def test_ready_beats_everything():
    assert table_color({'has_ready_order': True, 'has_pending_call': True,
                        'has_active_order': True, 'is_occupied': True}) == 'red'


def test_call_beats_active_order():
    assert table_color({'has_pending_call': True,
                        'has_active_order': True}) == 'purple'


def test_empty_table_green():
    assert table_color({}) == 'green'


def test_occupied_without_order_blue():
    assert table_color({'is_occupied': True}) == 'blue'
```

---

## V-147 — ⚡ Zal redaktori (canvas, drag & drop)

**Fayl:** `static/admin/js/floorplan_editor.js`
```javascript
/* ARMENU — Zal redaktori (2D canvas)
 * ⚡ Koordinatalar METRDA saqlanadi (ekran px emas) — v3 3D uchun tayyor. */
(function (w) {
  'use strict';

  const KIND_LABEL = {
    table: 'plan.table', wall: 'plan.wall', bar: 'plan.bar', door: 'plan.door'
  };

  class FloorPlanEditor {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.t = opts.t || ((k) => k);
      this.onChange = opts.onChange || function () {};
      this.plan = { schema: 1, size: { w: 20, h: 12 }, grid: 0.25, objects: [] };
      this.tables = opts.tables || [];      // [{id, number, seats}]
      this.scale = 40;                       // px / metr
      this.pan = { x: 40, y: 40 };
      this.sel = null;
      this.drag = null;
      this.mode = 'select';                  // select|wall
      this.wallStart = null;
      this.history = [];
      this.future = [];
      this._bind();
      this.resize();
    }

    /* ---------- ma'lumot ---------- */
    load(plan) {
      this.plan = JSON.parse(JSON.stringify(plan || this.plan));
      if (!this.plan.objects) this.plan.objects = [];
      if (!this.plan.size) this.plan.size = { w: 20, h: 12 };
      if (!this.plan.grid) this.plan.grid = 0.25;
      this.sel = null;
      this.history = []; this.future = [];
      this.draw();
    }
    export() { return JSON.parse(JSON.stringify(this.plan)); }

    snapshot() {
      this.history.push(JSON.stringify(this.plan));
      if (this.history.length > 50) this.history.shift();
      this.future = [];
      this.onChange();
    }
    undo() {
      if (!this.history.length) return;
      this.future.push(JSON.stringify(this.plan));
      this.plan = JSON.parse(this.history.pop());
      this.sel = null; this.draw(); this.onChange();
    }
    redo() {
      if (!this.future.length) return;
      this.history.push(JSON.stringify(this.plan));
      this.plan = JSON.parse(this.future.pop());
      this.sel = null; this.draw(); this.onChange();
    }

    /* ---------- qo'shish ---------- */
    _uid(prefix) {
      let i = 1, id;
      do { id = prefix + i++; } while (this.plan.objects.some(o => o.id === id));
      return id;
    }
    addTable(tableId, shape) {
      if (this.plan.objects.some(o => o.kind === 'table' && o.table_id === tableId)) {
        alert(this.t('plan.table_already')); return;
      }
      const meta = this.tables.find(x => x.id === tableId) || {};
      this.snapshot();
      this.plan.objects.push({
        id: this._uid('t'), kind: 'table', table_id: tableId,
        x: this._freeX(), y: 2, w: 1.2, h: 1.2,
        shape: shape || 'round', rot: 0, seats: meta.seats || 4
      });
      this.draw();
    }
    addBar()  { this.snapshot(); this.plan.objects.push({ id: this._uid('b'), kind: 'bar',  x: 2, y: 1, w: 4, h: 0.8, rot: 0 }); this.draw(); }
    addDoor() { this.snapshot(); this.plan.objects.push({ id: this._uid('d'), kind: 'door', x: 1, y: 0, w: 1.2, h: 0.2, rot: 0 }); this.draw(); }
    setMode(m) { this.mode = m; this.wallStart = null; this.cv.style.cursor = m === 'wall' ? 'crosshair' : 'default'; this.draw(); }

    _freeX() {
      const used = this.plan.objects.filter(o => o.kind === 'table').length;
      return 1.5 + (used % 8) * 2;
    }

    removeSelected() {
      if (!this.sel) return;
      this.snapshot();
      this.plan.objects = this.plan.objects.filter(o => o.id !== this.sel);
      this.sel = null; this.draw();
    }
    updateSelected(patch) {
      const o = this.plan.objects.find(x => x.id === this.sel);
      if (!o) return;
      this.snapshot();
      Object.assign(o, patch);
      this.draw();
    }
    selected() { return this.plan.objects.find(x => x.id === this.sel) || null; }

    /* ---------- koordinata ---------- */
    _m2p(m) { return m * this.scale; }
    _p2m(p) { return p / this.scale; }
    _evt(e) {
      const r = this.cv.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return { x: this._p2m(cx - this.pan.x), y: this._p2m(cy - this.pan.y) };
    }
    _snap(v) {
      const g = this.plan.grid || 0.25;
      return Math.round(v / g) * g;
    }
    _hit(mx, my) {
      for (let i = this.plan.objects.length - 1; i >= 0; i--) {
        const o = this.plan.objects[i];
        if (o.kind === 'wall') {
          if (this._nearSeg(mx, my, o)) return o;
          continue;
        }
        if (mx >= o.x - o.w / 2 && mx <= o.x + o.w / 2 &&
            my >= o.y - o.h / 2 && my <= o.y + o.h / 2) return o;
      }
      return null;
    }
    _nearSeg(mx, my, o) {
      const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
      const len2 = dx * dx + dy * dy || 1e-6;
      let t = ((mx - o.x1) * dx + (my - o.y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = o.x1 + t * dx, py = o.y1 + t * dy;
      return Math.hypot(mx - px, my - py) < Math.max(o.thickness || 0.15, 0.25);
    }

    /* ---------- hodisalar ---------- */
    _bind() {
      const down = (e) => {
        const p = this._evt(e);
        if (this.mode === 'wall') {
          if (!this.wallStart) { this.wallStart = { x: this._snap(p.x), y: this._snap(p.y) }; }
          else {
            this.snapshot();
            this.plan.objects.push({
              id: this._uid('w'), kind: 'wall',
              x1: this.wallStart.x, y1: this.wallStart.y,
              x2: this._snap(p.x), y2: this._snap(p.y), thickness: 0.15
            });
            this.wallStart = null;
          }
          this.draw(); return;
        }
        const o = this._hit(p.x, p.y);
        this.sel = o ? o.id : null;
        if (o && o.kind !== 'wall') {
          this.drag = { id: o.id, dx: p.x - o.x, dy: p.y - o.y, moved: false };
        }
        this.draw(); this.onChange();
      };
      const move = (e) => {
        if (!this.drag) return;
        e.preventDefault();
        const p = this._evt(e);
        const o = this.plan.objects.find(x => x.id === this.drag.id);
        if (!o) return;
        if (!this.drag.moved) { this.snapshot(); this.drag.moved = true; }
        o.x = Math.max(0, Math.min(this.plan.size.w, this._snap(p.x - this.drag.dx)));
        o.y = Math.max(0, Math.min(this.plan.size.h, this._snap(p.y - this.drag.dy)));
        this.draw();
      };
      const up = () => { this.drag = null; };

      this.cv.addEventListener('mousedown', down);
      w.addEventListener('mousemove', move);
      w.addEventListener('mouseup', up);
      this.cv.addEventListener('touchstart', down, { passive: false });
      w.addEventListener('touchmove', move, { passive: false });
      w.addEventListener('touchend', up);

      this.cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.scale = Math.max(15, Math.min(120, this.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
        this.draw();
      }, { passive: false });

      w.addEventListener('keydown', (e) => {
        if (!this.cv.isConnected) return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (this.sel && document.activeElement === document.body) {
            e.preventDefault(); this.removeSelected(); this.onChange();
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault(); e.shiftKey ? this.redo() : this.undo();
        }
      });
      w.addEventListener('resize', () => this.resize());
    }

    resize() {
      const box = this.cv.parentElement.getBoundingClientRect();
      const dpr = w.devicePixelRatio || 1;
      this.cv.width = Math.floor(box.width * dpr);
      this.cv.height = Math.floor(Math.max(420, box.width * 0.6) * dpr);
      this.cv.style.width = box.width + 'px';
      this.cv.style.height = Math.max(420, box.width * 0.6) + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }

    /* ---------- chizish ---------- */
    _css(v, fb) {
      const c = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      return c || fb;
    }
    draw() {
      const c = this.ctx, S = this.scale, P = this.pan;
      const bg = this._css('--bg', '#ffffff');
      const line = this._css('--border', '#d7dce3');
      const fg = this._css('--fg', '#1a1d21');
      const acc = this._css('--accent', '#2f6df6');

      c.clearRect(0, 0, this.cv.width, this.cv.height);
      c.fillStyle = bg;
      c.fillRect(0, 0, this.cv.width, this.cv.height);
      c.save(); c.translate(P.x, P.y);

      // to'r
      const g = this.plan.grid || 0.25;
      c.strokeStyle = line; c.globalAlpha = 0.35; c.lineWidth = 1;
      for (let x = 0; x <= this.plan.size.w + 1e-6; x += g) {
        c.beginPath(); c.moveTo(this._m2p(x), 0);
        c.lineTo(this._m2p(x), this._m2p(this.plan.size.h)); c.stroke();
      }
      for (let y = 0; y <= this.plan.size.h + 1e-6; y += g) {
        c.beginPath(); c.moveTo(0, this._m2p(y));
        c.lineTo(this._m2p(this.plan.size.w), this._m2p(y)); c.stroke();
      }
      c.globalAlpha = 1;

      // zal chegarasi
      c.strokeStyle = fg; c.lineWidth = 2;
      c.strokeRect(0, 0, this._m2p(this.plan.size.w), this._m2p(this.plan.size.h));

      for (const o of this.plan.objects) this._drawObj(o, o.id === this.sel, acc, fg, line);

      if (this.wallStart) {
        c.fillStyle = acc;
        c.beginPath();
        c.arc(this._m2p(this.wallStart.x), this._m2p(this.wallStart.y), 5, 0, 7);
        c.fill();
      }
      c.restore();
    }

    _drawObj(o, isSel, acc, fg, line) {
      const c = this.ctx;
      c.save();
      if (o.kind === 'wall') {
        c.strokeStyle = isSel ? acc : fg;
        c.lineWidth = Math.max(3, this._m2p(o.thickness || 0.15));
        c.lineCap = 'square';
        c.beginPath();
        c.moveTo(this._m2p(o.x1), this._m2p(o.y1));
        c.lineTo(this._m2p(o.x2), this._m2p(o.y2));
        c.stroke();
        c.restore(); return;
      }

      c.translate(this._m2p(o.x), this._m2p(o.y));
      c.rotate((o.rot || 0) * Math.PI / 180);
      const W = this._m2p(o.w), H = this._m2p(o.h);

      if (o.kind === 'table') {
        const meta = this.tables.find(x => x.id === o.table_id) || {};
        c.fillStyle = this._css('--surface-2', '#eef1f6');
        c.strokeStyle = isSel ? acc : fg;
        c.lineWidth = isSel ? 3 : 1.5;
        this._shapePath(o.shape, W, H);
        c.fill(); c.stroke();
        c.fillStyle = fg;
        c.font = `bold ${Math.max(11, W / 4)}px system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(meta.number || o.table_id), 0, 0);
      } else if (o.kind === 'bar') {
        c.fillStyle = this._css('--surface-3', '#dfe4ec');
        c.strokeStyle = isSel ? acc : fg; c.lineWidth = isSel ? 3 : 1.5;
        c.fillRect(-W / 2, -H / 2, W, H);
        c.strokeRect(-W / 2, -H / 2, W, H);
        c.fillStyle = fg; c.font = '11px system-ui'; c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(this.t('plan.bar'), 0, 0);
      } else if (o.kind === 'door') {
        c.strokeStyle = isSel ? acc : '#8a9099';
        c.lineWidth = 3; c.setLineDash([6, 4]);
        c.beginPath(); c.moveTo(-W / 2, 0); c.lineTo(W / 2, 0); c.stroke();
        c.setLineDash([]);
      }
      c.restore();
    }

    _shapePath(shape, W, H) {
      const c = this.ctx;
      c.beginPath();
      if (shape === 'round') c.arc(0, 0, Math.min(W, H) / 2, 0, Math.PI * 2);
      else if (shape === 'oval') { c.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2); }
      else c.rect(-W / 2, -H / 2, W, H);
    }
  }

  w.FloorPlanEditor = FloorPlanEditor;
})(window);
```

✅ **Tekshirish:** brauzer konsolida
```javascript
const ed = new FloorPlanEditor(document.querySelector('#plan-canvas'), {tables:[{id:1,number:'1',seats:4}]});
ed.addTable(1,'round'); console.log(ed.export().objects.length);  // 1
```

---

## V-148 — Admin zal redaktori sahifasi (dark+light, 3 til)

**Fayl:** `templates/admin_panel/floorplan_editor.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}

{% block title %}{% trans "Zal plani" %}{% endblock %}

{% block extra_css %}
<style>
  .fp-wrap { display: grid; grid-template-columns: 240px 1fr 260px; gap: 12px; }
  .fp-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px; color: var(--fg);
  }
  .fp-canvas-box { background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 8px; overflow: hidden; }
  .fp-btn {
    display: block; width: 100%; margin-bottom: 6px; padding: 8px 10px;
    background: var(--surface-2); color: var(--fg);
    border: 1px solid var(--border); border-radius: 8px; cursor: pointer;
    font-size: 13px; text-align: left;
  }
  .fp-btn:hover { background: var(--surface-3); }
  .fp-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .fp-btn.danger { color: var(--danger); }
  .fp-field { margin-bottom: 8px; }
  .fp-field label { display: block; font-size: 12px; color: var(--fg-muted); margin-bottom: 3px; }
  .fp-field input, .fp-field select {
    width: 100%; padding: 6px 8px; background: var(--bg); color: var(--fg);
    border: 1px solid var(--border); border-radius: 6px;
  }
  .fp-save { background: var(--accent); color: #fff; border: none; }
  .fp-tables { max-height: 320px; overflow-y: auto; }
  .fp-hint { font-size: 12px; color: var(--fg-muted); margin-top: 8px; line-height: 1.5; }
  @media (max-width: 1024px) { .fp-wrap { grid-template-columns: 1fr; } }
</style>
{% endblock %}

{% block content %}
<h1 style="color:var(--fg)">🗺 {% trans "Zal plani" %}</h1>

<div class="fp-wrap">
  <!-- Chap: qo'shish -->
  <div class="fp-panel">
    <div class="fp-field">
      <label>{% trans "Zal" %}</label>
      <select id="fp-select"></select>
    </div>

    <strong style="font-size:12px">{% trans "Stol qo'shish" %}</strong>
    <div class="fp-field">
      <label>{% trans "Shakl" %}</label>
      <select id="fp-shape">
        <option value="round">{% trans "Dumaloq" %}</option>
        <option value="square">{% trans "Kvadrat" %}</option>
        <option value="rect">{% trans "To'rtburchak" %}</option>
        <option value="oval">{% trans "Oval" %}</option>
      </select>
    </div>
    <div class="fp-tables" id="fp-tables"></div>

    <hr style="border-color:var(--border)">
    <button class="fp-btn" id="fp-mode-wall">🧱 {% trans "Devor chizish" %}</button>
    <button class="fp-btn" id="fp-add-bar">🍸 {% trans "Bar" %}</button>
    <button class="fp-btn" id="fp-add-door">🚪 {% trans "Eshik" %}</button>
    <button class="fp-btn" id="fp-mode-select">🖱 {% trans "Tanlash" %}</button>
  </div>

  <!-- O'rta: canvas -->
  <div class="fp-canvas-box">
    <canvas id="fp-canvas"></canvas>
    <div class="fp-hint">
      {% trans "Sichqoncha bilan suring · g'ildirak — masshtab · Delete — o'chirish · Ctrl+Z — orqaga" %}
    </div>
  </div>

  <!-- O'ng: xossalar -->
  <div class="fp-panel">
    <strong style="font-size:12px">{% trans "Zal o'lchami (metr)" %}</strong>
    <div class="fp-field"><label>{% trans "Eni" %}</label><input type="number" id="fp-w" step="0.5" min="1"></div>
    <div class="fp-field"><label>{% trans "Bo'yi" %}</label><input type="number" id="fp-h" step="0.5" min="1"></div>

    <hr style="border-color:var(--border)">
    <div id="fp-props"><p style="color:var(--fg-muted);font-size:12px">
      {% trans "Obyekt tanlanmagan" %}</p></div>

    <hr style="border-color:var(--border)">
    <button class="fp-btn fp-save" id="fp-save">💾 {% trans "Saqlash" %}</button>
    <button class="fp-btn danger" id="fp-delete">🗑 {% trans "Tanlanganni o'chirish" %}</button>
    <div class="fp-hint" id="fp-status"></div>
  </div>
</div>
{% endblock %}

{% block extra_js %}
<script src="{% static 'admin/js/floorplan_editor.js' %}?v=1"></script>
<script src="{% static 'admin/js/floorplan_page.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `static/admin/js/floorplan_page.js`
```javascript
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const T = (window.ARMENU && window.ARMENU.t) || ((k) => k);
  const api = (window.ARMENU && window.ARMENU.api) || {
    get: (u) => fetch(u, { credentials: 'same-origin' }).then(r => r.json()),
    patch: (u, b) => fetch(u, {
      method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json',
                 'X-CSRFToken': (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '' },
      body: JSON.stringify(b)
    }).then(async r => { const d = await r.json(); if (!r.ok) throw d; return d; })
  };

  let editor = null, planId = null, tables = [];

  function propsHTML(o) {
    if (!o) return `<p style="color:var(--fg-muted);font-size:12px">${T('plan.no_selection')}</p>`;
    if (o.kind === 'wall') {
      return `<div class="fp-field"><label>${T('plan.thickness')}</label>
        <input type="number" id="p-th" step="0.05" min="0.02" max="1" value="${o.thickness}"></div>`;
    }
    let html = `
      <div class="fp-field"><label>${T('plan.width')}</label>
        <input type="number" id="p-w" step="0.1" min="0.1" value="${o.w}"></div>
      <div class="fp-field"><label>${T('plan.height')}</label>
        <input type="number" id="p-h" step="0.1" min="0.1" value="${o.h}"></div>
      <div class="fp-field"><label>${T('plan.rotation')}</label>
        <input type="range" id="p-rot" min="0" max="359" step="15" value="${o.rot || 0}"></div>`;
    if (o.kind === 'table') {
      html += `<div class="fp-field"><label>${T('plan.seats')}</label>
        <input type="number" id="p-seats" min="1" max="40" value="${o.seats || 4}"></div>
      <div class="fp-field"><label>${T('plan.shape')}</label>
        <select id="p-shape">
          ${['round', 'square', 'rect', 'oval'].map(s =>
            `<option value="${s}" ${o.shape === s ? 'selected' : ''}>${T('plan.shape_' + s)}</option>`).join('')}
        </select></div>`;
    }
    return html;
  }

  function bindProps() {
    const o = editor.selected();
    $('#fp-props').innerHTML = propsHTML(o);
    if (!o) return;
    const on = (id, key, cast) => {
      const el = $(id); if (!el) return;
      el.addEventListener('change', () => editor.updateSelected({ [key]: cast(el.value) }));
    };
    on('#p-w', 'w', parseFloat); on('#p-h', 'h', parseFloat);
    on('#p-th', 'thickness', parseFloat);
    on('#p-rot', 'rot', (v) => parseInt(v, 10));
    on('#p-seats', 'seats', (v) => parseInt(v, 10));
    on('#p-shape', 'shape', String);
  }

  function renderTableList() {
    const used = new Set(editor.export().objects
      .filter(o => o.kind === 'table').map(o => o.table_id));
    $('#fp-tables').innerHTML = tables.map(t => `
      <button class="fp-btn" data-tid="${t.id}" ${used.has(t.id) ? 'disabled style="opacity:.4"' : ''}>
        🪑 ${T('plan.table')} ${t.number} · ${t.seats || 4}${T('common.pcs')}
      </button>`).join('');
    $('#fp-tables').querySelectorAll('button[data-tid]').forEach(b => {
      b.addEventListener('click', () => {
        editor.addTable(parseInt(b.dataset.tid, 10), $('#fp-shape').value);
        renderTableList();
      });
    });
  }

  async function loadPlan(id) {
    const d = await api.get(`/api/v1/floorplans/${id}/`);
    planId = d.id;
    editor.load(d.plan_json);
    $('#fp-w').value = editor.export().size.w;
    $('#fp-h').value = editor.export().size.h;
    renderTableList();
    bindProps();
  }

  async function save() {
    const plan = editor.export();
    plan.size.w = parseFloat($('#fp-w').value) || plan.size.w;
    plan.size.h = parseFloat($('#fp-h').value) || plan.size.h;
    $('#fp-status').textContent = T('common.loading');
    try {
      const d = await api.patch(`/api/v1/floorplans/${planId}/`, { plan_json: plan });
      $('#fp-status').textContent = `✅ ${T('common.save')} · v${d.version}`;
    } catch (e) {
      $('#fp-status').textContent = '⛔ ' + (e.detail || JSON.stringify(e));
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const tRes = await api.get('/api/v1/tables/?page_size=200');
    tables = (tRes.results || tRes).map(t => ({ id: t.id, number: t.number, seats: t.seats }));

    editor = new FloorPlanEditor($('#fp-canvas'), { t: T, tables, onChange: bindProps });

    const plans = await api.get('/api/v1/floorplans/');
    const list = plans.results || plans;
    $('#fp-select').innerHTML = list.map(p =>
      `<option value="${p.id}">${p.name_uz} (${p.floor})</option>`).join('');
    $('#fp-select').addEventListener('change', (e) => loadPlan(e.target.value));

    if (list.length) await loadPlan(list[0].id);

    $('#fp-add-bar').addEventListener('click', () => editor.addBar());
    $('#fp-add-door').addEventListener('click', () => editor.addDoor());
    $('#fp-mode-wall').addEventListener('click', function () {
      editor.setMode('wall'); this.classList.add('active');
      $('#fp-mode-select').classList.remove('active');
    });
    $('#fp-mode-select').addEventListener('click', function () {
      editor.setMode('select'); this.classList.add('active');
      $('#fp-mode-wall').classList.remove('active');
    });
    $('#fp-delete').addEventListener('click', () => { editor.removeSelected(); renderTableList(); bindProps(); });
    $('#fp-save').addEventListener('click', save);
    ['#fp-w', '#fp-h'].forEach(s => $(s).addEventListener('change', () => {
      const p = editor.export();
      p.size.w = parseFloat($('#fp-w').value) || p.size.w;
      p.size.h = parseFloat($('#fp-h').value) || p.size.h;
      editor.load(p);
    }));
  });
})();
```

**`static/i18n/{uz,ru,en}.json` ga `plan` bloki qo'shiladi** (3 tilda majburiy):
```json
"plan": {
  "table": "Stol", "wall": "Devor", "bar": "Bar", "door": "Eshik",
  "shape": "Shakl", "shape_round": "Dumaloq", "shape_square": "Kvadrat",
  "shape_rect": "To'rtburchak", "shape_oval": "Oval",
  "width": "Eni (m)", "height": "Bo'yi (m)", "rotation": "Burilish",
  "seats": "O'rindiq", "thickness": "Qalinlik (m)",
  "no_selection": "Obyekt tanlanmagan",
  "table_already": "Bu stol allaqachon planda bor",
  "legend_free": "Bo'sh", "legend_busy": "Band", "legend_waiting": "Kutmoqda",
  "legend_ready": "Tayyor", "legend_bill": "Hisob"
}
```
```json
"plan": {
  "table": "Стол", "wall": "Стена", "bar": "Бар", "door": "Дверь",
  "shape": "Форма", "shape_round": "Круглый", "shape_square": "Квадратный",
  "shape_rect": "Прямоугольный", "shape_oval": "Овальный",
  "width": "Ширина (м)", "height": "Длина (м)", "rotation": "Поворот",
  "seats": "Мест", "thickness": "Толщина (м)",
  "no_selection": "Объект не выбран",
  "table_already": "Этот стол уже на плане",
  "legend_free": "Свободен", "legend_busy": "Занят", "legend_waiting": "Ожидает",
  "legend_ready": "Готово", "legend_bill": "Счёт"
}
```
```json
"plan": {
  "table": "Table", "wall": "Wall", "bar": "Bar", "door": "Door",
  "shape": "Shape", "shape_round": "Round", "shape_square": "Square",
  "shape_rect": "Rectangle", "shape_oval": "Oval",
  "width": "Width (m)", "height": "Length (m)", "rotation": "Rotation",
  "seats": "Seats", "thickness": "Thickness (m)",
  "no_selection": "No object selected",
  "table_already": "This table is already on the plan",
  "legend_free": "Free", "legend_busy": "Occupied", "legend_waiting": "Waiting",
  "legend_ready": "Ready", "legend_bill": "Bill"
}
```

✅ **Tekshirish:** `/admin-panel/floorplan/` ochiladi, stol qo'shiladi, saqlanadi,
sahifa yangilangach plan joyida turadi. Dark va Light temada ham to'g'ri ko'rinadi.

---

## V-149 — ⚡ O-05: Ofitsiant 2D zal ko'rinishi + WS jonli yangilanish

**Fayl:** `templates/waiter/floor.html`
```html
{% extends "waiter/base.html" %}
{% load i18n static %}

{% block title %}{% trans "Zal" %}{% endblock %}

{% block extra_css %}
<style>
  .wf-head { display:flex; align-items:center; justify-content:space-between;
             gap:8px; padding:10px 12px; color:var(--fg); }
  .wf-head select { padding:6px 10px; background:var(--surface); color:var(--fg);
                    border:1px solid var(--border); border-radius:8px; }
  .wf-canvas-box { padding:8px; }
  #wf-canvas { width:100%; touch-action:none; display:block;
               background:var(--surface); border:1px solid var(--border);
               border-radius:10px; }
  .wf-legend { display:flex; flex-wrap:wrap; gap:10px; padding:10px 12px;
               font-size:12px; color:var(--fg); }
  .wf-legend i { width:12px; height:12px; border-radius:3px; display:inline-block;
                 margin-right:4px; vertical-align:-1px; }
  .wf-off { color:var(--danger); font-size:12px; padding:0 12px; }
</style>
{% endblock %}

{% block content %}
<div class="wf-head">
  <strong>🗺 {% trans "Zal" %}</strong>
  <select id="wf-select"></select>
</div>
<div class="wf-canvas-box"><canvas id="wf-canvas"></canvas></div>
<div class="wf-legend">
  <span><i style="background:#22c55e"></i>{% trans "Bo'sh" %}</span>
  <span><i style="background:#3b82f6"></i>{% trans "Band" %}</span>
  <span><i style="background:#eab308"></i>{% trans "Kutmoqda" %}</span>
  <span><i style="background:#ef4444"></i>{% trans "Tayyor" %}</span>
  <span><i style="background:#a855f7"></i>{% trans "Hisob" %}</span>
</div>
<div class="wf-off" id="wf-off" hidden>⛔ {% trans "Ulanish uzildi — qayta ulanmoqda..." %}</div>
{% endblock %}

{% block extra_js %}
<script src="{% static 'waiter/js/floor_view.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `static/waiter/js/floor_view.js`
```javascript
/* O-05 — ofitsiant zal ko'rinishi (faqat o'qish + jonli rang) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const T = (window.ARMENU && window.ARMENU.t) || ((k) => k);

  const COLORS = {
    green:  '#22c55e', blue: '#3b82f6', yellow: '#eab308',
    red:    '#ef4444', purple: '#a855f7'
  };

  let plan = null, states = {}, scale = 40, pan = { x: 20, y: 20 };
  let cv, ctx, planId = null, ws = null, wsRetry = 1000, pulse = 0;

  function css(v, fb) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;
  }

  function fit() {
    const box = cv.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const hCss = Math.max(360, Math.min(window.innerHeight - 200, box.width * 0.75));
    cv.width = Math.floor(box.width * dpr);
    cv.height = Math.floor(hCss * dpr);
    cv.style.height = hCss + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (plan && plan.size) {
      const sx = (box.width - 40) / plan.size.w;
      const sy = (hCss - 40) / plan.size.h;
      scale = Math.max(12, Math.min(sx, sy));
      pan = { x: (box.width - plan.size.w * scale) / 2,
              y: (hCss - plan.size.h * scale) / 2 };
    }
  }

  function draw(ts) {
    if (!plan) return;
    pulse = (Math.sin((ts || 0) / 320) + 1) / 2;      // 0..1 pulsatsiya
    const fg = css('--fg', '#1a1d21'), border = css('--border', '#d7dce3');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(pan.x, pan.y);

    ctx.strokeStyle = border; ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, plan.size.w * scale, plan.size.h * scale);

    for (const o of (plan.objects || [])) {
      if (o.kind === 'wall') {
        ctx.strokeStyle = fg;
        ctx.lineWidth = Math.max(3, (o.thickness || 0.15) * scale);
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(o.x1 * scale, o.y1 * scale);
        ctx.lineTo(o.x2 * scale, o.y2 * scale);
        ctx.stroke();
      } else if (o.kind === 'bar') {
        ctx.save(); ctx.translate(o.x * scale, o.y * scale);
        ctx.rotate((o.rot || 0) * Math.PI / 180);
        ctx.fillStyle = css('--surface-3', '#dfe4ec');
        ctx.strokeStyle = fg; ctx.lineWidth = 1.5;
        ctx.fillRect(-o.w * scale / 2, -o.h * scale / 2, o.w * scale, o.h * scale);
        ctx.strokeRect(-o.w * scale / 2, -o.h * scale / 2, o.w * scale, o.h * scale);
        ctx.fillStyle = fg; ctx.font = '11px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(T('plan.bar'), 0, 0);
        ctx.restore();
      } else if (o.kind === 'door') {
        ctx.save(); ctx.translate(o.x * scale, o.y * scale);
        ctx.rotate((o.rot || 0) * Math.PI / 180);
        ctx.strokeStyle = '#8a9099'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(-o.w * scale / 2, 0);
        ctx.lineTo(o.w * scale / 2, 0); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
    }

    for (const o of (plan.objects || [])) {
      if (o.kind !== 'table') continue;
      drawTable(o, fg);
    }
    ctx.restore();
    requestAnimationFrame(draw);
  }

  function drawTable(o, fg) {
    const st = states[o.table_id] || { color: 'green', number: o.table_id };
    const color = COLORS[st.color] || COLORS.green;
    const W = o.w * scale, H = o.h * scale;

    ctx.save();
    ctx.translate(o.x * scale, o.y * scale);
    ctx.rotate((o.rot || 0) * Math.PI / 180);

    // ⚡ 🔴 tayyor — pulsatsiya halqasi
    if (st.color === 'red') {
      ctx.save();
      ctx.globalAlpha = 0.20 + 0.35 * pulse;
      ctx.fillStyle = color;
      shapePath(o.shape, W * (1.15 + 0.15 * pulse), H * (1.15 + 0.15 * pulse));
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.5;
    shapePath(o.shape, W, H);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(12, W / 3.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(st.number || o.table_id), 0, st.waiting_min ? -W / 9 : 0);
    if (st.waiting_min) {
      ctx.font = `${Math.max(9, W / 7)}px system-ui, sans-serif`;
      ctx.fillText(st.waiting_min + T('common.min_short'), 0, W / 5);
    }
    ctx.restore();
  }

  function shapePath(shape, W, H) {
    ctx.beginPath();
    if (shape === 'round') ctx.arc(0, 0, Math.min(W, H) / 2, 0, Math.PI * 2);
    else if (shape === 'oval') ctx.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
    else ctx.rect(-W / 2, -H / 2, W, H);
  }

  /* ---- bosish → buyurtma tafsiloti (O-03) ---- */
  function hitTest(e) {
    const r = cv.getBoundingClientRect();
    const mx = ((e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - r.left - pan.x) / scale;
    const my = ((e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - r.top - pan.y) / scale;
    for (const o of (plan.objects || [])) {
      if (o.kind !== 'table') continue;
      if (mx >= o.x - o.w / 2 && mx <= o.x + o.w / 2 &&
          my >= o.y - o.h / 2 && my <= o.y + o.h / 2) return o;
    }
    return null;
  }

  function onTap(e) {
    const o = hitTest(e);
    if (!o) return;
    const st = states[o.table_id] || {};
    location.href = st.order_id
      ? `/waiter/order/${st.order_id}/`
      : `/waiter/table/${o.table_id}/new/`;
  }

  /* ---- ma'lumot ---- */
  async function loadPlan(id) {
    const r = await fetch(`/api/v1/floorplans/${id}/live/`, { credentials: 'same-origin' });
    const d = await r.json();
    planId = d.id;
    plan = d.plan_json;
    states = d.tables || {};
    fit();
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws/waiter/`);
    ws.onopen = () => { wsRetry = 1000; $('#wf-off').hidden = true; };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      const type = m.type, data = m.data || {};
      if (type === 'table.state' && data.table_id in states) {
        states[data.table_id] = Object.assign(states[data.table_id], data);
      } else if (type === 'plan.updated' && data.plan_id === planId) {
        loadPlan(planId);
      } else if (type === 'order.created' || type === 'order.status' ||
                 type === 'call.created' || type === 'call.done') {
        if (planId) loadPlan(planId);          // zaxira: to'liq yangilash
      }
    };
    ws.onclose = () => {
      $('#wf-off').hidden = false;
      wsRetry = Math.min(wsRetry * 2, 15000);
      setTimeout(connectWS, wsRetry);
    };
    ws.onerror = () => { try { ws.close(); } catch (_) {} };
  }

  document.addEventListener('DOMContentLoaded', async () => {
    cv = $('#wf-canvas'); ctx = cv.getContext('2d');
    const r = await fetch('/api/v1/floorplans/', { credentials: 'same-origin' });
    const list = (await r.json()).results || [];
    $('#wf-select').innerHTML = list.map(p =>
      `<option value="${p.id}">${p.name_uz}</option>`).join('');
    $('#wf-select').addEventListener('change', (e) => loadPlan(e.target.value));
    if (list.length) await loadPlan(list[0].id);

    cv.addEventListener('click', onTap);
    window.addEventListener('resize', fit);
    // 30 s da bir marta zaxira yangilash (WS uzilib qolsa ham rang eskirmaydi)
    setInterval(() => { if (planId && (!ws || ws.readyState !== 1)) loadPlan(planId); }, 30000);
    requestAnimationFrame(draw);
  });
})();
```

`common` blokiga 3 tilda qo'shiladi: `"min_short": "d"` / `"мин"` / `"m"`.

✅ **Tekshirish:**
1. Ofitsiant `/waiter/floor/` ni ochadi → stollar rangi bilan ko'rinadi
2. Boshqa oynadan buyurtma `ready` qilinadi → stol **qizil, pulsatsiya bilan** bo'ladi (sahifa yangilanmasdan)
3. Chaqiruv yuboriladi → stol binafsha
4. Stolga bosilsa → buyurtma tafsilotiga o'tadi

---

## V-150 — Admin jonli zal + testlar

**Admin sahifa** — ofitsiant ko'rinishini `rest_<id>_admin` guruhiga ulaydi.

**Fayl:** `templates/admin_panel/floorplan_live.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Jonli zal" %}{% endblock %}
{% block content %}
<h1 style="color:var(--fg)">🔴 {% trans "Jonli zal" %}</h1>
<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
  <select id="wf-select" style="padding:6px 10px;background:var(--surface);
    color:var(--fg);border:1px solid var(--border);border-radius:8px"></select>
  <span id="fp-summary" style="color:var(--fg-muted);font-size:13px"></span>
</div>
<canvas id="wf-canvas" style="width:100%;background:var(--surface);
  border:1px solid var(--border);border-radius:10px"></canvas>
<div class="wf-legend" style="display:flex;gap:12px;padding:10px 0;
  font-size:12px;color:var(--fg)">
  <span>🟢 {% trans "Bo'sh" %}</span><span>🔵 {% trans "Band" %}</span>
  <span>🟡 {% trans "Kutmoqda" %}</span><span>🔴 {% trans "Tayyor" %}</span>
  <span>🟣 {% trans "Hisob" %}</span>
</div>
<div class="wf-off" id="wf-off" hidden style="color:var(--danger)">
  ⛔ {% trans "Ulanish uzildi" %}</div>
{% endblock %}
{% block extra_js %}
<script>window.ARMENU_WS_PATH = '/ws/admin/';</script>
<script src="{% static 'waiter/js/floor_view.js' %}?v=1"></script>
{% endblock %}
```

`floor_view.js` da WS yo'li sozlanadigan qilinadi:
```javascript
// connectWS() ichida:
const path = window.ARMENU_WS_PATH || '/ws/waiter/';
ws = new WebSocket(`${proto}://${location.host}${path}`);
```

**URL'lar — `apps/tables/urls_pages.py`:**
```python
from django.urls import path
from django.views.generic import TemplateView
from apps.accounts.decorators import admin_required, staff_required

urlpatterns = [
    path('admin-panel/floorplan/',
         admin_required(TemplateView.as_view(
             template_name='admin_panel/floorplan_editor.html')),
         name='floorplan-editor'),
    path('admin-panel/floorplan/live/',
         admin_required(TemplateView.as_view(
             template_name='admin_panel/floorplan_live.html')),
         name='floorplan-live'),
    path('waiter/floor/',
         staff_required(TemplateView.as_view(
             template_name='waiter/floor.html')),
         name='waiter-floor'),
]
```

**Fayl:** `tests/test_floorplan_api.py`
```python
import pytest
from apps.tables.models import FloorPlan, Table
from apps.tables.services_floorplan import collect_table_states


@pytest.fixture
def plan(db, restaurant):
    t1 = Table.objects.create(restaurant=restaurant, number='1', seats=4)
    t2 = Table.objects.create(restaurant=restaurant, number='2', seats=2)
    p = FloorPlan.objects.create(
        restaurant=restaurant, name_uz='Asosiy zal', floor=1,
        plan_json={'schema': 1, 'size': {'w': 10, 'h': 8}, 'grid': 0.25,
                   'objects': [
                       {'id': 't1', 'kind': 'table', 'table_id': t1.id,
                        'x': 2, 'y': 2, 'w': 1.2, 'h': 1.2,
                        'shape': 'round', 'rot': 0, 'seats': 4},
                       {'id': 't2', 'kind': 'table', 'table_id': t2.id,
                        'x': 5, 'y': 2, 'w': 1, 'h': 1,
                        'shape': 'square', 'rot': 0, 'seats': 2},
                   ]})
    return p, t1, t2


def test_plan_saves_and_bumps_version(api_client, admin_user, plan):
    p, t1, t2 = plan
    api_client.force_authenticate(admin_user)
    body = dict(p.plan_json)
    body['objects'][0]['x'] = 3.5
    r = api_client.patch(f'/api/v1/floorplans/{p.id}/',
                         {'plan_json': body}, format='json')
    assert r.status_code == 200
    assert r.data['version'] == 2
    p.refresh_from_db()
    assert p.plan_json['objects'][0]['x'] == 3.5


def test_cross_tenant_plan_not_visible(api_client, admin_user, restaurant2):
    other = FloorPlan.objects.create(restaurant=restaurant2, name_uz='Begona')
    api_client.force_authenticate(admin_user)
    r = api_client.get(f'/api/v1/floorplans/{other.id}/')
    assert r.status_code == 404


def test_live_returns_colors(api_client, waiter_user, plan):
    p, t1, t2 = plan
    api_client.force_authenticate(waiter_user)
    r = api_client.get(f'/api/v1/floorplans/{p.id}/live/')
    assert r.status_code == 200
    assert r.data['tables'][t1.id]['color'] == 'green'


def test_ready_order_makes_table_red(plan, restaurant):
    from apps.orders.models import Order
    p, t1, t2 = plan
    Order.objects.create(restaurant=restaurant, table=t1,
                         number='001', status='ready', total=100000)
    st = collect_table_states(restaurant.id, [t1.id, t2.id])
    assert st[t1.id]['color'] == 'red'
    assert st[t2.id]['color'] == 'green'


def test_pending_call_makes_purple(plan, restaurant):
    from apps.calls.models import Call
    p, t1, t2 = plan
    Call.objects.create(restaurant=restaurant, table=t1,
                        kind='bill', status='pending')
    st = collect_table_states(restaurant.id, [t1.id])
    assert st[t1.id]['color'] == 'purple'


def test_states_no_n_plus_one(django_assert_num_queries, plan, restaurant):
    p, t1, t2 = plan
    with django_assert_num_queries(2):        # Order + Call — bor-yo'g'i 2 ta
        collect_table_states(restaurant.id, [t1.id, t2.id])
```

✅ **Tekshirish:**
```bash
pytest tests/test_floorplan_validate.py tests/test_table_color.py \
       tests/test_floorplan_api.py -q
# 13 passed
```

---

# ✅ FAZA 7 QABULI

```
[ ] FloorPlan modeli va migratsiya bor
[ ] plan_json validatsiyasi begona stolni RAD ETADI (cross-tenant)
[ ] Admin canvas'da stol/devor/bar/eshik chizadi va saqlaydi
[ ] Saqlangach version++ va WS 'plan.updated' yuboriladi
[ ] Ofitsiant O-05 da 5 xil rangni to'g'ri ko'radi
[ ] 🔴 tayyor stol PULSATSIYA qiladi
[ ] Buyurtma holati o'zgarsa — sahifa yangilanmasdan rang o'zgaradi
[ ] Stolga bosilsa buyurtma tafsilotiga o'tadi
[ ] Admin "Jonli zal" sahifasi ishlaydi
[ ] Dark + Light tema ikkalasi ham to'g'ri
[ ] plan/common kalitlari uz+ru+en — 3 tada ham to'liq
[ ] collect_table_states 2 ta so'rov (N+1 yo'q)
[ ] pytest tests/ -q → o'tadi
```

**⚡ v3 tayyorgarligi tekshiruvi:**
```bash
python manage.py shell -c "
from apps.tables.models import FloorPlan
p = FloorPlan.objects.first()
print('schema:', p.plan_json.get('schema'))
print('metrda:', p.plan_json.get('size'))
print('z/height saqlanadimi:', 'z' in str(p.plan_json) or 'validator qabul qiladi')
"
```

**Yakuniy:**
```bash
python manage.py collectstatic --noinput
git add -A && git commit -m "FAZA 7 tugadi: 2D zal plani (redaktor + O-05 jonli)"
python3 ROADMAP/03_HOLAT/update_progress.py V-150 ok "FAZA 7 tugadi"
```

**➡️ Keyingi:** `FAZA_08_ADMIN.md`
