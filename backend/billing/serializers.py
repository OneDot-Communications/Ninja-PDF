from rest_framework import serializers
from .models import Plan, Subscription, Invoice, BusinessDetails, Feature, UserFeatureOverride

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = '__all__'

class UserFeatureOverrideSerializer(serializers.ModelSerializer):
    feature_code = serializers.SlugField(source='feature.code', read_only=True)
    
    class Meta:
        model = UserFeatureOverride
        fields = ['id', 'user', 'feature', 'feature_code', 'is_enabled']

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = PlanSerializer(source='plan', read_only=True)
    
    class Meta:
        model = Subscription
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'

class BusinessDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessDetails
        fields = '__all__'

from .models import Payment
class PaymentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
