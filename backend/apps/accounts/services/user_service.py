"""
User Service
Handles user context resolution and tier management.
"""
from django.db.models import Sum
from common.constants import UserTier, SubscriptionStatus, STORAGE_QUOTAS_BYTES
import logging

logger = logging.getLogger(__name__)


class UserService:
    """User context and tier management."""
    
    @staticmethod
    def get_context(user) -> dict:
        """
        Resolve complete user context including tier, quotas, and permissions.
        
        Args:
            user: User instance or None (for guests)
            
        Returns:
            dict: Full user context
        """
        if user is None or not user.is_authenticated:
            return {
                'tier': UserTier.GUEST,
                'subscription_status': None,
                'storage_limit': STORAGE_QUOTAS_BYTES[UserTier.GUEST],
                'storage_used': 0,
                'can_upload': True,
                'can_use_premium': False,
                'can_use_ai': False,
                'can_use_automation': False,
            }
        
        tier = UserTier.FREE
        subscription_status = SubscriptionStatus.FREE
        
        if user.role in ('SUPER_ADMIN', 'ADMIN'):
            tier = UserTier.ADMIN
            subscription_status = SubscriptionStatus.ACTIVE
        elif hasattr(user, 'subscription') and user.subscription:
            sub = user.subscription
            try:
                subscription_status = SubscriptionStatus(sub.status)
            except ValueError:
                subscription_status = SubscriptionStatus.FREE
            
            if subscription_status == SubscriptionStatus.ACTIVE:
                tier = UserTier.PREMIUM
            elif subscription_status == SubscriptionStatus.GRACE_PERIOD:
                tier = UserTier.PREMIUM
            elif subscription_status == SubscriptionStatus.SUSPENDED:
                tier = UserTier.FREE
        
        storage_limit = STORAGE_QUOTAS_BYTES.get(tier, STORAGE_QUOTAS_BYTES[UserTier.FREE])
        storage_used = UserService._calculate_storage(user)
        
        can_premium = tier in (UserTier.PREMIUM, UserTier.TEAM, UserTier.ADMIN)
        can_upload = (storage_limit == -1) or (storage_used < storage_limit)
        
        return {
            'tier': tier,
            'subscription_status': subscription_status,
            'storage_limit': storage_limit,
            'storage_used': storage_used,
            'storage_remaining': (storage_limit - storage_used) if storage_limit != -1 else float('inf'),
            'can_upload': can_upload,
            'can_use_premium': can_premium,
            'can_use_ai': can_premium,
            'can_use_automation': can_premium,
        }
    
    @staticmethod
    def _calculate_storage(user) -> int:
        """Calculate total storage bytes used by user."""
        from apps.files.models.file_asset import FileAsset
        
        total = FileAsset.objects.filter(
            user=user
        ).exclude(
            status__in=['DELETED', 'EXPIRED']
        ).aggregate(
            total=Sum('size_bytes')
        )['total']
        
        return total or 0
    
    @staticmethod
    def check_quota(user, additional_bytes: int = 0) -> tuple:
        """
        Check if user has available quota.
        
        Args:
            user: User instance
            additional_bytes: Bytes to add (for upload check)
            
        Returns:
            tuple: (allowed: bool, reason: str)
        """
        context = UserService.get_context(user)
        
        if context['storage_limit'] == -1:
            return True, "Unlimited storage"
        
        new_total = context['storage_used'] + additional_bytes
        
        if new_total > context['storage_limit']:
            return False, f"Storage quota exceeded ({context['storage_used']}/{context['storage_limit']} bytes)"
        
        return True, "OK"
    
    @staticmethod
    def get_storage_warnings(user) -> dict:
        """
        Get storage usage warnings for upgrade prompts.
        
        Returns:
            dict: {percent_used, warn_80, warn_95}
        """
        context = UserService.get_context(user)
        
        if context['storage_limit'] == -1:
            return {'percent_used': 0, 'warn_80': False, 'warn_95': False}
        
        if context['storage_limit'] == 0:
            return {'percent_used': 100, 'warn_80': True, 'warn_95': True}
        
        percent = (context['storage_used'] / context['storage_limit']) * 100
        
        return {
            'percent_used': round(percent, 2),
            'warn_80': percent >= 80,
            'warn_95': percent >= 95,
        }
