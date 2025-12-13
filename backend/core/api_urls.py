from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SystemSettingViewSet, AdminActionRequestViewSet

router = DefaultRouter()
router.register(r'settings', SystemSettingViewSet)
router.register(r'admin-requests', AdminActionRequestViewSet)

urlpatterns = [
     path('', include(router.urls)),
]
