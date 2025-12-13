from rest_framework import serializers
from .models import User
from dj_rest_auth.registration.serializers import SocialLoginSerializer

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name')

    def create(self, validated_data):
        # Pop optional name fields so they can be passed via extra_fields
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        user = User.objects.create_user(
            email=validated_data.get('email'),
            password=validated_data.get('password'),
            first_name=first_name,
            last_name=last_name,
            is_active=True,  # User is active but not verified
            is_verified=False
        )
        return user

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'role',
            'subscription_tier',
            'is_verified',
            'avatar',
            'phone_number',
            'country',
            'timezone',
        )
        read_only_fields = ('role', 'subscription_tier', 'is_verified')

class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer to allow admins to update user roles and tiers.
    """
    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'subscription_tier', 'is_active')
        read_only_fields = ('email',)

class GoogleLoginSerializer(SocialLoginSerializer):
    # Overriding if needed, else using default from dj-rest-auth
    pass

from dj_rest_auth.serializers import LoginSerializer as DefaultLoginSerializer

class CustomLoginSerializer(DefaultLoginSerializer):
    username = None # Disable username field
    
    def get_fields(self):
        fields = super().get_fields()
        if 'username' in fields:
            del fields['username']
        return fields
