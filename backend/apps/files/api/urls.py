from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.files.api.views import UserFileViewSet, PublicFileViewSet

router = DefaultRouter()
router.register(r'', UserFileViewSet, basename='files')
router.register(r'share', PublicFileViewSet, basename='share-files')

urlpatterns = [
    path('', include(router.urls)),
]
