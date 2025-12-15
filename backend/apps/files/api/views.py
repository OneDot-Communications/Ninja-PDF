from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.files.models.user_file import UserFile
from apps.files.api.serializers import UserFileSerializer
from django.contrib.auth.hashers import make_password, check_password
import uuid

from core.services.quota_service import QuotaService

class UserFileViewSet(viewsets.ModelViewSet):
    serializer_class = UserFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserFile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        
        # Handle file upload metadata
        file_obj = self.request.FILES.get('file')
        size_bytes = file_obj.size if file_obj else 0
        mime_type = file_obj.content_type if file_obj else ''
        
        # 1. Check Quota
        QuotaService.check_storage_quota(user, size_bytes)
        
        # Handle password hashing if provided
        password = self.request.data.get('password')
        password_hash = make_password(password) if password else None
        
        # Default name to filename if not provided
        name = self.request.data.get('name')
        if not name and file_obj:
            name = file_obj.name

        serializer.save(
            user=user,
            password_hash=password_hash,
            size_bytes=size_bytes,
            mime_type=mime_type,
            name=name,
            status=UserFile.Status.AVAILABLE
        )
        
        # 2. Update Usage
        QuotaService.update_storage_usage(user, size_bytes)

    def perform_destroy(self, instance):
        user = self.request.user
        size_bytes = instance.size_bytes
        instance.delete()
        # Decrease usage
        QuotaService.update_storage_usage(user, -size_bytes)
        
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
        
        return Response({
            'url': file.file.url,
            'name': file.name
        })
