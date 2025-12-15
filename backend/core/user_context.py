"""
User Context Resolution Service
Complete user tier, quota, and permission resolution.
"""
from django.db.models import Sum
from django.utils import timezone
from core.constants import UserTier, SubscriptionStatus, STORAGE_QUOTAS
import logging

logger = logging.getLogger(__name__)


class UserContextResolver:
    """
    Resolves complete user context for any request.
    This is the single source of truth for user capabilities.
    """
    
    @classmethod
    def resolve(cls, user) -> dict:
        """
        Resolve complete user context.
        
        Args:
            user: User instance or None for guest
            
        Returns:
            dict: Complete context including tier, quotas, and permissions
        """
        if user is None or not user.is_authenticated:
            return cls._guest_context()
        
        tier = cls._resolve_tier(user)
        subscription_status = cls._resolve_subscription_status(user)
        
        storage_limit = STORAGE_QUOTAS.get(tier, STORAGE_QUOTAS[UserTier.FREE])
        storage_used = cls._calculate_storage_used(user)
        
        is_premium = tier in (UserTier.PREMIUM, UserTier.TEAM, UserTier.ADMIN)
        is_suspended = subscription_status == SubscriptionStatus.SUSPENDED
        can_upload = not is_suspended and (storage_limit == -1 or storage_used < storage_limit)
        
        context = {
            'user_id': user.id,
            'tier': tier,
            'tier_name': tier.value,
            'subscription_status': subscription_status,
            'subscription_name': subscription_status.value if subscription_status else None,
            
            'storage_limit': storage_limit,
            'storage_used': storage_used,
            'storage_remaining': (storage_limit - storage_used) if storage_limit != -1 else float('inf'),
            'storage_percent': (storage_used / storage_limit * 100) if storage_limit > 0 else 0,
            
            'can_upload': can_upload,
            'can_process': not is_suspended,
            'can_use_premium': is_premium and not is_suspended,
            'can_use_ai': is_premium and not is_suspended,
            'can_use_automation': is_premium and not is_suspended,
            'can_use_team_features': tier in (UserTier.TEAM, UserTier.ADMIN),
            
            'is_suspended': is_suspended,
            'is_admin': user.role in ('SUPER_ADMIN', 'ADMIN') if hasattr(user, 'role') else False,
            
            'job_priority': cls._get_job_priority(tier),
            'queue_name': cls._get_queue_name(tier),
            
            'daily_job_limit': cls._get_daily_job_limit(tier),
            'monthly_ai_limit': cls._get_monthly_ai_limit(tier),
            'max_file_size': cls._get_max_file_size(tier),
            'max_concurrent_jobs': cls._get_max_concurrent_jobs(tier),
        }
        
        return context
    
    @classmethod
    def _guest_context(cls) -> dict:
        """Return context for unauthenticated guests."""
        return {
            'user_id': None,
            'tier': UserTier.GUEST,
            'tier_name': 'GUEST',
            'subscription_status': None,
            'subscription_name': None,
            
            'storage_limit': 0,
            'storage_used': 0,
            'storage_remaining': 0,
            'storage_percent': 0,
            
            'can_upload': True,
            'can_process': True,
            'can_use_premium': False,
            'can_use_ai': False,
            'can_use_automation': False,
            'can_use_team_features': False,
            
            'is_suspended': False,
            'is_admin': False,
            
            'job_priority': -10,
            'queue_name': 'default',
            
            'daily_job_limit': 5,
            'monthly_ai_limit': 0,
            'max_file_size': 10 * 1024 * 1024,
            'max_concurrent_jobs': 1,
        }
    
    @classmethod
    def _resolve_tier(cls, user) -> UserTier:
        """Determine user tier from role and subscription."""
        if hasattr(user, 'role') and user.role in ('SUPER_ADMIN', 'ADMIN'):
            return UserTier.ADMIN
        
        if hasattr(user, 'subscription') and user.subscription:
            sub = user.subscription
            if sub.status in ('ACTIVE', 'GRACE_PERIOD'):
                plan = getattr(sub, 'plan', 'PREMIUM')
                if plan == 'TEAM':
                    return UserTier.TEAM
                return UserTier.PREMIUM
        
        return UserTier.FREE
    
    @classmethod
    def _resolve_subscription_status(cls, user) -> SubscriptionStatus:
        """Get current subscription status."""
        if hasattr(user, 'subscription') and user.subscription:
            try:
                return SubscriptionStatus(user.subscription.status)
            except ValueError:
                return SubscriptionStatus.FREE
        return SubscriptionStatus.FREE
    
    @classmethod
    def _calculate_storage_used(cls, user) -> int:
        """Calculate total storage bytes used by user."""
        from apps.files.models.user_file import UserFile
        
        total = UserFile.objects.filter(
            user=user
        ).exclude(
            status__in=['DELETED', 'EXPIRED']
        ).aggregate(
            total=Sum('size_bytes')
        )['total']
        
        return total or 0
    
    @classmethod
    def _get_job_priority(cls, tier: UserTier) -> int:
        """Get job priority for tier."""
        priorities = {
            UserTier.ADMIN: 100,
            UserTier.TEAM: 50,
            UserTier.PREMIUM: 50,
            UserTier.FREE: 0,
            UserTier.GUEST: -10,
        }
        return priorities.get(tier, 0)
    
    @classmethod
    def _get_queue_name(cls, tier: UserTier) -> str:
        """Get queue name for tier."""
        if tier in (UserTier.ADMIN, UserTier.TEAM, UserTier.PREMIUM):
            return 'high_priority'
        return 'default'
    
    @classmethod
    def _get_daily_job_limit(cls, tier: UserTier) -> int:
        """Get daily job limit for tier."""
        limits = {
            UserTier.ADMIN: -1,
            UserTier.TEAM: 1000,
            UserTier.PREMIUM: 500,
            UserTier.FREE: 50,
            UserTier.GUEST: 5,
        }
        return limits.get(tier, 50)
    
    @classmethod
    def _get_monthly_ai_limit(cls, tier: UserTier) -> int:
        """Get monthly AI operation limit for tier."""
        limits = {
            UserTier.ADMIN: -1,
            UserTier.TEAM: 500,
            UserTier.PREMIUM: 100,
            UserTier.FREE: 0,
            UserTier.GUEST: 0,
        }
        return limits.get(tier, 0)
    
    @classmethod
    def _get_max_file_size(cls, tier: UserTier) -> int:
        """Get maximum file size in bytes for tier."""
        sizes = {
            UserTier.ADMIN: 500 * 1024 * 1024,
            UserTier.TEAM: 200 * 1024 * 1024,
            UserTier.PREMIUM: 100 * 1024 * 1024,
            UserTier.FREE: 50 * 1024 * 1024,
            UserTier.GUEST: 10 * 1024 * 1024,
        }
        return sizes.get(tier, 50 * 1024 * 1024)
    
    @classmethod
    def _get_max_concurrent_jobs(cls, tier: UserTier) -> int:
        """Get maximum concurrent jobs for tier."""
        limits = {
            UserTier.ADMIN: -1,
            UserTier.TEAM: 10,
            UserTier.PREMIUM: 5,
            UserTier.FREE: 2,
            UserTier.GUEST: 1,
        }
        return limits.get(tier, 2)


