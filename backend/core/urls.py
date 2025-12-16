"""
URL configuration for core project.
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    
    # API Routes - Consolidated Apps
    path('api/auth/', include('apps.accounts.api.urls')),
    path('api/billing/', include('apps.subscriptions.api.urls')),
    path('api/files/', include('apps.files.api.urls')),
    path('api/teams/', include('apps.teams.api.urls')),
    path('api/workflows/', include('apps.workflows.api.urls')),
    path('api/tools/', include('apps.tools.api.urls')),
    path('api/signatures/', include('apps.signatures.api.urls')),
    path('api/jobs/', include('apps.jobs.api.urls')),
    
    # Alias for legacy/v1 converter calls
    path('api/v1/convert/', include('apps.tools.api.urls')),
    
    # Core system endpoints
    path('api/core/', include('core.api_urls')),
    
    # Allauth social login
    path('accounts/', include('allauth.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
