"""
Rate Limiting Service
Tier-aware request and job throttling.
"""
from django.core.cache import cache
from common.constants import RATE_LIMITS, UserTier
from common.exceptions import RateLimitError
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Request and job rate limiting."""
    
    @staticmethod
    def get_limits(user) -> dict:
        """Get rate limits for user based on tier."""
        from apps.accounts.services.user_service import UserService
        
        context = UserService.get_context(user)
        tier = context['tier']
        
        return RATE_LIMITS.get(tier, RATE_LIMITS[UserTier.FREE])
    
    @staticmethod
    def check_request_limit(user, action: str = 'request') -> tuple:
        """
        Check if user is within request rate limit.
        
        Args:
            user: User instance
            action: Action identifier
            
        Returns:
            tuple: (allowed: bool, retry_after_seconds: int)
        """
        limits = RateLimiter.get_limits(user)
        max_rpm = limits.get('requests_per_minute', 60)
        
        if max_rpm == -1:
            return True, 0
        
        user_id = user.id if user and user.is_authenticated else 'guest'
        key = f"rate:{user_id}:{action}"
        
        current = cache.get(key, 0)
        
        if current >= max_rpm:
            return False, 60
        
        cache.set(key, current + 1, timeout=60)
        return True, 0
    
    @staticmethod
    def check_job_limit(user) -> tuple:
        """
        Check if user is within hourly job limit.
        
        Returns:
            tuple: (allowed: bool, retry_after_seconds: int)
        """
        limits = RateLimiter.get_limits(user)
        max_jobs = limits.get('jobs_per_hour', 50)
        
        if max_jobs == -1:
            return True, 0
        
        user_id = user.id if user and user.is_authenticated else 'guest'
        key = f"jobs:{user_id}"
        
        current = cache.get(key, 0)
        
        if current >= max_jobs:
            return False, 3600
        
        cache.set(key, current + 1, timeout=3600)
        return True, 0
    
    @staticmethod
    def enforce_request_limit(user, action: str = 'request'):
        """
        Enforce request limit, raising exception if exceeded.
        
        Raises:
            RateLimitError: If limit exceeded
        """
        allowed, retry_after = RateLimiter.check_request_limit(user, action)
        
        if not allowed:
            raise RateLimitError(
                message="Too many requests. Please try again later.",
                details={'retry_after': retry_after}
            )
    
    @staticmethod
    def enforce_job_limit(user):
        """
        Enforce job limit, raising exception if exceeded.
        
        Raises:
            RateLimitError: If limit exceeded
        """
        allowed, retry_after = RateLimiter.check_job_limit(user)
        
        if not allowed:
            raise RateLimitError(
                message="Hourly job limit exceeded. Please try again later.",
                details={'retry_after': retry_after}
            )