class QuotaEngine:
    """Storage and job quota enforcement."""
    
    @classmethod
    def can_upload_file(cls, user, file_size: int) -> tuple:
        """
        Check if user can upload a file of given size.
        
        Returns:
            tuple: (allowed: bool, reason: str)
        """
        context = UserContextResolver.resolve(user)
        
        if not context['can_upload']:
            return False, "Upload not allowed. Account may be suspended."
        
        if context['storage_limit'] == -1:
            return True, "Unlimited storage"
        
        if context['storage_used'] + file_size > context['storage_limit']:
            remaining_mb = context['storage_remaining'] / (1024 * 1024)
            return False, f"Only {remaining_mb:.1f}MB remaining in storage quota"
        
        return True, "OK"
    
    @classmethod
    def can_start_job(cls, user) -> tuple:
        """
        Check if user can start a new job.
        
        Returns:
            tuple: (allowed: bool, reason: str)
        """
        context = UserContextResolver.resolve(user)
        
        if context['is_suspended']:
            return False, "Account suspended"
        
        from core.job_orchestration import Job
        processing_count = Job.objects.filter(
            user=user,
            status__in=['QUEUED', 'PROCESSING']
        ).count()
        
        max_concurrent = context['max_concurrent_jobs']
        if max_concurrent != -1 and processing_count >= max_concurrent:
            return False, f"Maximum {max_concurrent} concurrent jobs allowed"
        
        return True, "OK"
    
    @classmethod
    def reserve_quota(cls, user, bytes_to_reserve: int) -> str:
        """
        Reserve storage quota for pending upload.
        Returns reservation ID.
        """
        from django.core.cache import cache
        import uuid
        
        reservation_id = str(uuid.uuid4())
        key = f"quota_reservation:{user.id}:{reservation_id}"
        
        cache.set(key, {
            'bytes': bytes_to_reserve,
            'timestamp': timezone.now().isoformat()
        }, timeout=300)
        
        return reservation_id
    
    @classmethod
    def release_quota(cls, user, reservation_id: str):
        """Release a quota reservation."""
        from django.core.cache import cache
        
        key = f"quota_reservation:{user.id}:{reservation_id}"
        cache.delete(key)


def get_user_context(user) -> dict:
    """Convenience function."""
    return UserContextResolver.resolve(user)
