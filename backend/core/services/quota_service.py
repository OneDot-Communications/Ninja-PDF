from apps.subscriptions.models import Subscription, UserFeatureUsage
from rest_framework.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)

class QuotaService:
    @staticmethod
    def get_storage_quota(user):
        """Returns (used_bytes, limit_bytes)"""
        # Default limits based on Tier (in case Plan object is missing or has defaults)
        TIER_LIMITS = {
            'FREE': 100 * 1024 * 1024,       # 100 MB
            'PRO': 500 * 1024 * 1024,        # 500 MB
            'PREMIUM': 2 * 1024 * 1024 * 1024, # 2 GB
            'ENTERPRISE': 10 * 1024 * 1024 * 1024 # 10 GB
        }
        
        default_limit = TIER_LIMITS.get(user.subscription_tier, TIER_LIMITS['FREE'])

        if not hasattr(user, 'subscription'):
            return 0, default_limit
        
        sub = user.subscription
        # If plan is None (shouldn't happen for active users usually, but safeguard)
        limit = sub.plan.storage_limit if sub.plan and sub.plan.storage_limit > 0 else default_limit
        
        return sub.storage_used, limit

    @staticmethod
    def check_storage_quota(user, file_size):
        """
        Checks if adding file_size would exceed quota.
        Raises PermissionDenied if so.
        """
        used, limit = QuotaService.get_storage_quota(user)
        
        if used + file_size > limit:
            mb_limit = limit / (1024 * 1024)
            raise PermissionDenied(f"Storage limit reached ({int(mb_limit)}MB). Upgrade your plan to upload more.")
            
    @staticmethod
    def update_storage_usage(user, delta_bytes):
        """
        Updates storage usage atomically using F() expressions to prevent race conditions.
        """
        if not hasattr(user, 'subscription'):
            return
            
        from django.db.models import F
        sub = user.subscription
        # Atomic update
        sub.storage_used = F('storage_used') + delta_bytes
        sub.save(update_fields=['storage_used'])
        
        # Reload to check for negative values (rare edge case cleanup)
        sub.refresh_from_db()
        if sub.storage_used < 0:
            sub.storage_used = 0
            sub.save(update_fields=['storage_used'])
