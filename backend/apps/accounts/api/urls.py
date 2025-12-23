"""Accounts API URLs"""
from django.urls import path, include
from django.http import HttpResponse
from rest_framework.routers import DefaultRouter
from apps.accounts.api.views import (
    SignupView,
    CustomLoginView,
    CustomLogoutView,
    CustomUserDetailsView,
    CustomUserDetailsView,
    UserAvatarUploadView,
    RefreshTokenWrapper,

    GoogleLogin,
    GoogleRedirectView,
    DataExportView,
    UserManagementViewSet,
    UserSessionViewSet,
    TwoFactorStatusView,
    TwoFactorSetupView,
    TwoFactorEnableView,
    TwoFactorDisableView,
    TwoFactorVerifyView,
    TwoFactorBackupCodesView,
)
from dj_rest_auth.views import UserDetailsView
from apps.accounts.api.views import CustomVerifyEmailView

from rest_framework_simplejwt.views import TokenVerifyView
from dj_rest_auth.jwt_auth import get_refresh_view
from apps.accounts.api.admin_views import (
    AdminStatsView, 
    AdminActivityView, 
    AdminDatabaseStatsView,
    ForceLogoutView,
    BanUserView,
    UnbanUserView,
    ForcePasswordResetView,
    Reset2FAView,
    ChangeUserRoleView,
    PlatformAnalyticsView,
    ToolUsageAnalyticsView,
    JobQueueHealthView,
    ApiUsageAnalyticsView,
    DDoSToggleView,
    ImpersonateUserView,
    FlagUserView,
    UnflagUserView,
    FlaggedUsersListView,
)
from dj_rest_auth.views import (
    PasswordChangeView,
    PasswordResetView,
    PasswordResetConfirmView
)

# GDPR Views (Tasks 97-100)
from apps.accounts.api.gdpr_views import (
    GDPRDataExportView,
    GDPRDataDeleteView,
    GDPRConsentView,
    AdminGDPRDeleteView,
)

# Security Views
from apps.accounts.api.security_views import (
    IPRuleViewSet,
    FailedLoginAttemptViewSet,
    AuditLogViewSet,
    SystemConfigurationViewSet,
)


router = DefaultRouter()
router.register(r'admin/users', UserManagementViewSet, basename='admin-users')
router.register(r'sessions', UserSessionViewSet, basename='user-sessions')

# Security ViewSets
router.register(r'security/ip-rules', IPRuleViewSet, basename='ip-rules')
router.register(r'security/failed-logins', FailedLoginAttemptViewSet, basename='failed-logins')
router.register(r'security/audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'security/system-config', SystemConfigurationViewSet, basename='system-config')

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', CustomLogoutView.as_view(), name='logout'),
    path('user/', CustomUserDetailsView.as_view(), name='rest_user_details'),
    path('users/me/', CustomUserDetailsView.as_view(), name='user-detail'),
    path('users/me/export/', DataExportView.as_view(), name='user-export'),
    path('users/me/avatar/', UserAvatarUploadView.as_view(), name='user-avatar-upload'),
    path('token/refresh/', RefreshTokenWrapper.as_view(), name='token_refresh'),
    
    # dj-rest-auth registration
    path('registration/verify-email/', CustomVerifyEmailView.as_view(), name='rest_verify_email'),
    path('ping/', lambda request: HttpResponse("pong"), name='ping'),
    path('registration/', include('dj_rest_auth.registration.urls')),
    
    # dj-rest-auth password endpoints
    # path('password/', include('dj_rest_auth.urls')), 
    path('password/change/', PasswordChangeView.as_view(), name='rest_password_change'),
    path('password/reset/', PasswordResetView.as_view(), name='rest_password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='rest_password_reset_confirm'), 

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

    # GDPR Compliance Endpoints (Tasks 97-100)
    path('gdpr/export/', GDPRDataExportView.as_view(), name='gdpr-export'),
    path('gdpr/delete/', GDPRDataDeleteView.as_view(), name='gdpr-delete'),
    path('gdpr/consent/', GDPRConsentView.as_view(), name='gdpr-consent'),
    path('admin/gdpr/delete/<int:user_id>/', AdminGDPRDeleteView.as_view(), name='admin-gdpr-delete'),

    # Super Admin: User Actions (Tasks 14-19)
    path('super-admin/users/<int:user_id>/force-logout/', ForceLogoutView.as_view(), name='force-logout'),
    path('super-admin/users/<int:user_id>/ban/', BanUserView.as_view(), name='ban-user'),
    path('super-admin/users/<int:user_id>/unban/', UnbanUserView.as_view(), name='unban-user'),
    path('super-admin/users/<int:user_id>/force-password-reset/', ForcePasswordResetView.as_view(), name='force-password-reset'),
    path('super-admin/users/<int:user_id>/reset-2fa/', Reset2FAView.as_view(), name='reset-2fa'),
    path('super-admin/users/<int:user_id>/change-role/', ChangeUserRoleView.as_view(), name='change-role'),
    path('super-admin/users/<int:user_id>/impersonate/', ImpersonateUserView.as_view(), name='impersonate-user'),
    
    # Super Admin: Analytics Dashboard (Tasks 101-107)
    path('super-admin/analytics/', PlatformAnalyticsView.as_view(), name='platform-analytics'),
    path('super-admin/analytics/tools/', ToolUsageAnalyticsView.as_view(), name='tool-usage-analytics'),
    path('super-admin/analytics/queue/', JobQueueHealthView.as_view(), name='job-queue-health'),
    path('super-admin/analytics/api-usage/', ApiUsageAnalyticsView.as_view(), name='api-usage-analytics'),
    
    # Super Admin: Security (Task 95)
    path('super-admin/security/ddos/', DDoSToggleView.as_view(), name='ddos-protection-toggle'),
    
    # Admin: User Flagging (Phase 2 - Admin Review)
    path('admin/users/<int:user_id>/flag/', FlagUserView.as_view(), name='flag-user'),
    path('admin/users/<int:user_id>/unflag/', UnflagUserView.as_view(), name='unflag-user'),
    path('admin/flagged-users/', FlaggedUsersListView.as_view(), name='flagged-users-list'),

    # ViewSets
    path('', include(router.urls)),
]


