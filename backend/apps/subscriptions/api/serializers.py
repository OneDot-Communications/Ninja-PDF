"""Subscriptions API Serializers"""
from rest_framework import serializers


class PlanSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    stripe_price_id = serializers.CharField(allow_blank=True, required=False)
    features = serializers.JSONField(required=False)
    is_active = serializers.BooleanField()


class SubscriptionSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField()
    plan = PlanSerializer(read_only=True)
    status = serializers.CharField()
    current_period_start = serializers.DateTimeField(read_only=True)
    current_period_end = serializers.DateTimeField(read_only=True)
    stripe_subscription_id = serializers.CharField(allow_blank=True, required=False)


class InvoiceSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField()
    subscription_id = serializers.IntegerField(allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    status = serializers.CharField()
    stripe_invoice_id = serializers.CharField(allow_blank=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)


class FeatureSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_blank=True)


class UserFeatureOverrideSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField()
    feature = FeatureSerializer(read_only=True)
    is_enabled = serializers.BooleanField()


class BusinessDetailsSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField()
    business_name = serializers.CharField()
    address = serializers.CharField()
    tax_id = serializers.CharField(allow_blank=True, required=False)


class PaymentSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField()
    plan = PlanSerializer(read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    status = serializers.CharField()
    razorpay_order_id = serializers.CharField(allow_blank=True, required=False)
    razorpay_payment_id = serializers.CharField(allow_blank=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)


class ReferralSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    referrer_id = serializers.IntegerField()
    referee_id = serializers.IntegerField(allow_null=True)
    code = serializers.CharField()
    status = serializers.CharField()
    reward_granted = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
