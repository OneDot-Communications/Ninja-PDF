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
from .serializers import (
    SignupSerializer, 
    UserSerializer, 
    AdminUserUpdateSerializer
)
from .permissions import IsSuperAdmin, IsAdmin

User = get_user_model()

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

@method_decorator(csrf_exempt, name='dispatch')
class CustomLoginView(LoginView):
    def post(self, request, *args, **kwargs):
        # We can add pre-login checks here
        response = super().post(request, *args, **kwargs)
        
        # Check if user is verified after successful authentication
        if response.status_code == 200:
            user = self.user
            
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


class UserSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for users to view and revoke their own sessions.
    """
    permission_classes = [permissions.IsAuthenticated]
    from .serializers import UserSessionSerializer
    serializer_class = UserSessionSerializer
    
    def get_queryset(self):
        from .session_models import UserSession
        return UserSession.objects.filter(user=self.request.user).order_by('-last_active')
    
    def destroy(self, request, *args, **kwargs):
        """Revoke (delete) a session"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "Session revoked successfully"}, status=status.HTTP_200_OK)
