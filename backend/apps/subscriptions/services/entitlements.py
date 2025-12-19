from django.utils import timezone
from apps.subscriptions.models.subscription import (
    Feature, UserFeatureUsage, PlanFeature, UserFeatureOverride, RolePermission
)
from apps.accounts.models.user import User

class EntitlementService:
    @staticmethod
    def get_feature_limit(user, feature_code):
        """
        Determines the limit for a specific feature for a user.
        Returns: (limit, is_unlimited)
        """
        # 1. User Override
        try:
            override = UserFeatureOverride.objects.get(user=user, feature__code=feature_code)
            if not override.is_enabled:
                return 0, False # Explicitly disabled
            # If enabled via override, we might need a separate field for 'limit override',
            # but for now assume override = unlimited or standard system default?
            # The model UserFeatureOverride only has is_enabled. 
            # Let's assume override grants standard access, but we check plan for limits?
            # Or maybe override is just a bool toggle. 
            # If strictly following requirements, Admins might adjust usage limits per user (Task 125).
            # For now, let's look at Plan.
        except UserFeatureOverride.DoesNotExist:
            pass
            
        # 2. Plan Entitlement
        if hasattr(user, 'subscription') and user.subscription.plan:
            try:
                # Check PlanFeature
                pf = user.subscription.plan.plan_features.get(feature__code=feature_code)
                if not pf.is_enabled:
                    return 0, False
                
                # Check daily limit
                if pf.daily_limit == 0:
                    return -1, True # Unlimited
                
                return pf.daily_limit, False
            except PlanFeature.DoesNotExist:
                pass
        
        # 3. Default Free/Feature Limit
        try:
            feat = Feature.objects.get(code=feature_code)
            if feat.free_limit > 0:
                return feat.free_limit, False
        except Feature.DoesNotExist:
            pass
            
        return 0, False

    @staticmethod
    def check_usage(user, feature_code):
        """
        Checks if the user can use the feature right now (quota check).
        Returns: True if allowed, False otherwise.
        """
        if user.is_super_admin:
            return True
            
        limit, is_unlimited = EntitlementService.get_feature_limit(user, feature_code)
        
        if is_unlimited:
            return True
            
        if limit <= 0:
            return False
            
        # Check usage today
        today = timezone.now().date()
        usage, created = UserFeatureUsage.objects.get_or_create(
            user=user, 
            feature__code=feature_code, 
            date=today
        )
        
        if usage.count >= limit:
            return False
            
        return True

    @staticmethod
    def get_remaining_usage(user, feature_code):
        """
        Returns number of remaining uses today.
        Returns: (remaining_count, is_unlimited)
        """
        if user.is_super_admin:
            return -1, True
            
        limit, is_unlimited = EntitlementService.get_feature_limit(user, feature_code)
        
        if is_unlimited:
            return -1, True
            
        if limit <= 0:
            return 0, False
            
        today = timezone.now().date()
        try:
            usage = UserFeatureUsage.objects.get(
                user=user, 
                feature__code=feature_code, 
                date=today
            )
            remaining = max(0, limit - usage.count)
            return remaining, False
        except UserFeatureUsage.DoesNotExist:
            return limit, False

    @staticmethod
    def record_usage(user, feature_code, count=1):
        """
        Increments usage counter.
        """
        if user.is_super_admin:
            return
            
        today = timezone.now().date()
        usage, created = UserFeatureUsage.objects.get_or_create(
            user=user, 
            feature__code=feature_code, 
            date=today
        )
        usage.count += count
        usage.save()
