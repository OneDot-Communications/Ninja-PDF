"""Coupon and Pricing API Serializers"""
from rest_framework import serializers
from apps.subscriptions.models import (
    Coupon, CouponUsage, RegionalPricing, TaxConfiguration, TrialConfiguration, Plan
)


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for Coupon model"""
    is_valid = serializers.BooleanField(read_only=True)
    applicable_plans = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.all(), many=True, required=False
    )
    
    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'name', 'description',
            'discount_type', 'discount_value',
            'valid_from', 'valid_until',
            'max_uses', 'times_used', 'max_uses_per_user',
            'minimum_order_amount', 'applicable_plans', 'new_users_only',
            'stripe_coupon_id', 'status', 'is_valid',
            'created_at', 'created_by'
        ]
        read_only_fields = ['id', 'times_used', 'created_at', 'created_by', 'is_valid']


class CouponUsageSerializer(serializers.ModelSerializer):
    """Serializer for CouponUsage model"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    
    class Meta:
        model = CouponUsage
        fields = [
            'id', 'coupon', 'coupon_code', 'user', 'user_email',
            'used_at', 'order_amount', 'discount_applied'
        ]
        read_only_fields = ['id', 'used_at']


class RegionalPricingSerializer(serializers.ModelSerializer):
    """Serializer for Regional Pricing"""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = RegionalPricing
        fields = [
            'id', 'plan', 'plan_name', 'country_code', 'country_name',
            'currency', 'price', 'stripe_price_id', 'is_active'
        ]
        read_only_fields = ['id']


class TaxConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for Tax Configuration"""
    
    class Meta:
        model = TaxConfiguration
        fields = [
            'id', 'country_code', 'country_name', 'tax_type',
            'tax_rate', 'tax_id_required', 'reverse_charge_applicable',
            'stripe_tax_id', 'is_active'
        ]
        read_only_fields = ['id']


class TrialConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for Trial Configuration"""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = TrialConfiguration
        fields = [
            'id', 'plan', 'plan_name', 'trial_days', 'is_enabled',
            'requires_payment_method', 'allow_multiple_trials'
        ]
        read_only_fields = ['id']


class CouponValidationSerializer(serializers.Serializer):
    """Validate a coupon code"""
    code = serializers.CharField(max_length=50)
    plan_id = serializers.IntegerField(required=False)
    
    def validate_code(self, value):
        try:
            coupon = Coupon.objects.get(code=value.upper())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code")
        
        if not coupon.is_valid:
            raise serializers.ValidationError("Coupon is expired or exhausted")
        
        return value


class ApplyCouponSerializer(serializers.Serializer):
    """Apply a coupon to a subscription"""
    code = serializers.CharField(max_length=50)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2)
