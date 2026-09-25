from finance.models import FinanceCategory

DEFAULT_EXPENSE_CATEGORIES = [
    ('Go\'sht va Parranda', '🥩', '#ef4444'),
    ('Sabzavot va Mevalar', '🥬', '#10b981'),
    ('Guruch, Yog\' va Un', '🌾', '#f59e0b'),
    ('Ichimliklar va Suv', '🥤', '#06b6d4'),
    ('Kommunal (Gaz, Svet, Suv)', '⚡', '#8b5cf6'),
    ('Xodimlar Ish Haqi', '👨‍🍳', '#ec4899'),
    ('Bino Ijarasi', '🏢', '#6366f1'),
    ('Idishlar va Xo\'jalik', '📦', '#64748b'),
    ('Boshqa xarajatlar', '💡', '#94a3b8'),
]

DEFAULT_INCOME_CATEGORIES = [
    ('Zaldagi Taom Savdosi', '🍽️', '#10b981'),
    ('Yetkazib berish (Dostavka)', '🛵', '#3b82f6'),
    ('Banket va To\'y xizmati', '🎉', '#8b5cf6'),
    ('Sarmoya va Investitsiya', '💼', '#0284c7'),
    ('Boshqa tushum', '💵', '#14b8a6'),
]

def seed_default_categories_for_shop(shop):
    """Do'kon uchun agar kategoriyalar bo'lmasa, dastlabki standart kategoriyalarni yaratish."""
    if not FinanceCategory.objects.filter(shop=shop).exists():
        cats = []
        for order, (name, icon, color) in enumerate(DEFAULT_EXPENSE_CATEGORIES, 1):
            cats.append(FinanceCategory(
                shop=shop, name=name, category_type='expense',
                icon=icon, color=color, is_system=True, sort_order=order
            ))
        for order, (name, icon, color) in enumerate(DEFAULT_INCOME_CATEGORIES, 10):
            cats.append(FinanceCategory(
                shop=shop, name=name, category_type='income',
                icon=icon, color=color, is_system=True, sort_order=order
            ))
        FinanceCategory.objects.bulk_create(cats)
