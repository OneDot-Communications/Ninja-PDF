"""Cloud Storage API - Google Drive, Dropbox, OneDrive Integrations"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from django.utils import timezone

from apps.files.models import CloudProvider, CloudConnection, CloudSyncJob


class CloudProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloudProvider
        fields = [
            'id', 'name', 'provider_type',
            'max_file_size_mb', 'allowed_file_types',
            'is_active', 'icon'
        ]
        read_only_fields = ['id']


class CloudProviderAdminSerializer(serializers.ModelSerializer):
    """Full serializer with OAuth credentials for admin"""
    class Meta:
        model = CloudProvider
        fields = [
            'id', 'name', 'provider_type',
            'client_id', 'client_secret', 'redirect_uri',
            'auth_url', 'token_url', 'api_base_url',
            'scopes', 'max_file_size_mb', 'allowed_file_types',
            'is_active', 'icon'
        ]
        read_only_fields = ['id']


class CloudConnectionSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    provider_type = serializers.CharField(source='provider.provider_type', read_only=True)
    is_token_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CloudConnection
        fields = [
            'id', 'provider', 'provider_name', 'provider_type',
            'account_email', 'account_name',
            'default_folder_path', 'auto_sync_enabled', 'sync_direction',
            'status', 'is_token_expired', 'last_sync_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'account_email', 'account_name', 'status', 'last_sync_at', 'created_at', 'updated_at']


class CloudSyncJobSerializer(serializers.ModelSerializer):
    connection_provider = serializers.CharField(source='connection.provider.name', read_only=True)
    
    class Meta:
        model = CloudSyncJob
        fields = [
            'id', 'connection', 'connection_provider', 'direction',
            'local_path', 'remote_path', 'remote_name',
            'status', 'progress', 'error_message',
            'started_at', 'completed_at', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'progress', 'started_at', 'completed_at', 'created_at']


class CloudProviderViewSet(viewsets.ModelViewSet):
    """
    CRUD for Cloud Providers (Admin only for full access).
    Tasks 89-90: Enable/disable cloud integrations
    """
    queryset = CloudProvider.objects.all()
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        from core.views import IsSuperAdmin
        return [IsSuperAdmin()]
    
    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == 'SUPER_ADMIN':
            return CloudProviderAdminSerializer
        return CloudProviderSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_authenticated or self.request.user.role == 'USER':
            qs = qs.filter(is_active=True)
        return qs
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle provider active status"""
        provider = self.get_object()
        provider.is_active = not provider.is_active
        provider.save()
        return Response({'is_active': provider.is_active})


