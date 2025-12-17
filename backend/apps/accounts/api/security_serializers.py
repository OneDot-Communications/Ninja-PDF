"""Security API Serializers - IP Rules, Rate Limiting, Password Policies, Audit Logs"""
from rest_framework import serializers
from apps.accounts.models import (
    IPRule, RateLimitRule, PasswordPolicy, PasswordHistory,
    FailedLoginAttempt, AuditLog, SystemConfiguration
)


class IPRuleSerializer(serializers.ModelSerializer):
    """Serializer for IP Rules"""
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = IPRule
        fields = [
            'id', 'ip_address', 'ip_range_start', 'ip_range_end', 'cidr',
            'rule_type', 'scope', 'reason', 'expires_at', 'is_active',
            'hits', 'last_hit_at', 'created_by', 'created_by_email',
            'created_at', 'updated_at', 'is_valid'
        ]
        read_only_fields = ['id', 'hits', 'last_hit_at', 'created_at', 'updated_at', 'created_by']
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class RateLimitRuleSerializer(serializers.ModelSerializer):
    """Serializer for Rate Limit Rules"""
    target_plan_name = serializers.CharField(source='target_plan.name', read_only=True)
    target_user_email = serializers.CharField(source='target_user.email', read_only=True)
    
    class Meta:
        model = RateLimitRule
        fields = [
            'id', 'name', 'scope',
            'target_role', 'target_plan', 'target_plan_name',
            'target_user', 'target_user_email', 'target_endpoint',
            'requests_allowed', 'time_window', 'burst_allowed',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PasswordPolicySerializer(serializers.ModelSerializer):
    """Serializer for Password Policy"""
    
    class Meta:
        model = PasswordPolicy
        fields = [
            'id', 'name', 'is_active',
            'min_length', 'max_length',
            'require_uppercase', 'require_lowercase', 'require_digit', 'require_special',
            'special_characters', 'prevent_reuse_count',
            'password_expires_days', 'warn_before_expiry_days',
            'max_failed_attempts', 'lockout_duration_minutes',
            'check_breached_passwords',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FailedLoginAttemptSerializer(serializers.ModelSerializer):
    """Serializer for Failed Login Attempts"""
    
    class Meta:
        model = FailedLoginAttempt
        fields = ['id', 'email', 'ip_address', 'user_agent', 'attempted_at', 'reason']
        read_only_fields = ['id', 'attempted_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Audit Logs"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action_type',
            'resource_type', 'resource_id', 'resource_name',
            'description', 'old_value', 'new_value',
            'ip_address', 'user_agent', 'session_id',
            'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SystemConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for System Configuration"""
    updated_by_email = serializers.CharField(source='updated_by.email', read_only=True)
    
    class Meta:
        model = SystemConfiguration
        fields = [
            'id', 'key', 'value', 'category', 'description',
            'value_type', 'min_value', 'max_value', 'allowed_values',
            'is_public', 'is_editable', 'requires_restart',
            'updated_by', 'updated_by_email', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by']


class PasswordValidationSerializer(serializers.Serializer):
    """Validate a password against current policy"""
    password = serializers.CharField(min_length=1)
    
    def validate_password(self, value):
        policy = PasswordPolicy.get_active_policy()
        if policy:
            is_valid, errors = policy.validate_password(value)
            if not is_valid:
                raise serializers.ValidationError(errors)
        return value


class AuditLogExportSerializer(serializers.Serializer):
    """Parameters for audit log export"""
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    action_types = serializers.ListField(child=serializers.CharField(), required=False)
    user_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    format = serializers.ChoiceField(choices=['json', 'csv'], default='json')
