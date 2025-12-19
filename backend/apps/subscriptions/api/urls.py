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

# Trial Views
from apps.subscriptions.api.trial_views import (
    StartTrialView,
    TrialStatusView,
    ConvertTrialView,
    ExtendTrialView,
    AdminTrialListView,
    ForceExpireTrialView,
)

# Tax Views
from apps.subscriptions.api.tax_views import (
    TaxRuleViewSet,
    TaxExemptionViewSet,
    BillingConfigurationViewSet,
    UserTaxExemptionView,
)

# Register tax viewsets
router.register(r'tax-rules', TaxRuleViewSet, basename='tax-rules')
router.register(r'tax-exemptions', TaxExemptionViewSet, basename='tax-exemptions')
router.register(r'billing-config', BillingConfigurationViewSet, basename='billing-config')

# Feature Flag Views
from apps.subscriptions.api.feature_flag_views import (
    FeatureFlagViewSet,
    UserFeatureFlagsView,
    CheckFeatureFlagView,
)
router.register(r'feature-flags', FeatureFlagViewSet, basename='feature-flags')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/', stripe_webhook, name='stripe-webhook'),
    
    # Trial Period Endpoints
    path('trial/start/', StartTrialView.as_view(), name='trial-start'),
    path('trial/status/', TrialStatusView.as_view(), name='trial-status'),
    path('trial/convert/', ConvertTrialView.as_view(), name='trial-convert'),
    
    # Admin Trial Management
    path('admin/trials/', AdminTrialListView.as_view(), name='admin-trial-list'),
    path('admin/trials/<int:user_id>/extend/', ExtendTrialView.as_view(), name='admin-trial-extend'),
    path('admin/trials/<int:user_id>/expire/', ForceExpireTrialView.as_view(), name='admin-trial-expire'),
    
    # User Tax Exemption
    path('my-tax-exemptions/', UserTaxExemptionView.as_view(), name='user-tax-exemptions'),
    
    # User Feature Flags
    path('my-feature-flags/', UserFeatureFlagsView.as_view(), name='user-feature-flags'),
    path('check-feature/<str:code>/', CheckFeatureFlagView.as_view(), name='check-feature'),
]

