from django.urls import path
from apps.menu import views
from apps.menu.views_upsell import upsell_suggestions, upsell_accept
from apps.menu.views_translation import TranslationAdminView, TranslationAutoView

urlpatterns = [
    path('menu/upsell/', upsell_suggestions, name='upsell-suggestions'),
    path('menu/upsell/accept/', upsell_accept, name='upsell-accept'),
    path('admin/translations/', TranslationAdminView.as_view(), name='translation-admin'),
    path('admin/translations/auto/', TranslationAutoView.as_view(), name='translation-auto'),
    path('menu/<slug:slug>/', views.MenuView.as_view(), name='menu'),
    path('menu/<slug:slug>/search/', views.MenuSearchView.as_view(), name='menu-search'),
    path('menu/<slug:slug>/filter/', views.MenuFilterView.as_view(), name='menu-filter'),
    path('dish/<int:pk>/', views.DishDetailView.as_view(), name='dish-detail'),
]
