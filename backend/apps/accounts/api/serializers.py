from rest_framework import serializers
from apps.accounts.models import User
from dj_rest_auth.registration.serializers import SocialLoginSerializer

from dj_rest_auth.registration.serializers import RegisterSerializer

class SignupSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    referral_code = serializers.CharField(required=False, allow_blank=True) # Add field
    username = serializers.CharField(required=False, allow_blank=True)

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
        
        # Handle referral
        ref_code = self.validated_data.get('referral_code')
        if ref_code:
            try:
                # Format: REF-{id}-{ABC}
                # Extract ID
                import re
                match = re.search(r'REF-(\d+)-', ref_code)
                if match:
                    referrer_id = match.group(1)
                    from apps.accounts.models import User
                    from apps.subscriptions.models import Referral
                    referrer = User.objects.get(id=referrer_id)
                    if referrer != user:
                        # Fix: Model field is 'referred_user', not 'referee'
                        Referral.objects.create(referrer=referrer, referred_user=user, status='PENDING')
                        
                        # Send Viral Loop Email to Referrer
                        from django.core.mail import send_mail
                        from django.conf import settings
                        try:
                            send_mail(
                                subject='You earned a reward! New Referral',
                                message=f"Hello {referrer.email},\n\nGreat news! Your friend {user.first_name or user.email} just joined 18+ PDF using your referral link.\n\nOnce they subscribe to a plan, you will receive your reward.\n\nKeep sharing!\n\n18+ PDF Team",
                                from_email=settings.DEFAULT_FROM_EMAIL,
                                recipient_list=[referrer.email],
                                fail_silently=True
                            )
                        except Exception:
                            pass
            except Exception as e:
                # Log error but don't fail signup
                print(f"Referral Error: {e}")
            except Exception as e:
                # Log error but don't fail signup
                print(f"Referral Error: {e}")


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class UserSerializer(serializers.ModelSerializer):
    storage_used = serializers.SerializerMethodField()
    storage_limit = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'role',
            'subscription_tier',
            'avatar', 
            'is_verified', 
            'date_joined',
            'storage_used', 
            'storage_limit'
        )
        read_only_fields = ('email', 'role', 'subscription_tier', 'date_joined')

    def get_storage_used(self, obj):
        if hasattr(obj, 'subscription'):
            return obj.subscription.storage_used
        return 0

    def get_storage_limit(self, obj):
        from core.services.quota_service import QuotaService
        _, limit = QuotaService.get_storage_quota(obj)
        return limit

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
    is_current = serializers.SerializerMethodField()
    browser = serializers.SerializerMethodField()
    os = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = ['id', 'user_email', 'ip_address', 'device_fingerprint', 'is_active', 'created_at', 'last_activity', 'is_current', 'browser', 'os']
        read_only_fields = ['id', 'created_at', 'last_activity']

    def get_is_current(self, obj):
        request = self.context.get('request')
        if not request:
            return False
            
        # 1. Try match by session_id in token (New Secure Way)
        if request.auth and (isinstance(request.auth, dict) or hasattr(request.auth, 'get')):
            token_session_id = request.auth.get('session_id')
            if token_session_id:
                return str(obj.id) == str(token_session_id)
        
        # 2. Fallback match by device fingerprint (Old Way - not precise)
        from apps.accounts.services.security_utils import get_device_fingerprint
        current_fp = get_device_fingerprint(request)
        return obj.device_fingerprint == current_fp

    def get_browser(self, obj):
        # Simple extraction from user_agent (could be improved with ua-parser)
        ua = obj.user_agent.lower()
        if 'chrome' in ua: return 'Chrome'
        if 'firefox' in ua: return 'Firefox'
        if 'safari' in ua: return 'Safari'
        if 'edge' in ua: return 'Edge'
        return 'Browser'

    def get_os(self, obj):
        ua = obj.user_agent.lower()
        if 'windows' in ua: return 'Windows'
        if 'mac' in ua: return 'MacOS'
        if 'linux' in ua: return 'Linux'
        if 'android' in ua: return 'Android'
        if 'iphone' in ua: return 'iOS'
        return 'Device'

class CustomLoginSerializer(LoginSerializer):
    username = None # Disable username field
    
    def get_fields(self):
        fields = super().get_fields()
        if 'username' in fields:
            del fields['username']
        return fields
