from django.core.cache import cache
from billing.models import UserFeatureUsage, Feature
from django.conf import settings
from datetime import date
import logging

logger = logging.getLogger(__name__)

class QuotaManager:
    # Hard limit for guests per day
    GUEST_DAILY_LIMIT = 2
    
    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @staticmethod
    def check_guest_quota(request):
        """
        Returns True if guest is within limits, False if blocked.
        """
        ip = QuotaManager.get_client_ip(request)
        key = f"guest:usage:{ip}:{date.today()}"
        count = cache.get(key, 0)
        return count < QuotaManager.GUEST_DAILY_LIMIT

    @staticmethod
    def increment_guest_quota(request):
        ip = QuotaManager.get_client_ip(request)
        key = f"guest:usage:{ip}:{date.today()}"
        try:
            cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=86400) # Expire in 24 hours

    @staticmethod
    def check_user_quota(user, feature_code):
        """
        Returns True if user is within limits, False if blocked.
        """
        if user.is_premium or user.is_super_admin:
            return True # Unlimited for Pro/Premium/Admin
            
        try:
            feature = Feature.objects.get(code=feature_code)
        except Feature.DoesNotExist:
            logger.warning(f"Feature {feature_code} not found. Allowing access.")
            return True 
            
        # If premium only default
        if feature.is_premium_default:
            return False

        limit = feature.free_limit
        # If limit is 0 and not premium default -> Unlimited Free Tool? 
        # Or 0 means "0 allowed"? Usually 0 means "Strictly Premium" if combined with is_premium_default.
        # If is_premium_default=False and limit=0, let's assume unlimited for now or need clarity.
        # Blueprint says "Soft limits encouraging upgrade". Let's assume 0 = unlimited if not premium default.
        if limit == 0:
             return True

        # Check Database Usage
        usage, _ = UserFeatureUsage.objects.get_or_create(user=user, feature=feature, date=date.today())
        return usage.count < limit

    @staticmethod
    def increment_user_quota(user, feature_code):
        if user.is_premium or user.is_super_admin:
            return 
            
        try:
            feature = Feature.objects.get(code=feature_code)
        except Feature.DoesNotExist:
            return

        usage, _ = UserFeatureUsage.objects.get_or_create(user=user, feature=feature, date=date.today())
        usage.count += 1
        usage.save()