class CloudConnectionViewSet(viewsets.ModelViewSet):
    """
    User's cloud storage connections.
    Tasks 185-189: Google Drive, Dropbox, OneDrive integrations
    """
    serializer_class = CloudConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CloudConnection.objects.filter(user=self.request.user).select_related('provider')
    
    @action(detail=False, methods=['post'])
    def connect(self, request):
        """Initiate OAuth connection to a cloud provider"""
        provider_id = request.data.get('provider_id')
        if not provider_id:
            return Response({'error': 'provider_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            provider = CloudProvider.objects.get(id=provider_id, is_active=True)
        except CloudProvider.DoesNotExist:
            return Response({'error': 'Provider not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Build OAuth authorization URL
        import urllib.parse
        
        params = {
            'client_id': provider.client_id,
            'redirect_uri': provider.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(provider.scopes) if provider.scopes else '',
            'state': f"{request.user.id}:{provider.id}",  # For callback verification
            'access_type': 'offline',  # Get refresh token
            'prompt': 'consent'
        }
        
        auth_url = f"{provider.auth_url}?{urllib.parse.urlencode(params)}"
        
        return Response({
            'auth_url': auth_url,
            'provider': provider.name
        })
    
    @action(detail=False, methods=['post'])
    def callback(self, request):
        """Handle OAuth callback and store tokens"""
        code = request.data.get('code')
        state = request.data.get('state')
        
        if not code or not state:
            return Response({'error': 'Missing code or state'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_id, provider_id = state.split(':')
            if int(user_id) != request.user.id:
                return Response({'error': 'Invalid state'}, status=status.HTTP_400_BAD_REQUEST)
            
            provider = CloudProvider.objects.get(id=provider_id)
        except (ValueError, CloudProvider.DoesNotExist):
            return Response({'error': 'Invalid state'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Exchange code for tokens (simplified - real implementation needs proper OAuth flow)
        import requests as http_requests
        
        token_data = {
            'client_id': provider.client_id,
            'client_secret': provider.client_secret,
            'code': code,
            'redirect_uri': provider.redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        try:
            response = http_requests.post(provider.token_url, data=token_data, timeout=30)
            tokens = response.json()
            
            if 'error' in tokens:
                return Response({'error': tokens.get('error_description', 'Token exchange failed')}, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate token expiry
            expires_in = tokens.get('expires_in', 3600)
            expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)
            
            # Create or update connection
            connection, created = CloudConnection.objects.update_or_create(
                user=request.user,
                provider=provider,
                defaults={
                    'access_token': tokens.get('access_token'),
                    'refresh_token': tokens.get('refresh_token', ''),
                    'token_expires_at': expires_at,
                    'status': 'ACTIVE'
                }
            )
            
            return Response({
                'status': 'connected',
                'connection_id': connection.id,
                'provider': provider.name
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        """Disconnect from cloud provider"""
        connection = self.get_object()
        connection.status = 'REVOKED'
        connection.access_token = ''
        connection.refresh_token = ''
        connection.save()
        return Response({'status': 'disconnected'})
    
    @action(detail=True, methods=['post'])
    def refresh_token(self, request, pk=None):
        """Refresh OAuth token"""
        connection = self.get_object()
        
        if not connection.refresh_token:
            return Response({'error': 'No refresh token available'}, status=status.HTTP_400_BAD_REQUEST)
        
        import requests as http_requests
        
        provider = connection.provider
        token_data = {
            'client_id': provider.client_id,
            'client_secret': provider.client_secret,
            'refresh_token': connection.refresh_token,
            'grant_type': 'refresh_token'
        }
        
        try:
            response = http_requests.post(provider.token_url, data=token_data, timeout=30)
            tokens = response.json()
            
            if 'error' in tokens:
                connection.status = 'EXPIRED'
                connection.save()
                return Response({'error': 'Token refresh failed'}, status=status.HTTP_400_BAD_REQUEST)
            
            expires_in = tokens.get('expires_in', 3600)
            connection.access_token = tokens.get('access_token')
            connection.token_expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)
            connection.status = 'ACTIVE'
            connection.save()
            
            return Response({'status': 'refreshed'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """List files from cloud storage"""
        connection = self.get_object()
        folder_id = request.query_params.get('folder_id', 'root')
        
        if connection.is_token_expired:
            return Response({'error': 'Token expired, please refresh'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Provider-specific file listing (simplified)
        import requests as http_requests
        
        provider = connection.provider
        headers = {'Authorization': f'Bearer {connection.access_token}'}
        
        try:
            if provider.provider_type == 'GOOGLE_DRIVE':
                url = f"https://www.googleapis.com/drive/v3/files?q='{folder_id}'+in+parents"
                response = http_requests.get(url, headers=headers, timeout=30)
                data = response.json()
                files = data.get('files', [])
                
            elif provider.provider_type == 'DROPBOX':
                url = "https://api.dropboxapi.com/2/files/list_folder"
                response = http_requests.post(url, headers=headers, json={'path': folder_id if folder_id != 'root' else ''}, timeout=30)
                data = response.json()
                files = data.get('entries', [])
                
            elif provider.provider_type == 'ONEDRIVE':
                url = f"https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}/children"
                response = http_requests.get(url, headers=headers, timeout=30)
                data = response.json()
                files = data.get('value', [])
                
            else:
                files = []
            
            return Response({'files': files})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def upload(self, request, pk=None):
        """Upload a file to cloud storage"""
        connection = self.get_object()
        file = request.FILES.get('file')
        folder_id = request.data.get('folder_id', 'root')
        
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create sync job
        job = CloudSyncJob.objects.create(
            connection=connection,
            direction='UPLOAD',
            local_path=file.name,
            remote_path=folder_id,
            remote_name=file.name,
            status='PENDING'
        )
        
        # In production, this would be async via Celery
        # For now, return the job ID
        return Response({
            'job_id': job.id,
            'status': 'queued',
            'message': 'Upload queued. Check job status for progress.'
        })


class CloudSyncJobViewSet(viewsets.ReadOnlyModelViewSet):
    """View sync job status"""
    serializer_class = CloudSyncJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CloudSyncJob.objects.filter(
            connection__user=self.request.user
        ).select_related('connection', 'connection__provider').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending sync job"""
        job = self.get_object()
        if job.status == 'PENDING':
            job.status = 'FAILED'
            job.error_message = 'Cancelled by user'
            job.save()
            return Response({'status': 'cancelled'})
        return Response({'error': 'Can only cancel pending jobs'}, status=status.HTTP_400_BAD_REQUEST)
