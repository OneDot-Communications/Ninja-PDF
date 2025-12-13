from rest_framework import serializers
from .models import SystemSetting, AdminActionRequest

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['key', 'value', 'file', 'updated_at']
        read_only_fields = ['updated_at']

class AdminActionRequestSerializer(serializers.ModelSerializer):
    requester_email = serializers.EmailField(source='requester.email', read_only=True)
    reviewer_email = serializers.EmailField(source='reviewer.email', read_only=True)
    
    class Meta:
        model = AdminActionRequest
        fields = [
            'id', 'requester', 'requester_email', 'action_type', 'payload', 
            'reason', 'status', 'reviewer', 'reviewer_email', 'review_note', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['requester', 'status', 'reviewer', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Requester is current user, handled in ViewSet
        return super().create(validated_data)
