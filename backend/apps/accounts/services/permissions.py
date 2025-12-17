from rest_framework import permissions
from django.contrib.auth import get_user_model
from apps.subscriptions.models.subscription import Feature, UserFeatureOverride, RolePermission

def get_user_role(user):
    return getattr(user, 'role', None)

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        User = get_user_model()
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Roles.SUPER_ADMIN)

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        User = get_user_model()
        return bool(request.user and request.user.is_authenticated and (
            request.user.role == User.Roles.ADMIN or 
            request.user.role == User.Roles.SUPER_ADMIN
        ))

def HasFeatureAccess(feature_code):
    """
    Factory to create a permission class that checks for a specific feature code.
    Usage: permission_classes = [HasFeatureAccess('MERGE_PDF')]
    """
    class FeaturePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
                
            User = get_user_model()
            # Super Admin usually has access to everything, but we can stick to strict checks if needed.
            # Usually Super Admin bypasses feature checks unless it's a "destructive" feature?
            # Let's say Super Admin has all permissions.
            if request.user.role == User.Roles.SUPER_ADMIN:
                return True

            # 1. Check User Override (Highest Priority)
            try:
                override = UserFeatureOverride.objects.get(user=request.user, feature__code=feature_code)
                return override.is_enabled
            except UserFeatureOverride.DoesNotExist:
                pass

            # 2. Check Role Permission
            # Does this role have this feature assigned?
            if RolePermission.objects.filter(role=request.user.role, feature__code=feature_code).exists():
                return True

            # 3. Check Subscription Plan Entitlements (if applicable)
            # If the feature is linked to a Plan, we check if the user's plan has it enabled.
            # Note: This might overlap with RolePermission. Usually RolePermission = "Can I access this UI/API?"
            # PlanFeature = "Do I have quota/access to this tool?"
            # If this is a Permission (like "VIEW_DASHBOARD"), Plan doesn't matter.
            # If this is a Tool (like "MERGE_PDF"), Plan matters.
            
            # For now, if RolePermission didn't grant it, we check Plan.
            if hasattr(request.user, 'subscription') and request.user.subscription.plan:
                # Check if plan enables this feature
                # We need to see if PlanFeature exists and is_enabled
                if request.user.subscription.plan.plan_features.filter(feature__code=feature_code, is_enabled=True).exists():
                    return True

            return False
            
    return FeaturePermission
