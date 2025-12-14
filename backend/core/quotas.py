"""
Quota Management Service
Redis-backed quota tracking for guests and database tracking for users.
"""
from django.core.cache import cache
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class QuotaManager:
    """
    Centralized quota management for all user types.
    Uses Redis for guest/transient limits and database for persistent user limits.
    """
    
    GUEST_TTL_SECONDS = 3600
    USER_TTL_SECONDS = 86400
    
    @classmethod
    def get_guest_key(cls, session_id: str, quota_type: str) -> str:
        """Generate Redis key for guest quota."""
        return f"quota:guest:{session_id}:{quota_type}"
    
    @classmethod
    def get_user_key(cls, user_id: int, quota_type: str) -> str:
        """Generate Redis key for user quota."""
        today = timezone.now().strftime('%Y-%m-%d')
        return f"quota:user:{user_id}:{quota_type}:{today}"
    
    @classmethod
    def check_and_increment(cls, key: str, limit: int, ttl: int = None) -> tuple:
        """
        Check quota and increment if allowed.
        
        Returns:
            tuple: (allowed: bool, current: int, limit: int)
        """
        if limit == -1:
            return True, 0, -1
        
        current = cache.get(key, 0)
        
        if current >= limit:
            return False, current, limit
        
        cache.set(key, current + 1, timeout=ttl or cls.USER_TTL_SECONDS)
        
        return True, current + 1, limit
    
    @classmethod
    def check_guest_quota(cls, session_id: str, quota_type: str = 'job') -> tuple:
        """
        Check guest quota for operations.
        
        quota_type: 'job', 'upload', 'download'
        """
        limits = {'job': 5, 'upload': 3, 'download': 10}
        limit = limits.get(quota_type, 5)
        
        key = cls.get_guest_key(session_id, quota_type)
        return cls.check_and_increment(key, limit, cls.GUEST_TTL_SECONDS)
    
    @classmethod
    def check_user_quota(cls, user, quota_type: str = 'job') -> tuple:
        """Check user quota for daily operations."""
        from core.user_context import UserContextResolver
        
        context = UserContextResolver.resolve(user)
        
        limit_map = {
            'job': context['daily_job_limit'],
            'ai': context['monthly_ai_limit'],
        }
        limit = limit_map.get(quota_type, 100)
        
        key = cls.get_user_key(user.id, quota_type)
        return cls.check_and_increment(key, limit)
    
    @classmethod
    def check_job_quota(cls, user) -> bool:
        """Check if user can start a job. Returns True if allowed."""
        if user is None or not user.is_authenticated:
            return True
        
        allowed, _, _ = cls.check_user_quota(user, 'job')
        return allowed
    
    @classmethod
    def check_ai_quota(cls, user) -> bool:
        """Check if user can use AI features. Returns True if allowed."""
        if user is None or not user.is_authenticated:
            return False
        
        allowed, _, _ = cls.check_user_quota(user, 'ai')
        return allowed
    
    @classmethod
    def get_remaining(cls, user, quota_type: str = 'job') -> int:
        """Get remaining quota for user."""
        from core.user_context import UserContextResolver
        
        context = UserContextResolver.resolve(user)
        
        limit_map = {
            'job': context['daily_job_limit'],
            'ai': context['monthly_ai_limit'],
        }
        limit = limit_map.get(quota_type, 100)
        
        if limit == -1:
            return float('inf')
        
        key = cls.get_user_key(user.id, quota_type)
        current = cache.get(key, 0)
        
        return max(0, limit - current)
    
    @classmethod
    def reset_user_quotas(cls, user):
        """Reset all daily quotas for a user."""
        for quota_type in ['job', 'upload', 'download']:
            key = cls.get_user_key(user.id, quota_type)
            cache.delete(key)
        
        logger.info(f"QuotaManager: Reset quotas for user {user.id}")
    
    @classmethod
    def track_feature_usage(cls, user, feature: str):
        """
        Track feature usage in database for billing/analytics.
        """
        from apps.subscriptions.models.subscription import UserFeatureUsage
        
        today = timezone.now().date()
        
        with transaction.atomic():
            usage, created = UserFeatureUsage.objects.get_or_create(
                user=user,
                feature=feature,
                date=today,
                defaults={'usage_count': 1}
            )
            
            if not created:
                usage.usage_count += 1
                usage.save(update_fields=['usage_count'])
    
    @classmethod
    def get_usage_stats(cls, user, days: int = 30) -> dict:
        """Get usage statistics for user over last N days."""
        from apps.subscriptions.models.subscription import UserFeatureUsage
        from django.db.models import Sum
        
        start_date = timezone.now().date() - timedelta(days=days)
        
        stats = UserFeatureUsage.objects.filter(
            user=user,
            date__gte=start_date
        ).values('feature').annotate(
            total=Sum('usage_count')
        )
        
        return {s['feature']: s['total'] for s in stats}


class RateLimiter:
    """Request rate limiting using Redis."""
    
    @classmethod
    def check_rate_limit(cls, identifier: str, limit: int, window_seconds: int = 60) -> tuple:
        """
        Check rate limit for identifier.
        
        Returns:
            tuple: (allowed: bool, retry_after_seconds: int)
        """
        key = f"rate_limit:{identifier}"
        
        current = cache.get(key, 0)
        
        if current >= limit:
            return False, window_seconds
        
        cache.set(key, current + 1, timeout=window_seconds)
        
        return True, 0
    
    @classmethod
    def check_request_rate(cls, user, action: str = 'request') -> tuple:
        """Check request rate for user."""
        from core.user_context import UserContextResolver
        
        context = UserContextResolver.resolve(user)
        
        rate_limits = {
            'ADMIN': 1000,
            'TEAM': 120,
            'PREMIUM': 60,
            'FREE': 20,
            'GUEST': 5,
        }
        
        tier_name = context['tier_name']
        limit = rate_limits.get(tier_name, 20)
        
        user_id = user.id if user and user.is_authenticated else 'guest'
        identifier = f"{user_id}:{action}"
        
        return cls.check_rate_limit(identifier, limit)
