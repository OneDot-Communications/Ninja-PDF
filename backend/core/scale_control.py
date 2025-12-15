"""
Scale & Cost Control
Tier-aware throttling, concurrency caps, and resource limits.
"""
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class ThrottleConfig:
    """Tier-based throttle configuration."""
    
    LIMITS = {
        'ADMIN': {'requests_per_minute': 1000, 'jobs_per_hour': -1, 'concurrent_jobs': -1},
        'TEAM': {'requests_per_minute': 120, 'jobs_per_hour': 1000, 'concurrent_jobs': 10},
        'PREMIUM': {'requests_per_minute': 60, 'jobs_per_hour': 500, 'concurrent_jobs': 5},
        'FREE': {'requests_per_minute': 20, 'jobs_per_hour': 50, 'concurrent_jobs': 2},
        'GUEST': {'requests_per_minute': 5, 'jobs_per_hour': 10, 'concurrent_jobs': 1},
    }
    
    @classmethod
    def get_limits(cls, tier: str) -> dict:
        return cls.LIMITS.get(tier, cls.LIMITS['FREE'])


class WorkerConfig:
    """Worker concurrency configuration."""
    
    CONCURRENCY = {
        'high_priority': 10,
        'default': 5,
        'low_priority': 2,
    }
    
    @classmethod
    def get_concurrency(cls, queue_name: str) -> int:
        return cls.CONCURRENCY.get(queue_name, 5)


class AIQuotaConfig:
    """AI feature quota configuration."""
    
    MONTHLY_LIMITS = {
        'ADMIN': -1,
        'TEAM': 500,
        'PREMIUM': 100,
        'FREE': 0,
        'GUEST': 0,
    }
    
    @classmethod
    def get_monthly_limit(cls, tier: str) -> int:
        return cls.MONTHLY_LIMITS.get(tier, 0)


class StorageLifecycleConfig:
    """Storage lifecycle policies by tier."""
    
    POLICIES = {
        'ADMIN': {'auto_delete_days': -1, 'warn_at_percent': 95},
        'TEAM': {'auto_delete_days': 365, 'warn_at_percent': 80},
        'PREMIUM': {'auto_delete_days': 365, 'warn_at_percent': 80},
        'FREE': {'auto_delete_days': 30, 'warn_at_percent': 70},
        'GUEST': {'auto_delete_hours': 1, 'warn_at_percent': 0},
    }
    
    @classmethod
    def get_policy(cls, tier: str) -> dict:
        return cls.POLICIES.get(tier, cls.POLICIES['FREE'])


class AutomationConfig:
    """Automation/workflow caps by tier."""
    
    LIMITS = {
        'ADMIN': {'max_workflows': -1, 'max_steps_per_workflow': -1},
        'TEAM': {'max_workflows': 50, 'max_steps_per_workflow': 20},
        'PREMIUM': {'max_workflows': 5, 'max_steps_per_workflow': 10},
        'FREE': {'max_workflows': 0, 'max_steps_per_workflow': 0},
        'GUEST': {'max_workflows': 0, 'max_steps_per_workflow': 0},
    }
    
    @classmethod
    def get_limits(cls, tier: str) -> dict:
        return cls.LIMITS.get(tier, cls.LIMITS['FREE'])


