"""
Cloud Storage API Views

Complete API for cloud storage operations including OAuth flow,
file import/export, and folder browsing.
"""
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers
from django.shortcuts import redirect
from django.conf import settings
import secrets

from apps.files.models.cloud_storage import CloudProvider, CloudConnection, CloudSyncJob
from apps.files.services.cloud_storage import CloudStorageService, CloudSyncService
from apps.files.models import FileAsset


class CloudProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloudProvider
        fields = ['id', 'name', 'provider_type', 'is_active', 'max_file_size_mb']


class CloudConnectionSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    provider_type = serializers.CharField(source='provider.provider_type', read_only=True)
    is_expired = serializers.BooleanField(source='is_token_expired', read_only=True)
    
    class Meta:
        model = CloudConnection
        fields = [
            'id', 'provider_name', 'provider_type', 'account_email', 
            'account_name', 'status', 'is_expired', 'last_sync_at',
            'auto_sync_enabled', 'default_folder_path', 'created_at'
        ]


class CloudSyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloudSyncJob
        fields = [
            'id', 'direction', 'remote_name', 'status', 
            'progress', 'error_message', 'created_at', 'completed_at'
        ]


class ListProvidersView(APIView):
    """List available cloud storage providers."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Premium check
        if not request.user.is_premium:
            return Response(
                {'error': 'Cloud storage is a premium feature'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        providers = CloudProvider.objects.filter(is_active=True)
        serializer = CloudProviderSerializer(providers, many=True)
        return Response({'providers': serializer.data})


class ListConnectionsView(APIView):
    """List user's connected cloud accounts."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_premium:
            return Response(
                {'error': 'Cloud storage is a premium feature'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        connections = CloudConnection.objects.filter(
            user=request.user
        ).select_related('provider')
        
        serializer = CloudConnectionSerializer(connections, many=True)
        return Response({'connections': serializer.data})


class InitiateOAuthView(APIView):
    """Start OAuth flow for a cloud provider."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, provider_type):
        if not request.user.is_premium:
            return Response(
                {'error': 'Cloud storage is a premium feature'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)
        
        # Store state in session
        request.session[f'cloud_oauth_state_{provider_type}'] = state
        request.session[f'cloud_oauth_provider'] = provider_type
        
        # Build callback URL
        callback_url = request.build_absolute_uri(f'/api/files/cloud/callback/')
        
        try:
            auth_url = CloudStorageService.get_auth_url(
                provider_type=provider_type,
                redirect_uri=callback_url,
                state=state
            )
            return Response({'auth_url': auth_url})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class OAuthCallbackView(APIView):
    """Handle OAuth callback from cloud provider."""
    permission_classes = [permissions.AllowAny]  # OAuth callback
    
    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')
        
        if error:
            return redirect(f'{settings.FRONTEND_URL}/settings/cloud?error={error}')
        
        if not code:
            return redirect(f'{settings.FRONTEND_URL}/settings/cloud?error=no_code')
        
        # Get provider from session
        provider_type = request.session.get('cloud_oauth_provider')
        expected_state = request.session.get(f'cloud_oauth_state_{provider_type}')
        
        # Verify state
        if state != expected_state:
            return redirect(f'{settings.FRONTEND_URL}/settings/cloud?error=invalid_state')
        
        # Exchange code for token
        callback_url = request.build_absolute_uri('/api/files/cloud/callback/')
        
        try:
            token_data = CloudStorageService.exchange_code_for_token(
                provider_type=provider_type,
                code=code,
                redirect_uri=callback_url
            )
            
            provider = CloudProvider.objects.get(provider_type=provider_type)
            
            # Create or update connection
            connection, created = CloudConnection.objects.update_or_create(
                user=request.user,
                provider=provider,
                defaults={
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', ''),
                    'status': CloudConnection.Status.ACTIVE,
                }
            )
            
            # Calculate token expiry
            if 'expires_in' in token_data:
                from django.utils import timezone
                from datetime import timedelta
                connection.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                connection.save()
            
            # Get user info
            try:
                user_info = CloudStorageService.get_user_info(connection)
                connection.account_email = user_info.get('email', '')
                connection.account_name = user_info.get('name', '')
                connection.account_id = user_info.get('account_id', '')
                connection.save()
            except:
                pass
            
            # Clean up session
            request.session.pop(f'cloud_oauth_state_{provider_type}', None)
            request.session.pop('cloud_oauth_provider', None)
            
            return redirect(f'{settings.FRONTEND_URL}/settings/cloud?connected={provider_type}')
            
        except Exception as e:
            return redirect(f'{settings.FRONTEND_URL}/settings/cloud?error={str(e)}')


class DisconnectCloudView(APIView):
    """Disconnect a cloud storage account."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, connection_id):
        try:
            connection = CloudConnection.objects.get(
                id=connection_id,
                user=request.user
            )
            connection.delete()
            return Response({'success': True, 'message': 'Cloud account disconnected'})
        except CloudConnection.DoesNotExist:
            return Response(
                {'error': 'Connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ListCloudFilesView(APIView):
    """List files in a cloud folder."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, connection_id):
        folder_id = request.GET.get('folder_id')
        
        try:
            connection = CloudConnection.objects.get(
                id=connection_id,
                user=request.user
            )
        except CloudConnection.DoesNotExist:
            return Response(
                {'error': 'Connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            files = CloudStorageService.list_files(connection, folder_id)
            return Response({'files': files})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImportFromCloudView(APIView):
    """Import a file from cloud storage."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, connection_id):
        file_id = request.data.get('file_id')
        file_name = request.data.get('file_name')
        
        if not file_id or not file_name:
            return Response(
                {'error': 'file_id and file_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            connection = CloudConnection.objects.get(
                id=connection_id,
                user=request.user
            )
        except CloudConnection.DoesNotExist:
            return Response(
                {'error': 'Connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            file_asset = CloudSyncService.import_file(
                connection=connection,
                remote_file_id=file_id,
                remote_name=file_name,
                user=request.user
            )
            
            return Response({
                'success': True,
                'file_id': str(file_asset.uuid),
                'name': file_asset.name,
                'size': file_asset.size_bytes,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportToCloudView(APIView):
    """Export a file to cloud storage."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, connection_id):
        file_uuid = request.data.get('file_id')
        folder_id = request.data.get('folder_id')
        
        if not file_uuid:
            return Response(
                {'error': 'file_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            connection = CloudConnection.objects.get(
                id=connection_id,
                user=request.user
            )
        except CloudConnection.DoesNotExist:
            return Response(
                {'error': 'Connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            file_asset = FileAsset.objects.get(uuid=file_uuid, user=request.user)
        except FileAsset.DoesNotExist:
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            result = CloudSyncService.export_file(
                connection=connection,
                file_asset=file_asset,
                folder_id=folder_id
            )
            
            return Response({
                'success': True,
                'remote_id': result.get('id'),
                'remote_name': result.get('name'),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SyncHistoryView(APIView):
    """Get sync history for a connection."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, connection_id):
        try:
            connection = CloudConnection.objects.get(
                id=connection_id,
                user=request.user
            )
        except CloudConnection.DoesNotExist:
            return Response(
                {'error': 'Connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        sync_jobs = CloudSyncJob.objects.filter(
            connection=connection
        ).order_by('-created_at')[:50]
        
        serializer = CloudSyncJobSerializer(sync_jobs, many=True)
        return Response({'history': serializer.data})
