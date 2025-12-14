from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanViewSet, SubscriptionViewSet, InvoiceViewSet,
    BusinessDetailsViewSet, FeatureViewSet, UserFeatureOverrideViewSet,
    AdminSubscriptionView, ReferralViewSet, PaymentViewSet
)

router = DefaultRouter()
router.register(r'plans', PlanViewSet)
router.register(r'subscriptions', SubscriptionViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'features', FeatureViewSet)
router.register(r'feature-overrides', UserFeatureOverrideViewSet)
# Business Details usually singleton per user, maybe just a generic view or handled in user profile?
# Leaving as viewset for now
router.register(r'business-details', BusinessDetailsViewSet)
router.register(r'admin/subscriptions', AdminSubscriptionView, basename='admin-subscriptions')
router.register(r'referrals', ReferralViewSet, basename='referrals')
router.register(r'payments', PaymentViewSet, basename='payments')

urlpatterns = [
    path('', include(router.urls)),
]
