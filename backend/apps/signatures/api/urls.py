"""Signatures API URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.signatures.api.views import (
    SignatureRequestViewSet,
    SignatureTemplateViewSet,
    SignatureContactViewSet
)

router = DefaultRouter()
router.register(r'requests', SignatureRequestViewSet, basename='signature-requests')
router.register(r'templates', SignatureTemplateViewSet, basename='signature-templates')
router.register(r'contacts', SignatureContactViewSet, basename='signature-contacts')

urlpatterns = [
    path('', include(router.urls)),
]
