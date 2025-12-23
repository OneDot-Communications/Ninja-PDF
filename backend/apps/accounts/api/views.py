from rest_framework import status, generics, viewsets, permissions, serializers, filters
import os
from django.shortcuts import redirect
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from dj_rest_auth.views import LoginView
from dj_rest_auth.registration.views import SocialLoginView, RegisterView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from rest_framework.exceptions import PermissionDenied
from apps.accounts.api.serializers import (
    SignupSerializer, 
    UserSerializer, 
    AdminUserUpdateSerializer
)
from apps.accounts.services.permissions import IsSuperAdmin, IsAdmin
try:
    from django_otp import devices_for_user
    from django_otp.plugins.otp_totp.models import TOTPDevice
    OTP_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    devices_for_user = None
    TOTPDevice = None
    OTP_AVAILABLE = False
from io import BytesIO
import base64

User = get_user_model()


class CustomVerifyEmailView(APIView):
    """
    Custom email verification using simple UUID tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        from apps.accounts.models import EmailVerificationToken
        from allauth.account.models import EmailAddress
        
        key = request.data.get('key')
        if not key:
            return Response({'detail': 'Key is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Look up token
        try:
            token = EmailVerificationToken.objects.get(token=key)
        except (EmailVerificationToken.DoesNotExist, ValueError):
            return Response({'detail': 'Invalid or expired verification link.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if still valid
        if not token.is_valid():
            return Response({'detail': 'Verification link has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark email as verified
        user = token.user
        EmailAddress.objects.filter(user=user, email=user.email).update(verified=True)
        
        # Mark token as used
        token.mark_used()
        
        return Response({'detail': 'Email verified successfully!'}, status=status.HTTP_200_OK)

class DataExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Request data export."""
        user = request.user
        # Trigger async task in real world.
        # Here we just send the email with a mock link.
        from core.services.email_service import EmailService
        
        # Mock link
        link = f"{os.getenv('FRONTEND_HOST', 'https://18pluspdf.com')}/api/users/export/{user.id}/download"
        EmailService.send_data_export_ready(user, link)
        
        return Response({'status': 'Export started. You will receive an email shortly.'})

class SignupView(RegisterView):
    # Using dj-rest-auth's RegisterView which handles signal sending for email verification
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # Intercept data to handle single-password submission
        data = request.data.copy()
        if 'password' in data and 'password1' not in data:
            data['password1'] = data['password']
            data['password2'] = data['password']
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        return Response(
            self.get_response_data(user),
            status=status.HTTP_201_CREATED,
            headers=headers
        )

