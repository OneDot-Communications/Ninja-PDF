from rest_framework import viewsets, permissions
from .models import Plan, Subscription, Invoice, BusinessDetails, Feature, UserFeatureOverride
from .serializers import (
    PlanSerializer, SubscriptionSerializer, InvoiceSerializer, 
    BusinessDetailsSerializer, FeatureSerializer, UserFeatureOverrideSerializer
)
from core.views import IsAdminOrSuperAdmin, IsSuperAdmin

class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    permission_classes = [IsAdminOrSuperAdmin] # Admins can read/edit? Maybe restricted to SuperAdmin for editing.
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
             return [IsSuperAdmin()]
        return [IsAdminOrSuperAdmin()]

class UserFeatureOverrideViewSet(viewsets.ModelViewSet):
    queryset = UserFeatureOverride.objects.all()
    serializer_class = UserFeatureOverrideSerializer
    permission_classes = [IsSuperAdmin] # Only Super Admin can override features per user

class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAdminOrSuperAdmin]

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
