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
    storage_limit = serializers.IntegerField(required=False) # Task 74-82


class SubscriptionSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField()
    plan = PlanSerializer(read_only=True)
    status = serializers.CharField()
    current_period_start = serializers.DateTimeField(read_only=True)
    current_period_end = serializers.DateTimeField(read_only=True)
    stripe_subscription_id = serializers.CharField(allow_blank=True, required=False)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.first_name', read_only=True)


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


from apps.subscriptions.models.subscription import Feature

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name', 'code', 'description', 'category', 'permission_id', 'is_active', 'is_premium_default', 'icon', 'free_limit']
        read_only_fields = ['id', 'category', 'permission_id']



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


class PremiumRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        from apps.subscriptions.models.subscription import PremiumRequest
        model = PremiumRequest
        fields = ['id', 'user', 'user_email', 'proof_file', 'status', 'admin_notes', 'created_at']
        read_only_fields = ['status', 'admin_notes', 'created_at']
