from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from apps.files.models.user_file import UserFile
from apps.files.api.serializers import UserFileSerializer
from django.contrib.auth.hashers import make_password, check_password
import uuid
import logging

from core.services.quota_service import QuotaService
from core.storage import StorageService

logger = logging.getLogger(__name__)

class UserFileViewSet(viewsets.ModelViewSet):
    serializer_class = UserFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserFile.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """Override list to include storage existence check for each file."""
        queryset = self.get_queryset()
        files_data = []
        
        for file_obj in queryset:
            serializer = self.get_serializer(file_obj)
            file_data = serializer.data
            
            # Check if file exists in object storage
            if file_obj.file and file_obj.file.name:
                try:
                    exists_in_storage = default_storage.exists(file_obj.file.name)
                    file_data['exists_in_storage'] = exists_in_storage
                    if not exists_in_storage:
                        logger.warning(f"FileList:STORAGE_MISSING file_id={file_obj.id} path={file_obj.file.name}")
                except Exception as e:
                    logger.error(f"FileList:STORAGE_CHECK_FAILED file_id={file_obj.id} error={e}")
                    file_data['exists_in_storage'] = None  # Unknown
            else:
                file_data['exists_in_storage'] = False
            
            files_data.append(file_data)
        
        return Response(files_data)

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to check file exists in storage."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Check storage existence
        if instance.file and instance.file.name:
            try:
                exists = default_storage.exists(instance.file.name)
                data['exists_in_storage'] = exists
                if not exists:
                    logger.warning(f"FileRetrieve:STORAGE_MISSING file_id={instance.id} path={instance.file.name}")
            except Exception as e:
                logger.error(f"FileRetrieve:STORAGE_CHECK_FAILED file_id={instance.id} error={e}")
                data['exists_in_storage'] = None
        else:
            data['exists_in_storage'] = False
        
        return Response(data)

    def perform_create(self, serializer):
        user = self.request.user
        
        # Handle file upload metadata
        file_obj = self.request.FILES.get('file')
        if not file_obj:
            raise ValueError("No file provided")
        
        size_bytes = file_obj.size
        mime_type = file_obj.content_type
        
        logger.info(f"FileUpload:START user={user.id} file={file_obj.name} size={size_bytes}")
        
        # 1. Check Quota
        QuotaService.check_storage_quota(user, size_bytes)
        
        # Handle password hashing if provided
        password = self.request.data.get('password')
        password_hash = make_password(password) if password else None
        
        # Default name to filename if not provided
        name = self.request.data.get('name')
        if not name:
            name = file_obj.name

        try:
            instance = serializer.save(
                user=user,
                password_hash=password_hash,
                size_bytes=size_bytes,
                mime_type=mime_type,
                name=name,
                status=UserFile.Status.AVAILABLE
            )
            
            # Verify file was uploaded to storage
            if instance.file and instance.file.name:
                storage_exists = default_storage.exists(instance.file.name)
                logger.info(f"FileUpload:STORAGE_CHECK path={instance.file.name} exists={storage_exists}")
            
            # 2. Update Usage
            QuotaService.update_storage_usage(user, size_bytes)
            
            logger.info(f"FileUpload:SUCCESS user={user.id} file_id={instance.id} path={instance.file.name}")
        except Exception as e:
            logger.error(f"FileUpload:FAILED user={user.id} file={file_obj.name} error={e}", exc_info=True)
            raise

    def perform_destroy(self, instance):
        user = self.request.user
        size_bytes = instance.size_bytes
        file_id = instance.id
        file_path = instance.file.name if instance.file else None
        
        logger.info(f"FileDelete:START user={user.id} file_id={file_id} path={file_path}")
        
        try:
            # 1. Delete file from object storage FIRST
            if file_path:
                try:
                    if default_storage.exists(file_path):
                        default_storage.delete(file_path)
                        logger.info(f"FileDelete:STORAGE_DELETED path={file_path}")
                    else:
                        logger.warning(f"FileDelete:STORAGE_NOT_FOUND path={file_path}")
                except Exception as storage_error:
                    logger.error(f"FileDelete:STORAGE_ERROR path={file_path} error={storage_error}", exc_info=True)
                    # Continue with DB deletion even if storage delete fails
            
            # 2. Delete from database
            instance.delete()
            
            # 3. Decrease usage
            QuotaService.update_storage_usage(user, -size_bytes)
            
            logger.info(f"FileDelete:SUCCESS user={user.id} file_id={file_id}")
        except Exception as e:
            logger.error(f"FileDelete:FAILED user={user.id} file_id={file_id} error={e}", exc_info=True)
            raise
        
    @decorators.action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        file = self.get_object()
        password = request.data.get('password')
        if password:
            file.password_hash = make_password(password)
            file.save()
            return Response({'status': 'Password set'})
        return Response({'error': 'Password required'}, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=['post'])
    def remove_password(self, request, pk=None):
        file = self.get_object()
        file.password_hash = None
        file.save()
        return Response({'status': 'Password removed'})

    @decorators.action(detail=True, methods=['get'])
    def check_storage(self, request, pk=None):
        """Check if file exists in object storage."""
        file = self.get_object()
        
        if not file.file or not file.file.name:
            return Response({
                'exists': False,
                'path': None,
                'error': 'No file path stored'
            })
        
        try:
            exists = default_storage.exists(file.file.name)
            return Response({
                'exists': exists,
                'path': file.file.name,
                'url': StorageService.get_signed_url(file.file.name) if exists else None
            })
        except Exception as e:
            logger.error(f"CheckStorage:FAILED file_id={file.id} error={e}")
            return Response({
                'exists': None,
                'path': file.file.name,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PublicFileViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @decorators.action(detail=False, methods=['get'], url_path='info/(?P<token>[^/.]+)')
    def info(self, request, token=None):
        file = get_object_or_404(UserFile, share_token=token)
        file.view_count += 1
        file.save()
        
        # Check if file exists in storage
        exists_in_storage = False
        if file.file and file.file.name:
            try:
                exists_in_storage = default_storage.exists(file.file.name)
            except Exception:
                pass
        
        return Response({
            'name': file.name,
            'size_bytes': file.size_bytes,
            'is_protected': bool(file.password_hash),
            'mime_type': file.mime_type,
            'created_at': file.created_at,
            'exists_in_storage': exists_in_storage
        })

    @decorators.action(detail=False, methods=['post'], url_path='access/(?P<token>[^/.]+)')
    def access(self, request, token=None):
        file = get_object_or_404(UserFile, share_token=token)
        password = request.data.get('password')

        if file.password_hash:
            if not password or not check_password(password, file.password_hash):
                return Response({'error': 'Invalid password'}, status=status.HTTP_403_FORBIDDEN)
        
        # Generate signed URL for DO Spaces access (1 hour expiry)
        try:
            if not file.file or not file.file.name:
                logger.error(f"FileAccess:FAILED token={token} error=No file path stored")
                return Response({'error': 'File not found in storage'}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if file actually exists in storage
            if not default_storage.exists(file.file.name):
                logger.error(f"FileAccess:FAILED token={token} error=File missing from object storage path={file.file.name}")
                return Response({'error': 'File not found in object storage'}, status=status.HTTP_404_NOT_FOUND)
            
            file.download_count += 1
            file.save()
            
            download_url = StorageService.get_signed_url(file.file.name, expiration=3600)
            
            if not download_url:
                logger.error(f"FileAccess:FAILED token={token} error=Could not generate download URL")
                return Response({'error': 'Could not generate download URL'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"FileAccess:SUCCESS token={token} file_id={file.id}")
            
            return Response({
                'url': download_url,
                'name': file.name
            })
        except Exception as e:
            logger.error(f"FileAccess:FAILED token={token} error={e}", exc_info=True)
            return Response({'error': 'Storage error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

