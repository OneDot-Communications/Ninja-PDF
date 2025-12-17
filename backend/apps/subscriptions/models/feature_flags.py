"""Feature Flags for Controlled Rollouts"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import hashlib


class FeatureFlag(models.Model):
    """
    Feature flags for controlled feature rollouts.
    Supports global toggles, percentage rollouts, user lists, and plan-based access.
    """
    class RolloutType(models.TextChoices):
        GLOBAL = 'GLOBAL', _('Global Toggle')
        PERCENTAGE = 'PERCENTAGE', _('Percentage Rollout')
        USER_LIST = 'USER_LIST', _('Specific Users')
        PLAN_BASED = 'PLAN_BASED', _('Plan Based')
        ROLE_BASED = 'ROLE_BASED', _('Role Based')
    
    class Category(models.TextChoices):
        UI = 'UI', _('User Interface')
        FEATURE = 'FEATURE', _('Feature')
        EXPERIMENT = 'EXPERIMENT', _('Experiment')
        OPERATION = 'OPERATION', _('Operations')
        BETA = 'BETA', _('Beta')
    
    code = models.SlugField(
        unique=True, 
        max_length=100,
        help_text="Unique identifier for the feature flag (e.g., 'new_pdf_editor')"
    )
    name = models.CharField(max_length=200, help_text="Human-readable name")
    description = models.TextField(blank=True, help_text="What this flag controls")
    
    category = models.CharField(
        max_length=20, 
        choices=Category.choices, 
        default=Category.FEATURE
    )
    
    # Rollout configuration
    rollout_type = models.CharField(
        max_length=20, 
        choices=RolloutType.choices,
        default=RolloutType.GLOBAL
    )
    is_enabled = models.BooleanField(default=False)
    
    # For percentage rollout (0-100)
    rollout_percentage = models.PositiveIntegerField(
        default=0,
        help_text="Percentage of users to enable for (0-100)"
    )
    
    # For user list rollout
    allowed_user_ids = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of user IDs to enable for"
    )
    
    # For plan-based rollout
    allowed_plans = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of plan slugs to enable for"
    )
    
    # For role-based rollout
    allowed_roles = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of roles to enable for (e.g., ['SUPER_ADMIN', 'ADMIN'])"
    )
    
    # Scheduling
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='created_feature_flags'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'feature_flags'
        ordering = ['category', 'name']
    
    def __str__(self):
        status = "ON" if self.is_enabled else "OFF"
        return f"{self.name} [{status}]"
    
    def is_active_for_user(self, user) -> bool:
        """
        Check if this feature flag is active for a specific user.
        
        Args:
            user: User instance to check
        
        Returns:
            True if feature is enabled for this user
        """
        # Check if globally disabled
        if not self.is_enabled:
            return False
        
        # Check scheduling
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        
        # Check based on rollout type
        if self.rollout_type == self.RolloutType.GLOBAL:
            return True
        
        elif self.rollout_type == self.RolloutType.PERCENTAGE:
            if not user:
                return False
            # Use consistent hash based on user ID and flag code
            hash_input = f"{user.id}:{self.code}"
            hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) % 100
            return hash_value < self.rollout_percentage
        
        elif self.rollout_type == self.RolloutType.USER_LIST:
            if not user:
                return False
            return user.id in self.allowed_user_ids
        
        elif self.rollout_type == self.RolloutType.PLAN_BASED:
            if not user:
                return False
            try:
                user_plan = user.subscription.plan
                if user_plan:
                    return user_plan.slug in self.allowed_plans
            except AttributeError:
                pass
            return False
        
        elif self.rollout_type == self.RolloutType.ROLE_BASED:
            if not user:
                return False
            return user.role in self.allowed_roles
        
        return False
    
    @classmethod
    def is_enabled_for(cls, code: str, user=None) -> bool:
        """
        Class method to check if a feature is enabled for a user.
        
        Args:
            code: Feature flag code
            user: User instance (optional for global flags)
        
        Returns:
            True if feature is enabled
        """
        try:
            flag = cls.objects.get(code=code)
            return flag.is_active_for_user(user)
        except cls.DoesNotExist:
            return False
    
    @classmethod
    def get_all_for_user(cls, user) -> dict:
        """
        Get all feature flags and their status for a user.
        Useful for sending to frontend.
        
        Returns:
            Dict of {code: is_enabled}
        """
        flags = cls.objects.filter(is_enabled=True)
        result = {}
        for flag in flags:
            result[flag.code] = flag.is_active_for_user(user)
        return result


class FeatureFlagAudit(models.Model):
    """Audit trail for feature flag changes"""
    feature_flag = models.ForeignKey(FeatureFlag, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=50)  # e.g., 'enabled', 'disabled', 'percentage_changed'
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'feature_flag_audits'
        ordering = ['-changed_at']
