from django.db import models

from categories.kinds import KIND_CHOICES, guess_kind


class Category(models.Model):
    name = models.CharField(max_length=100)
    name_uz = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100, blank=True)
    icon = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#16a34a')
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_restaurant = models.BooleanField(default=False)
    # Mehmon taom oynasidagi "Qo'shimcha" tavsiyalari uchun (bo'sh = nomidan aniqlanadi, categories/kinds.py)
    kind = models.CharField('Turi (tavsiyalar uchun)', max_length=10, choices=KIND_CHOICES, blank=True, default='')
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='children'
    )

    class Meta:
        db_table = 'categories'
        ordering = ['sort_order']
        verbose_name = 'Kategoriya'
        verbose_name_plural = 'Kategoriyalar'

    def __str__(self):
        return self.name

    @property
    def effective_kind(self):
        """Egasi tanlagan tur, bo'sh bo'lsa nomidan aniqlangani."""
        return self.kind or guess_kind(self.name, self.name_uz, self.name_ru, self.name_en)
