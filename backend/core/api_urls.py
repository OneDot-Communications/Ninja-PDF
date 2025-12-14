from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'settings', views.SystemSettingViewSet)
router.register(r'admin-requests', views.AdminActionRequestViewSet)
router.register(r'content-versions', views.ContentVersionViewSet)

urlpatterns = [
     path('settings/public/', views.PublicSettingsView.as_view(), name='public-settings'),
     path('settings/branding/', views.AdminBrandingView.as_view(), name='admin-branding'),
     path('tasks/<str:task_id>/', views.TaskStatusView.as_view(), name='task-status'),
     path('', include('teams.urls')),
     path('', include(router.urls)),
]
