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
from apps.core.api.legal_views import (
    LegalDocumentViewSet,
    PublicLegalDocumentListView,
    PublicLegalDocumentDetailView,
    UserConsentView,
    CheckConsentView,
)

router = DefaultRouter()
router.register(r'categories', ContentCategoryViewSet, basename='content-categories')
router.register(r'faqs', FAQArticleViewSet, basename='faqs')
router.register(r'tutorials', TutorialViewSet, basename='tutorials')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'support-tickets', SupportTicketViewSet, basename='support-tickets')
router.register(r'legal-documents', LegalDocumentViewSet, basename='legal-documents')

urlpatterns = [
    path('', include(router.urls)),
    
    # Public Legal Document Access
    path('legal/', PublicLegalDocumentListView.as_view(), name='public-legal-list'),
    path('legal/<str:doc_type>/', PublicLegalDocumentDetailView.as_view(), name='public-legal-detail'),
    
    # User Consent Management
    path('my-consents/', UserConsentView.as_view(), name='user-consents'),
    path('check-consent/', CheckConsentView.as_view(), name='check-consent'),
]
