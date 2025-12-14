from rest_framework import permissions
from billing.models import Subscription

class IsPremium(permissions.BasePermission):
    """
    Allows access only to users with an active premium subscription.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Super Admins are always Premium
        if request.user.role == 'SUPER_ADMIN':
            return True
            
        # Check Subscription
        try:
            sub = request.user.subscription
            if sub.status == 'ACTIVE':
                # Optional: Check expiry date if using strict dates 
                # (Assuming cron job or middleware updates status on expiry, 
                # or we check here)
                from django.utils import timezone
                if sub.current_period_end and sub.current_period_end < timezone.now():
                    return False
                return True
        except Subscription.DoesNotExist:
            pass
            
        return False