class ScaleController:
    """Centralized scale and cost control."""
    
    @classmethod
    def get_user_tier(cls, user) -> str:
        """Get user tier string."""
        from core.user_context import UserContextResolver
        context = UserContextResolver.resolve(user)
        return context['tier_name']
    
    @classmethod
    def check_rate_limit(cls, user, action: str = 'request') -> tuple:
        """
        Check if user is within rate limits.
        
        Returns:
            tuple: (allowed: bool, retry_after: int)
        """
        tier = cls.get_user_tier(user)
        limits = ThrottleConfig.get_limits(tier)
        
        rpm_limit = limits['requests_per_minute']
        if rpm_limit == -1:
            return True, 0
        
        user_id = user.id if user and user.is_authenticated else 'guest'
        key = f"rate:{user_id}:{action}:{timezone.now().strftime('%Y%m%d%H%M')}"
        
        current = cache.get(key, 0)
        
        if current >= rpm_limit:
            return False, 60
        
        cache.set(key, current + 1, timeout=60)
        return True, 0
    
    @classmethod
    def check_job_limit(cls, user) -> tuple:
        """Check if user can start a new job."""
        tier = cls.get_user_tier(user)
        limits = ThrottleConfig.get_limits(tier)
        
        jobs_limit = limits['jobs_per_hour']
        if jobs_limit == -1:
            return True, 0
        
        user_id = user.id if user and user.is_authenticated else 'guest'
        key = f"jobs:{user_id}:{timezone.now().strftime('%Y%m%d%H')}"
        
        current = cache.get(key, 0)
        
        if current >= jobs_limit:
            return False, 3600
        
        cache.set(key, current + 1, timeout=3600)
        return True, 0
    
    @classmethod
    def check_concurrent_limit(cls, user) -> tuple:
        """Check if user can start another concurrent job."""
        from core.job_orchestration import Job
        
        tier = cls.get_user_tier(user)
        limits = ThrottleConfig.get_limits(tier)
        
        concurrent_limit = limits['concurrent_jobs']
        if concurrent_limit == -1:
            return True, 0
        
        active_jobs = Job.objects.filter(
            user=user,
            status__in=['PENDING', 'QUEUED', 'PROCESSING']
        ).count()
        
        if active_jobs >= concurrent_limit:
            return False, 0
        
        return True, 0
    
    @classmethod
    def check_ai_quota(cls, user) -> tuple:
        """Check if user can use AI features."""
        tier = cls.get_user_tier(user)
        monthly_limit = AIQuotaConfig.get_monthly_limit(tier)
        
        if monthly_limit == 0:
            return False, 0
        
        if monthly_limit == -1:
            return True, float('inf')
        
        user_id = user.id if user and user.is_authenticated else None
        if not user_id:
            return False, 0
        
        month_key = f"ai:{user_id}:{timezone.now().strftime('%Y%m')}"
        current = cache.get(month_key, 0)
        
        if current >= monthly_limit:
            return False, 0
        
        return True, monthly_limit - current
    
    @classmethod
    def increment_ai_usage(cls, user):
        """Increment AI usage counter."""
        user_id = user.id if user and user.is_authenticated else None
        if not user_id:
            return
        
        month_key = f"ai:{user_id}:{timezone.now().strftime('%Y%m')}"
        current = cache.get(month_key, 0)
        cache.set(month_key, current + 1, timeout=31 * 24 * 60 * 60)
    
    @classmethod
    def check_automation_limit(cls, user) -> tuple:
        """Check if user can create another workflow."""
        tier = cls.get_user_tier(user)
        limits = AutomationConfig.get_limits(tier)
        
        max_workflows = limits['max_workflows']
        if max_workflows == 0:
            return False, 0
        
        if max_workflows == -1:
            return True, float('inf')
        
        from workflows.models import Workflow
        current_count = Workflow.objects.filter(user=user, is_active=True).count()
        
        if current_count >= max_workflows:
            return False, 0
        
        return True, max_workflows - current_count
    
    @classmethod
    def get_all_limits(cls, user) -> dict:
        """Get all limits for user in a single call."""
        tier = cls.get_user_tier(user)
        
        return {
            'tier': tier,
            'throttle': ThrottleConfig.get_limits(tier),
            'ai': AIQuotaConfig.get_monthly_limit(tier),
            'storage': StorageLifecycleConfig.get_policy(tier),
            'automation': AutomationConfig.get_limits(tier),
        }


def get_throttle_limit(user) -> dict:
    """Convenience function."""
    tier = ScaleController.get_user_tier(user)
    return ThrottleConfig.get_limits(tier)


def check_rate_limit(user, action: str = 'request') -> tuple:
    """Convenience function."""
    return ScaleController.check_rate_limit(user, action)


def get_worker_concurrency(queue_name: str) -> int:
    """Convenience function."""
    return WorkerConfig.get_concurrency(queue_name)


def check_ai_quota(user) -> tuple:
    """Convenience function."""
    return ScaleController.check_ai_quota(user)


def get_storage_policy(user) -> dict:
    """Convenience function."""
    tier = ScaleController.get_user_tier(user)
    return StorageLifecycleConfig.get_policy(tier)


def check_automation_cap(user) -> tuple:
    """Convenience function."""
    return ScaleController.check_automation_limit(user)
