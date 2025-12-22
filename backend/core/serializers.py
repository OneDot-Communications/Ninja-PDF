from rest_framework import serializers
from .models import SystemSetting, AdminActionRequest, ContentVersion, PlatformBranding, TaskLog, SupportTicket

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'

class PlatformBrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformBranding
        fields = '__all__'

class AdminActionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminActionRequest
        fields = '__all__'
        read_only_fields = ['requester', 'status', 'reviewer', 'review_note']

class ContentVersionSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    class Meta:
        model = ContentVersion
        fields = '__all__'

class TaskLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLog
        fields = '__all__'

class SupportTicketSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    class Meta:
        model = SupportTicket
        fields = '__all__'
        read_only_fields = ['user', 'status', 'assigned_to']
