"""Content Management API URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.core.api.content_views import (
    ContentCategoryViewSet,
    FAQArticleViewSet,
    TutorialViewSet,
    AnnouncementViewSet,
    SupportTicketViewSet,
)

router = DefaultRouter()
router.register(r'categories', ContentCategoryViewSet, basename='content-categories')
router.register(r'faqs', FAQArticleViewSet, basename='faqs')
router.register(r'tutorials', TutorialViewSet, basename='tutorials')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'support-tickets', SupportTicketViewSet, basename='support-tickets')

urlpatterns = [
    path('', include(router.urls)),
]
