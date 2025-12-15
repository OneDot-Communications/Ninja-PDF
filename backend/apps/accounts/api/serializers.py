from rest_framework import serializers
from apps.accounts.models import User
from dj_rest_auth.registration.serializers import SocialLoginSerializer

from dj_rest_auth.registration.serializers import RegisterSerializer

class SignupSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True) # Explicitly define password
    
    def validate_username(self, username):
        # Do nothing, username is not required
        return None

    def save(self, request):
        return super().save(request)

    def custom_signup(self, request, user):
        # This hook is called by RegisterSerializer.save()
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save()


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
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'subscription_tier', 'is_active', 'is_verified', 'date_joined')
        read_only_fields = ('email',)

class GoogleLoginSerializer(SocialLoginSerializer):
    # Overriding if needed, else using default from dj-rest-auth
    pass

from dj_rest_auth.serializers import LoginSerializer
from apps.accounts.models.session import UserSession

class UserSessionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserSession
        fields = ['id', 'user_email', 'ip_address', 'device_fingerprint', 'is_active', 'created_at', 'last_activity']
        read_only_fields = ['id', 'created_at', 'last_activity']

class CustomLoginSerializer(LoginSerializer):
    username = None # Disable username field
    
    def get_fields(self):
        fields = super().get_fields()
        if 'username' in fields:
            del fields['username']
        return fields
