from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SignatureRequestViewSet, TemplateViewSet, ContactViewSet

router = DefaultRouter()
router.register(r'requests', SignatureRequestViewSet, basename='signature-requests')
router.register(r'templates', TemplateViewSet, basename='signature-templates')
router.register(r'contacts', ContactViewSet, basename='signature-contacts')

urlpatterns = [
    path('', include(router.urls)),
]
