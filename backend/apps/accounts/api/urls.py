"""Accounts API URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.accounts.api.views import (
    SignupView, 
    CustomLoginView, 
    GoogleLogin, 
    GoogleRedirectView, 
    UserManagementViewSet,
    UserSessionViewSet,
    TwoFactorStatusView,
    TwoFactorSetupView,
    TwoFactorEnableView,
    TwoFactorDisableView,
    TwoFactorVerifyView,
    TwoFactorBackupCodesView,
    RefreshTokenWrapper
)
from dj_rest_auth.views import UserDetailsView
from apps.accounts.api.views import CustomLogoutView
from rest_framework_simplejwt.views import TokenVerifyView
from dj_rest_auth.jwt_auth import get_refresh_view
from apps.accounts.api.admin_views import AdminStatsView, AdminActivityView, AdminDatabaseStatsView


router = DefaultRouter()
router.register(r'admin/users', UserManagementViewSet, basename='admin-users')
router.register(r'sessions', UserSessionViewSet, basename='user-sessions')

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', CustomLogoutView.as_view(), name='logout'),
    path('user/', UserDetailsView.as_view(), name='user_details'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('token/refresh/', RefreshTokenWrapper.as_view(), name='token_refresh'),
    
    # dj-rest-auth registration
    path('registration/', include('dj_rest_auth.registration.urls')),
    
    # dj-rest-auth password endpoints
    path('password/', include('dj_rest_auth.urls')), 

    # Social Auth
    path('google/', GoogleRedirectView.as_view(), name='google_login_redirect'),
    path('google/token/', GoogleLogin.as_view(), name='google_login_token'),

    # Admin endpoints
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/activity/', AdminActivityView.as_view(), name='admin-activity'),
    path('admin/database/', AdminDatabaseStatsView.as_view(), name='admin-database'),

    # 2FA endpoints
    path('2fa/status/', TwoFactorStatusView.as_view(), name='2fa-status'),
    path('2fa/setup/', TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('2fa/enable/', TwoFactorEnableView.as_view(), name='2fa-enable'),
    path('2fa/disable/', TwoFactorDisableView.as_view(), name='2fa-disable'),
    path('2fa/verify/', TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('2fa/backup_codes/', TwoFactorBackupCodesView.as_view(), name='2fa-backup-codes'),
    path('2fa/backup_codes/regenerate/', TwoFactorBackupCodesView.as_view(), name='2fa-backup-codes-regenerate'),

    # ViewSets
    path('', include(router.urls)),
]
