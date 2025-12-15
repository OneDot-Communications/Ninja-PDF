"""Subscriptions API URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.subscriptions.api.views import (
    PlanViewSet,
    SubscriptionViewSet,
    InvoiceViewSet,
    FeatureViewSet,
    UserFeatureOverrideViewSet,
    BusinessDetailsViewSet,
    ReferralViewSet,
    PaymentViewSet
)

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plans')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscriptions')
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'features', FeatureViewSet, basename='features')
router.register(r'feature-overrides', UserFeatureOverrideViewSet, basename='feature-overrides')
router.register(r'business-details', BusinessDetailsViewSet, basename='business-details')
router.register(r'referrals', ReferralViewSet, basename='referrals')
router.register(r'payments', PaymentViewSet, basename='payments')

urlpatterns = [
    path('', include(router.urls)),
]
