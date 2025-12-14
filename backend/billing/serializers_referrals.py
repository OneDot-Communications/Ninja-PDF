from rest_framework import serializers
from .models import Referral
from authentication.serializers import UserSerializer

class ReferralSerializer(serializers.ModelSerializer):
    referred_user = UserSerializer(read_only=True)
    
    class Meta:
        model = Referral
        fields = ['id', 'referrer', 'referred_user', 'status', 'reward_granted', 'created_at']
