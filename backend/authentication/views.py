from rest_framework import status, generics, viewsets, permissions
import os
from django.shortcuts import redirect
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from dj_rest_auth.views import LoginView
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from .serializers import (
    SignupSerializer, 
    VerifyOTPSerializer, 
    UserSerializer, 
    AdminUserUpdateSerializer
)
from .utils import generate_otp, verify_otp_code
from .permissions import IsSuperAdmin, IsAdmin

User = get_user_model()

class SignupView(generics.CreateAPIView):
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate and Send OTP. generate_otp returns whether email was sent.
        otp_sent = generate_otp(user)
        
        return Response({
            "message": "User created successfully. Please verify your email.",
            "email": user.email,
            "otp_sent": bool(otp_sent)
        }, status=status.HTTP_201_CREATED)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if verify_otp_code(user, otp_code):
            user.is_verified = True
            user.save()
            return Response({"message": "Email verified successfully. You can now login."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class CustomLoginView(LoginView):
    def post(self, request, *args, **kwargs):
        # We can add pre-login checks here
        response = super().post(request, *args, **kwargs)
        
        # Check if user is verified after successful authentication
        if response.status_code == 200:
            user = self.user
            if not user.is_verified:
                return Response(
                    {"error": "Email not verified. Please verify your OTP."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # --- FORTRESS SECURITY UPGRADE ---
            # Create a Session Record
            from .session_models import UserSession
            from .security_utils import get_client_ip, get_device_fingerprint

            UserSession.objects.create(
                user=user,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                device_fingerprint=get_device_fingerprint(request)
            )
            # -------------------------------

        return response

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    # Frontend callback page for Google login
    callback_url = "http://127.0.0.1:3000/auth/google/callback"
    client_class = OAuth2Client

    def post(self, request, *args, **kwargs):
        print("GoogleLogin: received POST for token exchange")
        print("POST body:", request.data)
        return super().post(request, *args, **kwargs)


class GoogleRedirectView(APIView):
    """
    Redirects GET requests for /api/auth/google/ to the allauth provider start URL
    (which is typically /accounts/google/login/) so the browser can start the OAuth flow.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # Redirect to allauth provider login route. We intentionally include a `next` param
        # that points back to the frontend callback so that after provider auth completes
        # the user is sent to the frontend.
        # Note: allauth will handle real provider redirect logic.
        frontend_callback = os.getenv('FRONTEND_HOST', 'http://127.0.0.1:3000') + '/auth/google/callback'
        print(f"GoogleRedirectView: redirecting to allauth provider with next={frontend_callback}")
        # Ensure we explicitly start the login process (not connect), and include the frontend callback.
        redirect_url = f"/accounts/google/login/?process=login&next={frontend_callback}"
        return redirect(redirect_url)

class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAdmin] # Or IsSuperAdmin depending on strictness

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Roles.SUPER_ADMIN:
             return User.objects.all()
        # Admins cannot see/edit Super Admins
        return User.objects.exclude(role=User.Roles.SUPER_ADMIN)
    
    def perform_destroy(self, instance):
        # Admins cannot delete users, only Super Admin can (optional rule)
        if self.request.user.role != User.Roles.SUPER_ADMIN:
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Only Super Admin can delete users.")
        super().perform_destroy(instance)


class UserSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for users to view and revoke their own sessions.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from .session_models import UserSession
        # Users can only see their own sessions
        return UserSession.objects.filter(user=self.request.user).order_by('-last_active')
    
    def get_serializer_class(self):
        from rest_framework import serializers
        from .session_models import UserSession
        
        class UserSessionSerializer(serializers.ModelSerializer):
            class Meta:
                model = UserSession
                fields = ['id', 'ip_address', 'user_agent', 'device_fingerprint', 'created_at', 'last_active']
                read_only_fields = fields
        
        return UserSessionSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Revoke (delete) a session"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "Session revoked successfully"}, status=status.HTTP_200_OK)
