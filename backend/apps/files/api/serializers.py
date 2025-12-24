from rest_framework import serializers
from apps.files.models.user_file import UserFile
from core.storage import StorageService
import logging

logger = logging.getLogger(__name__)

class UserFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    is_protected = serializers.SerializerMethodField()

    class Meta:
        model = UserFile
        fields = [
            'id', 'file', 'name', 'size_bytes', 'mime_type', 'created_at', 
            'is_public', 'share_token', 'download_count', 'view_count',
            'url', 'is_protected'
        ]
        read_only_fields = ['id', 'created_at', 'share_token', 'download_count', 'view_count', 'size_bytes', 'mime_type']
        extra_kwargs = {
            'file': {'write_only': True},
            'name': {'required': False}
        }

    def get_url(self, obj):
        """Generate signed URL for file access from DigitalOcean Spaces."""
        if obj.file and obj.file.name:
            try:
                url = StorageService.get_signed_url(obj.file.name, expiration=3600)
                return url
            except Exception as e:
                logger.error(f"UserFileSerializer:get_url error for file_id={obj.id}: {e}")
                return None
        return None

    def get_is_protected(self, obj):
        return bool(obj.password_hash)
