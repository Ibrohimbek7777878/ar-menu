from django.urls import path
from apps.ar3d import admin_views as v

app_name = 'ar3d_admin'

urlpatterns = [
    path('admin/ar/generate/', v.ar_generate, name='generate'),
    path('admin/ar/jobs/', v.ar_jobs, name='jobs'),
    path('admin/ar/upload/', v.ar_upload, name='upload'),
    path('admin/ar/library/search/', v.ar_library_search, name='lib-search'),
    path('admin/ar/library/use/', v.ar_use_library, name='lib-use'),
    path('admin/ar/models/', v.ar_models, name='models'),
    path('admin/ar/analytics/', v.ar_analytics_view, name='analytics'),
]
