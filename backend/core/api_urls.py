from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'settings', views.SystemSettingViewSet)
router.register(r'admin-requests', views.AdminActionRequestViewSet)
router.register(r'support-tickets', views.SupportTicketViewSet)
router.register(r'content-versions', views.ContentVersionViewSet)
router.register(r'history', views.UserTaskViewSet, basename='history')


urlpatterns = [
     path('settings/public/', views.PublicSettingsView.as_view(), name='public-settings'),
     path('settings/branding/', views.AdminBrandingView.as_view(), name='admin-branding'),
    path('tasks/<str:task_id>/', views.TaskStatusView.as_view(), name='task-status'),
    path('legal/<str:slug>/', views.LegalDocumentView.as_view(), name='legal-document'),
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
    path('', include(router.urls)),
]
