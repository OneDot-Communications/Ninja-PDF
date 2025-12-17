"""
Cloud Storage Service

Complete implementation for Google Drive, Dropbox, OneDrive integrations.
Handles OAuth flows, file upload/download, and folder management.
"""
import logging
import requests
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.files.storage import default_storage
from urllib.parse import urlencode

from apps.files.models.cloud_storage import CloudProvider, CloudConnection, CloudSyncJob

logger = logging.getLogger(__name__)


class CloudStorageService:
    """Base service for cloud storage operations."""
    
    PROVIDERS = {
        'GOOGLE_DRIVE': {
            'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url': 'https://oauth2.googleapis.com/token',
            'api_base': 'https://www.googleapis.com/drive/v3',
            'scopes': ['https://www.googleapis.com/auth/drive.file'],
        },
        'DROPBOX': {
            'auth_url': 'https://www.dropbox.com/oauth2/authorize',
            'token_url': 'https://api.dropboxapi.com/oauth2/token',
            'api_base': 'https://api.dropboxapi.com/2',
            'scopes': [],
        },
        'ONEDRIVE': {
            'auth_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            'token_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            'api_base': 'https://graph.microsoft.com/v1.0',
            'scopes': ['Files.ReadWrite', 'offline_access'],
        },
    }
    
    @classmethod
    def get_auth_url(cls, provider_type: str, redirect_uri: str, state: str = '') -> str:
        """
        Generate OAuth authorization URL for a provider.
        
        Args:
            provider_type: GOOGLE_DRIVE, DROPBOX, or ONEDRIVE
            redirect_uri: OAuth callback URL
            state: State parameter for security
        
        Returns:
            Authorization URL to redirect user to
        """
        try:
            provider = CloudProvider.objects.get(provider_type=provider_type, is_active=True)
        except CloudProvider.DoesNotExist:
            raise ValueError(f"Provider {provider_type} not configured")
        
        config = cls.PROVIDERS.get(provider_type, {})
        
        params = {
            'client_id': provider.client_id,
            'redirect_uri': redirect_uri or provider.redirect_uri,
            'response_type': 'code',
            'state': state,
        }
        
        if provider_type == 'GOOGLE_DRIVE':
            params['scope'] = ' '.join(config['scopes'])
            params['access_type'] = 'offline'
            params['prompt'] = 'consent'
        elif provider_type == 'DROPBOX':
            params['token_access_type'] = 'offline'
        elif provider_type == 'ONEDRIVE':
            params['scope'] = ' '.join(config['scopes'])
        
        return f"{config['auth_url']}?{urlencode(params)}"
    
    @classmethod
    def exchange_code_for_token(cls, provider_type: str, code: str, redirect_uri: str) -> dict:
        """
        Exchange authorization code for access token.
        
        Args:
            provider_type: Provider type
            code: Authorization code from OAuth callback
            redirect_uri: Same redirect URI used in auth request
        
        Returns:
            Token response dict
        """
        try:
            provider = CloudProvider.objects.get(provider_type=provider_type, is_active=True)
        except CloudProvider.DoesNotExist:
            raise ValueError(f"Provider {provider_type} not configured")
        
        config = cls.PROVIDERS.get(provider_type, {})
        
        data = {
            'client_id': provider.client_id,
            'client_secret': provider.client_secret,
            'code': code,
            'redirect_uri': redirect_uri or provider.redirect_uri,
            'grant_type': 'authorization_code',
        }
        
        response = requests.post(config['token_url'], data=data, timeout=30)
        response.raise_for_status()
        
        return response.json()
    
    @classmethod
    def refresh_access_token(cls, connection: CloudConnection) -> bool:
        """
        Refresh OAuth access token for a connection.
        
        Args:
            connection: CloudConnection instance
        
        Returns:
            True if refresh successful
        """
        if not connection.refresh_token:
            logger.error(f"No refresh token for connection {connection.id}")
            return False
        
        provider = connection.provider
        config = cls.PROVIDERS.get(provider.provider_type, {})
        
        data = {
            'client_id': provider.client_id,
            'client_secret': provider.client_secret,
            'refresh_token': connection.refresh_token,
            'grant_type': 'refresh_token',
        }
        
        try:
            response = requests.post(config['token_url'], data=data, timeout=30)
            response.raise_for_status()
            token_data = response.json()
            
            connection.access_token = token_data['access_token']
            connection.token_expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
            
            # Some providers return new refresh token
            if 'refresh_token' in token_data:
                connection.refresh_token = token_data['refresh_token']
            
            connection.status = CloudConnection.Status.ACTIVE
            connection.error_message = ''
            connection.save()
            
            return True
            
        except requests.RequestException as e:
            logger.error(f"Token refresh failed for connection {connection.id}: {e}")
            connection.status = CloudConnection.Status.EXPIRED
            connection.error_message = str(e)
            connection.save()
            return False
    
    @classmethod
    def ensure_valid_token(cls, connection: CloudConnection) -> bool:
        """
        Ensure connection has a valid access token, refreshing if needed.
        
        Args:
            connection: CloudConnection instance
        
        Returns:
            True if token is valid
        """
        if not connection.is_token_expired:
            return True
        
        return cls.refresh_access_token(connection)
    
    @classmethod
    def get_user_info(cls, connection: CloudConnection) -> dict:
        """Get user info from cloud provider."""
        if not cls.ensure_valid_token(connection):
            raise ValueError("Cannot get valid token")
        
        provider_type = connection.provider.provider_type
        headers = {'Authorization': f'Bearer {connection.access_token}'}
        
        if provider_type == 'GOOGLE_DRIVE':
            response = requests.get(
                'https://www.googleapis.com/drive/v3/about?fields=user',
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return {
                'email': data.get('user', {}).get('emailAddress'),
                'name': data.get('user', {}).get('displayName'),
            }
        
        elif provider_type == 'DROPBOX':
            response = requests.post(
                'https://api.dropboxapi.com/2/users/get_current_account',
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return {
                'email': data.get('email'),
                'name': data.get('name', {}).get('display_name'),
                'account_id': data.get('account_id'),
            }
        
        elif provider_type == 'ONEDRIVE':
            response = requests.get(
                'https://graph.microsoft.com/v1.0/me',
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return {
                'email': data.get('mail') or data.get('userPrincipalName'),
                'name': data.get('displayName'),
            }
        
        return {}
    
    @classmethod
    def list_files(cls, connection: CloudConnection, folder_id: str = None, limit: int = 100) -> list:
        """
        List files in a cloud folder.
        
        Args:
            connection: CloudConnection instance
            folder_id: Folder ID to list (None for root)
            limit: Max files to return
        
        Returns:
            List of file dicts
        """
        if not cls.ensure_valid_token(connection):
            raise ValueError("Cannot get valid token")
        
        provider_type = connection.provider.provider_type
        headers = {'Authorization': f'Bearer {connection.access_token}'}
        
        if provider_type == 'GOOGLE_DRIVE':
            params = {
                'pageSize': limit,
                'fields': 'files(id,name,mimeType,size,modifiedTime)',
            }
            if folder_id:
                params['q'] = f"'{folder_id}' in parents"
            else:
                params['q'] = "'root' in parents"
            
            response = requests.get(
                'https://www.googleapis.com/drive/v3/files',
                headers=headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            return [{
                'id': f['id'],
                'name': f['name'],
                'is_folder': f['mimeType'] == 'application/vnd.google-apps.folder',
                'size': f.get('size'),
                'modified': f.get('modifiedTime'),
            } for f in data.get('files', [])]
        
        elif provider_type == 'DROPBOX':
            json_data = {
                'path': folder_id or '',
                'limit': limit,
            }
            response = requests.post(
                'https://api.dropboxapi.com/2/files/list_folder',
                headers={**headers, 'Content-Type': 'application/json'},
                json=json_data,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            return [{
                'id': f['id'],
                'name': f['name'],
                'path': f['path_display'],
                'is_folder': f['.tag'] == 'folder',
                'size': f.get('size'),
            } for f in data.get('entries', [])]
        
        elif provider_type == 'ONEDRIVE':
            if folder_id:
                url = f'https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}/children'
            else:
                url = 'https://graph.microsoft.com/v1.0/me/drive/root/children'
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            return [{
                'id': f['id'],
                'name': f['name'],
                'is_folder': 'folder' in f,
                'size': f.get('size'),
                'modified': f.get('lastModifiedDateTime'),
            } for f in data.get('value', [])]
        
        return []
    
    @classmethod
    def download_file(cls, connection: CloudConnection, file_id: str) -> bytes:
        """
        Download a file from cloud storage.
        
        Args:
            connection: CloudConnection instance
            file_id: Remote file ID
        
        Returns:
            File content as bytes
        """
        if not cls.ensure_valid_token(connection):
            raise ValueError("Cannot get valid token")
        
        provider_type = connection.provider.provider_type
        headers = {'Authorization': f'Bearer {connection.access_token}'}
        
        if provider_type == 'GOOGLE_DRIVE':
            response = requests.get(
                f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media',
                headers=headers,
                timeout=300
            )
            response.raise_for_status()
            return response.content
        
        elif provider_type == 'DROPBOX':
            response = requests.post(
                'https://content.dropboxapi.com/2/files/download',
                headers={
                    **headers,
                    'Dropbox-API-Arg': f'{{"path": "{file_id}"}}'
                },
                timeout=300
            )
            response.raise_for_status()
            return response.content
        
        elif provider_type == 'ONEDRIVE':
            # Get download URL first
            meta_response = requests.get(
                f'https://graph.microsoft.com/v1.0/me/drive/items/{file_id}',
                headers=headers,
                timeout=30
            )
            meta_response.raise_for_status()
            download_url = meta_response.json().get('@microsoft.graph.downloadUrl')
            
            response = requests.get(download_url, timeout=300)
            response.raise_for_status()
            return response.content
        
        raise ValueError(f"Unsupported provider: {provider_type}")
    
    @classmethod
    def upload_file(cls, connection: CloudConnection, file_content: bytes, filename: str, folder_id: str = None) -> dict:
        """
        Upload a file to cloud storage.
        
        Args:
            connection: CloudConnection instance
            file_content: File content as bytes
            filename: Desired filename
            folder_id: Destination folder ID (None for root)
        
        Returns:
            Dict with file ID and other metadata
        """
        if not cls.ensure_valid_token(connection):
            raise ValueError("Cannot get valid token")
        
        provider_type = connection.provider.provider_type
        headers = {'Authorization': f'Bearer {connection.access_token}'}
        
        if provider_type == 'GOOGLE_DRIVE':
            import json
            metadata = {'name': filename}
            if folder_id:
                metadata['parents'] = [folder_id]
            
            # Use multipart upload
            boundary = '-------314159265358979323846'
            body = (
                f'--{boundary}\r\n'
                f'Content-Type: application/json; charset=UTF-8\r\n\r\n'
                f'{json.dumps(metadata)}\r\n'
                f'--{boundary}\r\n'
                f'Content-Type: application/octet-stream\r\n\r\n'
            ).encode() + file_content + f'\r\n--{boundary}--'.encode()
            
            response = requests.post(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                headers={
                    **headers,
                    'Content-Type': f'multipart/related; boundary={boundary}',
                },
                data=body,
                timeout=300
            )
            response.raise_for_status()
            data = response.json()
            return {'id': data['id'], 'name': data.get('name')}
        
        elif provider_type == 'DROPBOX':
            import json
            path = f"/{filename}" if not folder_id else f"{folder_id}/{filename}"
            response = requests.post(
                'https://content.dropboxapi.com/2/files/upload',
                headers={
                    **headers,
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': json.dumps({'path': path, 'mode': 'add'}),
                },
                data=file_content,
                timeout=300
            )
            response.raise_for_status()
            data = response.json()
            return {'id': data['id'], 'path': data['path_display'], 'name': data['name']}
        
        elif provider_type == 'ONEDRIVE':
            if folder_id:
                url = f'https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}:/{filename}:/content'
            else:
                url = f'https://graph.microsoft.com/v1.0/me/drive/root:/{filename}:/content'
            
            response = requests.put(
                url,
                headers={
                    **headers,
                    'Content-Type': 'application/octet-stream',
                },
                data=file_content,
                timeout=300
            )
            response.raise_for_status()
            data = response.json()
            return {'id': data['id'], 'name': data.get('name'), 'url': data.get('webUrl')}
        
        raise ValueError(f"Unsupported provider: {provider_type}")


class CloudSyncService:
    """Service for syncing files with cloud storage."""
    
    @classmethod
    def import_file(cls, connection: CloudConnection, remote_file_id: str, remote_name: str, user) -> 'FileAsset':
        """
        Import a file from cloud storage to local storage.
        
        Args:
            connection: CloudConnection instance
            remote_file_id: Remote file ID
            remote_name: Filename
            user: User instance
        
        Returns:
            Created FileAsset
        """
        from apps.files.models import FileAsset
        
        # Create sync job
        sync_job = CloudSyncJob.objects.create(
            connection=connection,
            direction=CloudSyncJob.Direction.DOWNLOAD,
            remote_file_id=remote_file_id,
            remote_name=remote_name,
            status=CloudSyncJob.Status.IN_PROGRESS,
            started_at=timezone.now(),
        )
        
        try:
            # Download file
            content = CloudStorageService.download_file(connection, remote_file_id)
            
            # Create file asset
            file_asset = FileAsset.objects.create(
                user=user,
                name=remote_name,
                original_name=remote_name,
                size_bytes=len(content),
                status=FileAsset.Status.UPLOADED,
            )
            
            # Save to storage
            import io
            path = f'uploads/{user.id}/{file_asset.uuid}/{remote_name}'
            default_storage.save(path, io.BytesIO(content))
            file_asset.storage_path = path
            file_asset.save()
            
            # Update sync job
            sync_job.local_file = file_asset
            sync_job.status = CloudSyncJob.Status.COMPLETED
            sync_job.completed_at = timezone.now()
            sync_job.progress = 100
            sync_job.save()
            
            # Update connection stats
            connection.last_sync_at = timezone.now()
            connection.save()
            
            return file_asset
            
        except Exception as e:
            sync_job.status = CloudSyncJob.Status.FAILED
            sync_job.error_message = str(e)
            sync_job.completed_at = timezone.now()
            sync_job.save()
            raise
    
    @classmethod
    def export_file(cls, connection: CloudConnection, file_asset: 'FileAsset', folder_id: str = None) -> dict:
        """
        Export a local file to cloud storage.
        
        Args:
            connection: CloudConnection instance
            file_asset: FileAsset to export
            folder_id: Destination folder ID
        
        Returns:
            Dict with remote file info
        """
        # Create sync job
        sync_job = CloudSyncJob.objects.create(
            connection=connection,
            direction=CloudSyncJob.Direction.UPLOAD,
            local_file=file_asset,
            status=CloudSyncJob.Status.IN_PROGRESS,
            started_at=timezone.now(),
        )
        
        try:
            # Read local file
            with default_storage.open(file_asset.storage_path, 'rb') as f:
                content = f.read()
            
            # Upload to cloud
            result = CloudStorageService.upload_file(
                connection,
                content,
                file_asset.name,
                folder_id
            )
            
            # Update sync job
            sync_job.remote_file_id = result.get('id', '')
            sync_job.remote_name = result.get('name', file_asset.name)
            sync_job.status = CloudSyncJob.Status.COMPLETED
            sync_job.completed_at = timezone.now()
            sync_job.progress = 100
            sync_job.save()
            
            # Update connection stats
            connection.last_sync_at = timezone.now()
            connection.save()
            
            return result
            
        except Exception as e:
            sync_job.status = CloudSyncJob.Status.FAILED
            sync_job.error_message = str(e)
            sync_job.completed_at = timezone.now()
            sync_job.save()
            raise
