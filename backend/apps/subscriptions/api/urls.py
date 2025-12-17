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
    PaymentViewSet,
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

# Conditionally add ViewSets if they exist
try:
    from apps.subscriptions.api.coupon_views import (
        CouponViewSet,
        RegionalPricingViewSet,
        TaxConfigurationViewSet,
        TrialConfigurationViewSet
    )
    router.register(r'coupons', CouponViewSet, basename='coupons')
    router.register(r'regional-pricing', RegionalPricingViewSet, basename='regional-pricing')
    router.register(r'tax-config', TaxConfigurationViewSet, basename='tax-config')
    router.register(r'trial-config', TrialConfigurationViewSet, basename='trial-config')
except ImportError:
    pass

try:
    from apps.subscriptions.api.tool_change_views import ToolChangeRequestViewSet
    router.register(r'tool-change-requests', ToolChangeRequestViewSet, basename='tool-change-requests')
except ImportError:
    pass

from apps.subscriptions.api.webhooks import stripe_webhook

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/', stripe_webhook, name='stripe-webhook'),
]


