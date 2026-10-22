"""
Yumshoq o'chirish (soft delete) — biznes yozuvlari hech qachon tasodifan butunlay yo'qolmasligi uchun (TZ: R10-6, AGENTS.md 4-qoida).

Ikki shakl:
- `SoftDeleteBehaviour` — faqat xatti-harakat (maydonlari modelning o'zida bor: Product, Order, Table, TableReservation).
  `instance.delete()` va `queryset.delete()` yozuvni o'chirmaydi, `is_deleted=True` qiladi.
- `SoftDeleteModel` — maydonlar + `objects` (o'chirilganlarni ko'rsatmaydi) + `all_objects` (hammasi). Yangi modellar uchun.

Haqiqatan o'chirish kerak bo'lsa (masalan, shaxsiy ma'lumotni qonuniy ravishda yo'q qilish) — `hard_delete()`.
Shop o'chirilganda bog'liq yozuvlar CASCADE bilan bazaning o'zida o'chadi (Django collector `delete()` ni chaqirmaydi):
do'konning o'zi ham soft-delete qilinishi kerak; hozircha admin uchun cheklangan.
`orders/test_soft_delete.py` yangi `.delete()` chaqiruvlari ro'yxatdan tashqarida paydo bo'lmasligini tekshiradi.
"""
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):

    def delete(self):
        count = self.update(is_deleted=True, deleted_at=timezone.now())
        return count, {self.model._meta.label: count}

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)

    def restore(self):
        return self.update(is_deleted=False, deleted_at=None)


class SoftDeleteAllManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    """Hammasini (o'chirilganlarni ham) ko'rsatadi; `delete()` baribir yashiradi."""


class SoftDeleteManager(SoftDeleteAllManager):
    """O'chirilganlarni ko'rsatmaydigan standart menejer (barchasi uchun `all_objects`)."""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class SoftDeleteBehaviour:
    """`is_deleted` va `deleted_at` maydonlari bor modellar uchun: delete() yozuvni yashiradi."""

    # Yashirilganda qo'shimcha o'zgaradigan maydonlar (masalan, mahsulot "mavjud emas" bo'ladi)
    soft_delete_extra = {}

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        fields = ['is_deleted', 'deleted_at']
        for name, value in self.soft_delete_extra.items():
            setattr(self, name, value)
            fields.append(name)
        self.save(update_fields=fields)
        return 1, {self._meta.label: 1}

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])


class SoftDeleteModel(SoftDeleteBehaviour, models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True, verbose_name="O'chirilgan (Soft delete)")
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = SoftDeleteAllManager()

    class Meta:
        abstract = True


def restore_selected(modeladmin, request, queryset):
    updated = queryset.update(is_deleted=False, deleted_at=None)
    modeladmin.message_user(request, f'{updated} ta yozuv qayta tiklandi.')


class SoftDeleteAdminMixin:
    """Admin'da o'chirilganlar ham ko'rinadi (filtr bilan) va "Qayta tiklash" amali bor."""

    def get_queryset(self, request):
        manager = getattr(self.model, 'all_objects', None) or self.model._default_manager
        queryset = manager.get_queryset()
        ordering = self.get_ordering(request)
        return queryset.order_by(*ordering) if ordering else queryset

    def get_list_filter(self, request):
        return tuple(super().get_list_filter(request)) + ('is_deleted',)

    def get_actions(self, request):
        actions = super().get_actions(request)
        actions['restore_selected'] = (restore_selected, 'restore_selected', 'Tanlanganlarni qayta tiklash')
        return actions
