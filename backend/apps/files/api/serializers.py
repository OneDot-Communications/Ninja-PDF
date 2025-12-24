from rest_framework import serializers
from apps.files.models.user_file import UserFile
from core.storage import StorageService

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
        if obj.file:
            # Use StorageService for proper signed URLs (works with DO Spaces CDN)
            return StorageService.get_signed_url(obj.file.name, expiration=3600)
        return None

    def get_is_protected(self, obj):
        return bool(obj.password_hash)
