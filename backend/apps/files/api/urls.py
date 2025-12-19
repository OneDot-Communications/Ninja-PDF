from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.files.api.views import UserFileViewSet, PublicFileViewSet
from apps.files.api.cloud_views import (
    ListProvidersView,
    ListConnectionsView,
    InitiateOAuthView,
    OAuthCallbackView,
    DisconnectCloudView,
    ListCloudFilesView,
    ImportFromCloudView,
    ExportToCloudView,
    SyncHistoryView,
)

router = DefaultRouter()
router.register(r'', UserFileViewSet, basename='files')
router.register(r'share', PublicFileViewSet, basename='share-files')

urlpatterns = [
    path('', include(router.urls)),
    
    # Cloud Storage Integration (Premium)
    path('cloud/providers/', ListProvidersView.as_view(), name='cloud-providers'),
    path('cloud/connections/', ListConnectionsView.as_view(), name='cloud-connections'),
    path('cloud/connect/<str:provider_type>/', InitiateOAuthView.as_view(), name='cloud-connect'),
    path('cloud/callback/', OAuthCallbackView.as_view(), name='cloud-callback'),
    path('cloud/<int:connection_id>/disconnect/', DisconnectCloudView.as_view(), name='cloud-disconnect'),
    path('cloud/<int:connection_id>/files/', ListCloudFilesView.as_view(), name='cloud-files'),
    path('cloud/<int:connection_id>/import/', ImportFromCloudView.as_view(), name='cloud-import'),
    path('cloud/<int:connection_id>/export/', ExportToCloudView.as_view(), name='cloud-export'),
    path('cloud/<int:connection_id>/history/', SyncHistoryView.as_view(), name='cloud-history'),
]

