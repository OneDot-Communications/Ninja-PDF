from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SignupView, 
    CustomLoginView, 
    GoogleLogin, 
    GoogleRedirectView, 
    UserManagementViewSet,
    UserSessionViewSet
)
from dj_rest_auth.views import LogoutView, UserDetailsView
from rest_framework_simplejwt.views import TokenVerifyView
from dj_rest_auth.jwt_auth import get_refresh_view
from .admin_views import AdminStatsView, AdminActivityView, AdminDatabaseStatsView


router = DefaultRouter()
router.register(r'admin/users', UserManagementViewSet, basename='admin-users')
router.register(r'sessions', UserSessionViewSet, basename='user-sessions')

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('user/', UserDetailsView.as_view(), name='user_details'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('token/refresh/', get_refresh_view().as_view(), name='token_refresh'),
    
    # dj-rest-auth registration (includes verify-email/)
    path('registration/', include('dj_rest_auth.registration.urls')),
    
    # dj-rest-auth includes password reset/change endpoints
    path('password/', include('dj_rest_auth.urls')), 

    # Social Auth
    path('google/', GoogleRedirectView.as_view(), name='google_login_redirect'),
    path('google/token/', GoogleLogin.as_view(), name='google_login_token'),

    # Admin Stats & Ops
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/activity/', AdminActivityView.as_view(), name='admin-activity'),
    path('admin/database/', AdminDatabaseStatsView.as_view(), name='admin-database'),

    # ViewSets
    path('', include(router.urls)),
]