# VerifyOTPView REMOVED - Using dj-rest-auth's VerifyEmailView (via urls)

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import throttling
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken
from dj_rest_auth.views import UserDetailsView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class CustomUserDetailsView(UserDetailsView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

class UserAvatarUploadView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.avatar.delete(save=False) # delete file from storage
        user.avatar = None
        user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

from apps.accounts.models.audit import AuthAuditLog
from apps.accounts.services.cookie_utils import set_auth_cookies, clear_auth_cookies


class LoginRateThrottle(throttling.SimpleRateThrottle):
    scope = 'login'

    def get_cache_key(self, request, view):
        # Use IP + identifier to limit brute force attempts
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR', '')
        ident = request.data.get('email', '')
        return f"throttle_login:{ip}:{ident}"


class OTPRateThrottle(throttling.SimpleRateThrottle):
    scope = 'otp'

    def get_cache_key(self, request, view):
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR', '')
        ident = request.user.email if request.user and request.user.is_authenticated else ip
        return f"throttle_otp:{ip}:{ident}"


@method_decorator(csrf_exempt, name='dispatch')
class CustomLoginView(LoginView):
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        # Check if 2FA token is provided
        otp_token = request.data.get('otp_token')
        
        # First, attempt login
        response = super().post(request, *args, **kwargs)

        # If login failed, log audit and increment failure counter
        if response.status_code != 200:
            # log failed attempt
            try:
                email = request.data.get('email')
            except Exception:
                email = None
            AuthAuditLog.objects.create(
                user=None,
                event_type=AuthAuditLog.Event.FAILED_LOGIN,
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'email': email}
            )

            # Increment failure counter and possibly lock
            if email:
                key = f"auth:failed:{email}"
                failures = cache.get(key, 0) + 1
                cache.set(key, failures, 60 * 60)  # 1 hour window
                LOCK_THRESHOLD = 10
                if failures >= LOCK_THRESHOLD:
                    cache.set(f"auth:lockout:{email}", True, 60 * 60)
                    # Send account lock notification
                    try:
                        from django.core.mail import send_mail
                        send_mail(
                            subject='Account locked',
                            message='Your account has been temporarily locked due to multiple failed login attempts. Please reset your password or contact support.',
                            from_email=None,
                            recipient_list=[email],
                            fail_silently=True,
                        )
                    except Exception:
                        pass

            # Check if failure is due to unverified email
            if email:
                try:
                    user_obj = User.objects.get(email=email)
                    # Check if verified (using our custom field or allauth)
                    from allauth.account.models import EmailAddress
                    email_address = EmailAddress.objects.filter(user=user_obj, email=email).first()
                    
                    if email_address and not email_address.verified:
                         # Auto-resend verification email
                         from allauth.account.utils import send_email_confirmation
                         send_email_confirmation(request, user_obj)
                         
                         return Response({
                             'error': {
                                 'code': 'email_not_verified', 
                                 'message': 'Email not verified. A new verification link has been sent to your inbox.'
                             }
                         }, status=403)
                except Exception:
                    pass

            return response

        if response.status_code == 200:
            user = self.user

            # Check account lockout via cache
            email = getattr(user, 'email', None)
            if email and cache.get(f"auth:lockout:{email}"):
                return Response({'error': {'code': 'account_locked', 'message': 'Account locked due to too many failed attempts'}}, status=423)

            # Check if 2FA is enabled. If confirmed devices exist, the frontend
            # must submit an `otp_token` alongside the credentials. If the
            # token is omitted, return `{ requires_2fa: True }` (HTTP 200) so the
            # client can prompt the user for the OTP and resubmit.
            if not OTP_AVAILABLE:
                # OTP support is not installed on this deployment
                # treat as not requiring 2FA
                otp_devices = []
            else:
                # devices_for_user returns an iterator/generator. Testing the
                # generator object truthiness is always True, so materialize it
                # into a list before checking for presence.
                otp_devices = list(devices_for_user(user, confirmed=True))
            if otp_devices:
                # 2FA required
                if not otp_token:
                    return Response({
                        'detail': '2FA token required',
                        'requires_2fa': True
                    }, status=200)
                
                # Verify token
                verified = False
                for device in otp_devices:
                    if device.verify_token(otp_token):
                        verified = True
                        break
                
                if not verified:
                    AuthAuditLog.objects.create(
                        user=user,
                        event_type=AuthAuditLog.Event.FAILED_2FA,
                        ip_address=request.META.get('REMOTE_ADDR', ''),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    )
                    return Response({'error': {'code': 'invalid_2fa', 'message': 'Invalid 2FA token'}}, status=400)

            # --- FORTRESS SECURITY UPGRADE ---
            from apps.accounts.models.session import UserSession
            from apps.accounts.services.security_utils import get_client_ip, get_device_fingerprint
            
            current_fingerprint = get_device_fingerprint(request)
            client_ip = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
            
            # Check for New Device Login (Security Alert)
            # If user has logged in before, but not with this fingerprint
            if UserSession.objects.filter(user=user).exists() and not UserSession.objects.filter(user=user, device_fingerprint=current_fingerprint).exists():
                from django.core.mail import send_mail
                try:
                    send_mail(
                        subject='Security Alert: New Login to 18+ PDF',
                        message=f"Hello {user.email},\n\nWe detected a new login to your account.\n\nTime: {os.environ.get('TZ', 'UTC')}\nIP Address: {client_ip}\nDevice: {user_agent}\n\nIf this was you, you can ignore this email.\nIf not, please reset your password immediately.\n\n18+ PDF Security Team",
                        from_email=None, #/settings.DEFAULT_FROM_EMAIL
                        recipient_list=[user.email],
                        fail_silently=True
                    )
                except Exception:
                    pass

            session = UserSession.objects.create(
                user=user,
                ip_address=client_ip,
                user_agent=user_agent,
                device_fingerprint=current_fingerprint
            )
            # -------------------------------

            # Audit log success
            AuthAuditLog.objects.create(
                user=user,
                event_type=AuthAuditLog.Event.SUCCESSFUL_LOGIN,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

            # Generate and set secure cookies for JWT tokens (explicitly)
            refresh = RefreshToken.for_user(user)
            # Embed session_id into the token payload
            refresh['session_id'] = str(session.id)
            
            access = refresh.access_token
            access['session_id'] = str(session.id)

            set_auth_cookies(response, str(access), str(refresh), request)
            
            # CRITICAL: Update the response data with the new tokens so the frontend uses them
            if hasattr(response, 'data') and isinstance(response.data, dict):
                response.data['access'] = str(access)
                response.data['refresh'] = str(refresh)
                if 'user' not in response.data:
                    from apps.accounts.api.serializers import UserSerializer
                    response.data['user'] = UserSerializer(user).data

        return response

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    # Frontend callback page for Google login
    @property
    def callback_url(self):
        return os.getenv('FRONTEND_HOST', 'http://127.0.0.1:3000') + '/auth/google/callback'
    client_class = OAuth2Client

class GoogleRedirectView(APIView):
    """
    Redirects GET requests for /api/auth/google/ to the allauth provider start URL
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        frontend_callback = os.getenv('FRONTEND_HOST', 'http://127.0.0.1:3000') + '/auth/google/callback'
        # Explicitly start the login process
        redirect_url = f"/accounts/google/login/?process=login&next={frontend_callback}"
        return redirect(redirect_url)

class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAdmin] 
    filter_backends = [filters.SearchFilter]
    search_fields = ['email', 'first_name', 'last_name']
    from rest_framework.pagination import PageNumberPagination
    class StandardResultsSetPagination(PageNumberPagination):
        page_size = 10
        page_size_query_param = 'page_size'
        max_page_size = 100
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Roles.SUPER_ADMIN:
             return User.objects.all()
        return User.objects.exclude(role=User.Roles.SUPER_ADMIN)
    
    def perform_destroy(self, instance):
        if self.request.user.role != User.Roles.SUPER_ADMIN:
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Only Super Admin can delete users.")
        super().perform_destroy(instance)


from rest_framework.decorators import action
from apps.accounts.services.security_utils import get_device_fingerprint

class UserSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for users to view and revoke their own sessions.
    """
    permission_classes = [permissions.IsAuthenticated]
    from apps.accounts.api.serializers import UserSessionSerializer
    serializer_class = UserSessionSerializer
    
    def get_queryset(self):
        from apps.accounts.models.session import UserSession
        return UserSession.objects.filter(user=self.request.user).order_by('-last_activity')
    
    def destroy(self, request, *args, **kwargs):
        """Revoke (delete) a session"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "Session revoked successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def revoke_others(self, request):
        """Revoke all sessions except the current one"""
        from apps.accounts.models.session import UserSession
        
        # Helper to safely get session_id from token
        current_session_id = None
        current_fingerprint = get_device_fingerprint(request) # Always get fingerprint for fallback/debug

        try:
            # request.auth is the AccessToken object
            # Debug logging
            print(f"DEBUG: revoke_others user={request.user.email} auth_type={type(request.auth)} auth={request.auth}")
            
            if request.auth and (isinstance(request.auth, dict) or hasattr(request.auth, 'get')):
                 current_session_id = request.auth.get('session_id')
                 print(f"DEBUG: Found session_id in token: {current_session_id}")
            else:
                 print("DEBUG: No session_id in token")
        except Exception as e:
            print(f"DEBUG: Error extracting session_id: {e}")
            pass

        if current_session_id:
            # Precise revocation using session_id
            count, _ = UserSession.objects.filter(user=request.user).exclude(id=current_session_id).delete()
            print(f"DEBUG: Revoked {count} sessions using session_id exclusion. Kept {current_session_id}")
        else:
            # Fallback legacy behavior (device fingerprint)
            count, _ = UserSession.objects.filter(user=request.user).exclude(device_fingerprint=current_fingerprint).delete()
            print(f"DEBUG: Revoked {count} sessions using fingerprint exclusion. Kept fingerprint {current_fingerprint}")
        
        return Response({"message": f"Revoked {count} other sessions"}, status=status.HTTP_200_OK)


class TwoFactorStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def get(self, request):
        if not OTP_AVAILABLE:
            return Response({'enabled': False, 'available': False})
        devices = devices_for_user(request.user)
        enabled = any(device.confirmed for device in devices)
        return Response({'enabled': enabled, 'available': True})


class TwoFactorSetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def get(self, request):
        if not OTP_AVAILABLE:
            return Response({'error': '2FA not available on this deployment'}, status=501)

        # Delete any existing unconfirmed devices
        TOTPDevice.objects.filter(user=request.user, confirmed=False).delete()
        
        # Create unconfirmed device
        device = TOTPDevice.objects.create(user=request.user, name='default', confirmed=False)
        
        # Generate provisioning URI
        provisioning_uri = device.config_url
        
        # Generate QR code if library available
        try:
            import qrcode
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            img = qr.make_image(fill='black', back_color='white')

            # Convert to base64
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        except Exception:
            qr_code_base64 = None
        
        # Generate backup codes and persist their hashes
        from apps.accounts.models.twofactor_backup import TwoFactorBackupCode
        codes = TwoFactorBackupCode.generate_codes(10)
        # remove existing codes
        TwoFactorBackupCode.objects.filter(user=request.user).delete()
        for c in codes:
            TwoFactorBackupCode.objects.create(user=request.user, code_hash=TwoFactorBackupCode.hash_code(c))

        return Response({
            'secret': device.bin_key.hex(),
            'provisioning_uri': provisioning_uri,
            'qr_code': f'data:image/png;base64,{qr_code_base64}',
            'backup_codes': codes  # plaintext codes shown once
        })


class TwoFactorEnableView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token required'}, status=400)
        if not OTP_AVAILABLE:
            return Response({'error': '2FA not available on this deployment'}, status=501)

        # devices_for_user returns a generator; convert to list so we can index
        devices = list(devices_for_user(request.user, confirmed=False))
        if not devices:
            return Response({'error': 'No 2FA setup in progress'}, status=400)

        device = devices[0]
        if device.verify_token(token):
            device.confirmed = True
            device.save()
            AuthAuditLog.objects.create(
                user=request.user,
                event_type=AuthAuditLog.Event.ENABLE_2FA,
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
            return Response({'message': '2FA enabled'})
        else:
            return Response({'error': 'Invalid token'}, status=400)


class TwoFactorDisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        if not OTP_AVAILABLE:
            return Response({'error': '2FA not available on this deployment'}, status=501)

        devices = devices_for_user(request.user, confirmed=True)
        for device in devices:
            device.delete()
        AuthAuditLog.objects.create(
            user=request.user,
            event_type=AuthAuditLog.Event.DISABLE_2FA,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        return Response({'message': '2FA disabled'})


class TwoFactorVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        token = request.data.get('token')
        backup = request.data.get('backup_code')
        if not token:
            if not backup:
                return Response({'error': 'Token required'}, status=400)
            # attempt backup code
            from apps.accounts.models.twofactor_backup import TwoFactorBackupCode
            try:
                # ensure at least one unused code exists
                _ = TwoFactorBackupCode.objects.get(user=request.user, used=False)
            except TwoFactorBackupCode.DoesNotExist:
                return Response({'error': 'Invalid backup code'}, status=400)
            # find a matching unused code
            matched = None
            for c in TwoFactorBackupCode.objects.filter(user=request.user, used=False):
                if c.check_code(backup):
                    matched = c
                    break
            if not matched:
                return Response({'error': 'Invalid backup code'}, status=400)
            matched.used = True
            matched.save()
            AuthAuditLog.objects.create(
                user=request.user,
                event_type=AuthAuditLog.Event.SUCCESSFUL_LOGIN,
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'via': 'backup_code'}
            )
            return Response({'message': 'Verified via backup code'})

        # If token provided, verify against confirmed devices
        devices = devices_for_user(request.user, confirmed=True)
        for device in devices:
            if device.verify_token(token):
                return Response({'message': 'Verified'})
        return Response({'error': 'Invalid token'}, status=400)


class TwoFactorBackupCodesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.accounts.models.twofactor_backup import TwoFactorBackupCode
        codes = TwoFactorBackupCode.objects.filter(user=request.user, used=False)
        masked = [c.code_hash[-6:] for c in codes]  # cannot reveal full hash; provide counts/ids
        return Response({'available': len(codes), 'masked': masked})

    def post(self, request):
        # Regenerate new codes - require current password for confirmation
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response({'error': 'Password required for regeneration'}, status=400)
        from apps.accounts.models.twofactor_backup import TwoFactorBackupCode
        TwoFactorBackupCode.objects.filter(user=request.user).delete()
        codes = TwoFactorBackupCode.generate_codes(10)
        for c in codes:
            TwoFactorBackupCode.objects.create(user=request.user, code_hash=TwoFactorBackupCode.hash_code(c))
        AuthAuditLog.objects.create(
            user=request.user,
            event_type=AuthAuditLog.Event.ENABLE_2FA,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={'action': 'regenerated_backup_codes'}
        )
        return Response({'backup_codes': codes})


class CustomLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Log logout
        try:
            AuthAuditLog.objects.create(
                user=request.user,
                event_type=AuthAuditLog.Event.LOGOUT,
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
        except Exception:
            pass

        response = Response({'detail': 'Logged out'}, status=200)
        clear_auth_cookies(response)
        return response


class RefreshTokenWrapper(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Delegate to the provided refresh view, then ensure cookies are set securely.
        view = get_refresh_view()
        response = view.as_view()(request._request, *args, **kwargs)
        # If JSON with tokens, set cookies explicitly
        try:
            data = response.data
            access = data.get('access')
            refresh = data.get('refresh')
            if access and refresh:
                set_auth_cookies(response, access, refresh, request)
        except Exception:
            pass
        return response
