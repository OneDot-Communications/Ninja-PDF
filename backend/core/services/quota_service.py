from apps.subscriptions.models import Subscription, UserFeatureUsage
from rest_framework.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)

class QuotaService:
    @staticmethod
    def get_storage_quota(user):
        """
        Returns (used_bytes, limit_bytes).
        For users without subscription, calculates used from actual file sizes.
        """
        # Default limits based on Tier (in case Plan object is missing or has defaults)
        TIER_LIMITS = {
            'FREE': 100 * 1024 * 1024,       # 100 MB
            'PRO': 500 * 1024 * 1024,        # 500 MB
            'PREMIUM': 2 * 1024 * 1024 * 1024, # 2 GB
            'ENTERPRISE': 10 * 1024 * 1024 * 1024 # 10 GB
        }
        
        default_limit = TIER_LIMITS.get(user.subscription_tier, TIER_LIMITS['FREE'])

        if not hasattr(user, 'subscription'):
            # Calculate storage used from actual files for users without subscription
            used = QuotaService._calculate_storage_from_files(user)
            logger.debug(f"QuotaService: User {user.id} has no subscription, calculated used={used} bytes from files")
            return used, default_limit
        
        sub = user.subscription
        # If plan is None (shouldn't happen for active users usually, but safeguard)
        limit = sub.plan.storage_limit if sub.plan and sub.plan.storage_limit > 0 else default_limit
        
        return sub.storage_used, limit

    @staticmethod
    def _calculate_storage_from_files(user):
        """Calculate actual storage used by summing file sizes."""
        from apps.files.models.user_file import UserFile
        from django.db.models import Sum
        
        result = UserFile.objects.filter(user=user).aggregate(total=Sum('size_bytes'))
        return result['total'] or 0

    @staticmethod
    def check_storage_quota(user, file_size):
        """
        Checks if adding file_size would exceed quota.
        Raises PermissionDenied if so.
        """
        used, limit = QuotaService.get_storage_quota(user)
        
        logger.info(f"QuotaCheck: user={user.id} used={used} limit={limit} file_size={file_size} would_exceed={used + file_size > limit}")
        
        if used + file_size > limit:
            mb_used = used / (1024 * 1024)
            mb_limit = limit / (1024 * 1024)
            raise PermissionDenied(f"Storage limit reached ({mb_used:.1f}MB / {int(mb_limit)}MB). Upgrade your plan to upload more.")
            
    @staticmethod
    def update_storage_usage(user, delta_bytes):
        """
        Updates storage usage atomically using F() expressions to prevent race conditions.
        Creates a subscription record if user doesn't have one.
        """
        from django.db.models import F
        from django.utils import timezone
        from datetime import timedelta
        
        # Create subscription if it doesn't exist
        if not hasattr(user, 'subscription'):
            try:
                sub = Subscription.objects.create(
                    user=user,
                    status=Subscription.Status.FREE,
                    current_period_end=timezone.now() + timedelta(days=365*100),  # Far future
                    storage_used=max(0, delta_bytes)
                )
                logger.info(f"QuotaService: Created subscription for user {user.id}, storage_used={delta_bytes}")
                return
            except Exception as e:
                logger.error(f"QuotaService: Failed to create subscription for user {user.id}: {e}")
                return
        
        sub = user.subscription
        # Atomic update
        sub.storage_used = F('storage_used') + delta_bytes
        sub.save(update_fields=['storage_used'])
        
        # Reload to check for negative values (rare edge case cleanup)
        sub.refresh_from_db()
        if sub.storage_used < 0:
            sub.storage_used = 0
            sub.save(update_fields=['storage_used'])
        
        logger.debug(f"QuotaService: Updated storage for user {user.id}, delta={delta_bytes}, new_total={sub.storage_used}")

    @staticmethod
    def recalculate_storage_usage(user):
        """
        Recalculates storage usage from actual files and updates subscription.
        Useful for fixing out-of-sync storage counts.
        """
        from django.utils import timezone
        from datetime import timedelta
        
        actual_usage = QuotaService._calculate_storage_from_files(user)
        
        if not hasattr(user, 'subscription'):
            # Create subscription with correct usage
            try:
                Subscription.objects.create(
                    user=user,
                    status=Subscription.Status.FREE,
                    current_period_end=timezone.now() + timedelta(days=365*100),
                    storage_used=actual_usage
                )
                logger.info(f"QuotaService: Created subscription for user {user.id} with recalculated storage={actual_usage}")
            except Exception as e:
                logger.error(f"QuotaService: Failed to create subscription for user {user.id}: {e}")
            return actual_usage
        
        sub = user.subscription
        old_usage = sub.storage_used
        sub.storage_used = actual_usage
        sub.save(update_fields=['storage_used'])
        
        logger.info(f"QuotaService: Recalculated storage for user {user.id}: {old_usage} -> {actual_usage}")
        return actual_usage

