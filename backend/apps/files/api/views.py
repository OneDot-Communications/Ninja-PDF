from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
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
        
        logger.info(f"FileDelete:START user={user.id} file_id={file_id}")
        
        try:
            instance.delete()
            # Decrease usage
            QuotaService.update_storage_usage(user, -size_bytes)
            logger.info(f"FileDelete:SUCCESS user={user.id} file_id={file_id} path={file_path}")
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

class PublicFileViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @decorators.action(detail=False, methods=['get'], url_path='info/(?P<token>[^/.]+)')
    def info(self, request, token=None):
        file = get_object_or_404(UserFile, share_token=token)
        file.view_count += 1
        file.save()
        
        return Response({
            'name': file.name,
            'size_bytes': file.size_bytes,
            'is_protected': bool(file.password_hash),
            'mime_type': file.mime_type,
            'created_at': file.created_at
        })

    @decorators.action(detail=False, methods=['post'], url_path='access/(?P<token>[^/.]+)')
    def access(self, request, token=None):
        file = get_object_or_404(UserFile, share_token=token)
        password = request.data.get('password')

        if file.password_hash:
            if not password or not check_password(password, file.password_hash):
                return Response({'error': 'Invalid password'}, status=status.HTTP_403_FORBIDDEN)
        
        file.download_count += 1
        file.save()
        
        # Generate signed URL for DO Spaces access (1 hour expiry)
        try:
            if not file.file or not file.file.name:
                logger.error(f"FileAccess:FAILED token={token} error=No file path stored")
                return Response({'error': 'File not found in storage'}, status=status.HTTP_404_NOT_FOUND)
            
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
