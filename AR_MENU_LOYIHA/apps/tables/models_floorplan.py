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
    floor = models.SmallIntegerField(default=1, db_index=True)
    plan_json = models.JSONField(default=dict, blank=True)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    sort = models.SmallIntegerField(default=0)

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
