"""Feedback Admin Serializers"""
from rest_framework import serializers
from apps.core.models import Feedback


class FeedbackAdminListSerializer(serializers.ModelSerializer):
    """Serializer for admin feedback list view"""
    
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_full_name = serializers.SerializerMethodField()
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = Feedback
        fields = [
            'id',
            'user',
            'user_email',
            'user_username',
            'user_full_name',
            'name',
            'email',
            'feedback_type',
            'description',
            'proof_link',
            'created_at',
            'ip_address',
            'user_agent',
            'is_resolved',
            'resolved_at',
            'resolved_by',
            'resolved_by_username',
            'admin_notes',
        ]
    
    def get_user_full_name(self, obj):
        """Get full name of the user"""
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None


class ResolveFeedbackSerializer(serializers.Serializer):
    """Serializer for resolving feedback"""
    
    admin_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional notes from admin when resolving"
    )
