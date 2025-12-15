"""Subscriptions API Views"""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.subscriptions.models.subscription import Plan, Subscription, Invoice, BusinessDetails, Feature, UserFeatureOverride, Payment, Referral
from apps.subscriptions.api.serializers import (
    PlanSerializer, SubscriptionSerializer, InvoiceSerializer, 
    BusinessDetailsSerializer, FeatureSerializer, UserFeatureOverrideSerializer,
    PaymentSerializer, ReferralSerializer
)
from core.views import IsAdminOrSuperAdmin, IsSuperAdmin


class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return [permissions.AllowAny()]


class UserFeatureOverrideViewSet(viewsets.ModelViewSet):
    queryset = UserFeatureOverride.objects.all()
    serializer_class = UserFeatureOverrideSerializer
    permission_classes = [IsSuperAdmin]


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['ADMIN', 'SUPER_ADMIN']:
            return Subscription.objects.all()
        return Subscription.objects.filter(user=self.request.user)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['ADMIN', 'SUPER_ADMIN']:
            return Invoice.objects.all()
        return Invoice.objects.filter(user=self.request.user)


class BusinessDetailsViewSet(viewsets.ModelViewSet):
    queryset = BusinessDetails.objects.all()
    serializer_class = BusinessDetailsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusinessDetails.objects.filter(user=self.request.user)


class ReferralViewSet(viewsets.ModelViewSet):
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Referral.objects.filter(referrer=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            'total_invites': qs.count(),
            'successful_signups': qs.filter(status='COMPLETED').count(),
            'rewards_earned': qs.filter(reward_granted=True).count()
        })


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['SUPER_ADMIN']:
            return Payment.objects.all().order_by('-created_at')
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')
