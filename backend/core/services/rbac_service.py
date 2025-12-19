from django.utils import timezone
from apps.subscriptions.models import PlanFeature, UserFeatureUsage, UserFeatureOverride, Feature, SystemSetting, RolePermission
from apps.accounts.models import User
from django.core.exceptions import ObjectDoesNotExist

class RBACService:
    """
    Central service for Role-Based Access Control and Quota Management.
    """

    @staticmethod
    def check_access(user: User, feature_code: str) -> dict:
        """
        Check if a user can access a specific feature.
        Returns: { 'allowed': bool, 'reason': str, 'limit': int, 'usage': int }
        """
        if user.is_super_admin:
            return {'allowed': True, 'reason': 'Super Admin', 'limit': -1, 'usage': 0}

        try:
            feature = Feature.objects.get(code=feature_code)
        except Feature.DoesNotExist:
            return {'allowed': False, 'reason': 'Feature not found', 'limit': 0, 'usage': 0}

        # 1. Check User Override (Explicit Allow/Deny)
        override = UserFeatureOverride.objects.filter(user=user, feature=feature).first()
        if override:
            if not override.is_enabled:
                 return {'allowed': False, 'reason': 'Manually disabled for user', 'limit': 0, 'usage': 0}
            # If enabled via override, we still might check quotas, but basic access is granted.

        # 2. Check Role-Based Permissions (For Admin Tasks or specialized roles)
        # If the feature is classified as a PERMISSION (not a TOOL), Strict Role Check applies.
        if feature.category == Feature.Category.PERMISSION:
            has_role_perm = RolePermission.objects.filter(role=user.role, feature=feature).exists()
            if has_role_perm:
                return {'allowed': True, 'reason': f'Role {user.role} granted permission', 'limit': -1, 'usage': 0}
            return {'allowed': False, 'reason': f'Role {user.role} missing permission', 'limit': 0, 'usage': 0}

        # 3. Check Plan Entitlements (Primarily for TOOLs)
        try:
            plan = user.subscription.plan
        except (AttributeError, ObjectDoesNotExist):
            plan = None

        limit = feature.free_limit # Default to free limit
        
        if plan:
            # Check PlanFeature link
            pf = PlanFeature.objects.filter(plan=plan, feature=feature).first()
            if pf:
                if not pf.is_enabled:
                    return {'allowed': False, 'reason': 'Not included in current plan', 'limit': 0, 'usage': 0}
                limit = pf.limit
            elif feature.is_premium_default and not user.is_premium:
                 return {'allowed': False, 'reason': 'Premium feature', 'limit': 0, 'usage': 0}
        else:
             # No Plan (Free User default)
             if feature.is_premium_default:
                 return {'allowed': False, 'reason': 'Premium feature', 'limit': 0, 'usage': 0}

        # 3. Check Quotas if limit is not unlimited (-1)
        usage_count = 0
        if limit != -1:
            usage_record, _ = UserFeatureUsage.objects.get_or_create(
                user=user, 
                feature=feature, 
                date=timezone.now().date()
            )
            usage_count = usage_record.count
            
            if usage_count >= limit:
                return {'allowed': False, 'reason': 'Daily limit reached', 'limit': limit, 'usage': usage_count}

        return {'allowed': True, 'reason': 'Access granted', 'limit': limit, 'usage': usage_count}

    @staticmethod
    def record_usage(user: User, feature_code: str):
        """
        Increment usage counter for a feature.
        """
        if user.is_super_admin:
            return

        feature = Feature.objects.get(code=feature_code)
        record, _ = UserFeatureUsage.objects.get_or_create(
            user=user, 
            feature=feature, 
            date=timezone.now().date()
        )
        record.count += 1
        record.save()

    @staticmethod
    def get_user_entitlements(user: User) -> dict:
        """
        Optimized version: Fetches all necessary data in bulk to avoid N+1 queries.
        """
        features = Feature.objects.all()
        entitlements = {}
        
        # 1. Bulk Prefetch
        # Plan
        plan = None
        try:
            if hasattr(user, 'subscription'):
                plan = user.subscription.plan
        except (AttributeError, ObjectDoesNotExist):
            pass
            
        # Role Permissions for this user's role
        role_perms = set(RolePermission.objects.filter(role=user.role).values_list('feature__code', flat=True))
        
        # Plan Features
        plan_features = {}
        if plan:
            pfs = PlanFeature.objects.filter(plan=plan).select_related('feature')
            for pf in pfs:
                plan_features[pf.feature.code] = {'is_enabled': pf.is_enabled, 'limit': pf.limit}
                
        # Overrides
        overrides = {
            ufo.feature.code: ufo 
            for ufo in UserFeatureOverride.objects.filter(user=user).select_related('feature')
        }
        
        # Usages (Current Day)
        usages = {
            ufu.feature.code: ufu.count
            for ufu in UserFeatureUsage.objects.filter(user=user, date=timezone.now().date()).select_related('feature')
        }
        
        # 2. In-Memory Evaluation
        for f in features:
            status = {
                'allowed': False,
                'reason': 'Denied',
                'limit': 0,
                'usage': usages.get(f.code, 0)
            }
            
            # Super Admin
            if user.is_super_admin:
                status.update({'allowed': True, 'reason': 'Super Admin', 'limit': -1})
                entitlements[f.code] = status
                continue
                
            # Override Check
            if f.code in overrides:
                ov = overrides[f.code]
                if not ov.is_enabled:
                    status.update({'allowed': False, 'reason': 'Manually disabled'})
                    entitlements[f.code] = status
                    continue
                # If enabled via override, we proceed but base permission is granted
                
            # Role Permission Check (Priority for Permissions)
            if f.category == Feature.Category.PERMISSION:
                if f.code in role_perms:
                    status.update({'allowed': True, 'reason': 'Role Permission', 'limit': -1})
                else:
                    status.update({'allowed': False, 'reason': 'Role missing permission'})
                entitlements[f.code] = status
                continue
                
            # Plan Entitlement Check (Tools)
            limit = f.free_limit
            allowed = True
            reason = 'Free Tier'
            
            if plan:
                if f.code in plan_features:
                    pf = plan_features[f.code]
                    if not pf['is_enabled']:
                        allowed = False
                        reason = 'Not incl. in Plan'
                    else:
                        limit = pf['limit']
                        reason = 'Plan Limit'
                elif f.is_premium_default and not user.is_premium:
                    allowed = False
                    reason = 'Premium Feature'
            else:
                if f.is_premium_default:
                    allowed = False
                    reason = 'Premium Feature'
            
            # Quota Check
            if allowed and limit != -1:
                if status['usage'] >= limit:
                    allowed = False
                    reason = 'Daily limit reached'
            
            status.update({'allowed': allowed, 'reason': reason, 'limit': limit})
            entitlements[f.code] = status
            
        return entitlements
        


class SystemConfigService:
    @staticmethod
    def get_setting(key: str, default=None):
        try:
            setting = SystemSetting.objects.get(key=key)
            if setting.value_type == SystemSetting.Types.INTEGER:
                return int(setting.value)
            elif setting.value_type == SystemSetting.Types.BOOLEAN:
                return setting.value.lower() == 'true'
            # JSON/String
            return setting.value
        except SystemSetting.DoesNotExist:
            return default
