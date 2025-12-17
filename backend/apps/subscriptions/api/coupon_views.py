"""Coupon and Pricing API Views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.subscriptions.models import (
    Coupon, CouponUsage, RegionalPricing, TaxConfiguration, TrialConfiguration
)
from apps.subscriptions.api.coupon_serializers import (
    CouponSerializer, CouponUsageSerializer, RegionalPricingSerializer,
    TaxConfigurationSerializer, TrialConfigurationSerializer,
    CouponValidationSerializer, ApplyCouponSerializer
)
from core.views import IsAdminOrSuperAdmin, IsSuperAdmin


class CouponViewSet(viewsets.ModelViewSet):
    """
    CRUD for Coupons.
    Tasks 32-33: Promotional pricing, coupons & discounts
    """
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def validate(self, request):
        """Validate a coupon code"""
        serializer = CouponValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code'].upper()
        coupon = Coupon.objects.get(code=code)
        
        # Check user-specific limits
        if coupon.max_uses_per_user > 0:
            user_uses = CouponUsage.objects.filter(coupon=coupon, user=request.user).count()
            if user_uses >= coupon.max_uses_per_user:
                return Response(
                    {'valid': False, 'error': 'You have already used this coupon'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check new users only
        if coupon.new_users_only:
            has_paid = request.user.payments.filter(status='SUCCESS').exists()
            if has_paid:
                return Response(
                    {'valid': False, 'error': 'This coupon is for new users only'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({
            'valid': True,
            'discount_type': coupon.discount_type,
            'discount_value': str(coupon.discount_value),
            'minimum_order_amount': str(coupon.minimum_order_amount)
        })
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply coupon and calculate discount"""
        coupon = self.get_object()
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        original_price = serializer.validated_data['original_price']
        
        if original_price < coupon.minimum_order_amount:
            return Response(
                {'error': f'Minimum order amount is {coupon.minimum_order_amount}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        discounted_price = coupon.apply_discount(original_price)
        discount_amount = original_price - discounted_price
        
        return Response({
            'original_price': str(original_price),
            'discount_amount': str(discount_amount),
            'final_price': str(discounted_price)
        })
    
    @action(detail=False, methods=['get'])
    def generate_code(self, request):
        """Generate a unique coupon code"""
        code = Coupon.generate_code()
        return Response({'code': code})
    
    @action(detail=True, methods=['get'])
    def usage_history(self, request, pk=None):
        """Get usage history for a coupon"""
        coupon = self.get_object()
        usages = CouponUsage.objects.filter(coupon=coupon).select_related('user')
        serializer = CouponUsageSerializer(usages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a coupon"""
        coupon = self.get_object()
        coupon.status = Coupon.Status.DISABLED
        coupon.save()
        return Response({'status': 'deactivated'})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a coupon"""
        coupon = self.get_object()
        coupon.status = Coupon.Status.ACTIVE
        coupon.save()
        return Response({'status': 'activated'})


class RegionalPricingViewSet(viewsets.ModelViewSet):
    """
    CRUD for Regional Pricing.
    Task 34: Set regional pricing
    """
    queryset = RegionalPricing.objects.all()
    serializer_class = RegionalPricingSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        plan_id = self.request.query_params.get('plan_id')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        country = self.request.query_params.get('country')
        if country:
            qs = qs.filter(country_code=country.upper())
        return qs
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def for_country(self, request):
        """Get pricing for a specific country"""
        country_code = request.query_params.get('country', 'US').upper()
        prices = RegionalPricing.objects.filter(
            country_code=country_code, is_active=True
        ).select_related('plan')
        serializer = self.get_serializer(prices, many=True)
        return Response(serializer.data)


class TaxConfigurationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Tax Configuration.
    Task 35: Configure tax rules (VAT, GST)
    """
    queryset = TaxConfiguration.objects.all()
    serializer_class = TaxConfigurationSerializer
    permission_classes = [IsSuperAdmin]
    
    @action(detail=False, methods=['get'])
    def for_country(self, request):
        """Get tax config for a country"""
        country_code = request.query_params.get('country', 'US').upper()
        try:
            tax = TaxConfiguration.objects.get(country_code=country_code, is_active=True)
            return Response(TaxConfigurationSerializer(tax).data)
        except TaxConfiguration.DoesNotExist:
            return Response({'tax_rate': 0, 'tax_type': 'NONE'})


class TrialConfigurationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Trial Configuration.
    Tasks 26-27: Free trial configuration
    """
    queryset = TrialConfiguration.objects.all()
    serializer_class = TrialConfigurationSerializer
    permission_classes = [IsSuperAdmin]
    
    @action(detail=False, methods=['post'])
    def toggle_all(self, request):
        """Enable or disable all trials"""
        enabled = request.data.get('enabled', True)
        TrialConfiguration.objects.update(is_enabled=enabled)
        return Response({'status': 'updated', 'enabled': enabled})
