from rest_framework import permissions
from django.contrib.auth import get_user_model

def get_user_role(user):
    return getattr(user, 'role', None)

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        User = get_user_model()
        return request.user and request.user.is_authenticated and request.user.role == User.Roles.SUPER_ADMIN

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        User = get_user_model()
        return request.user and request.user.is_authenticated and (
            request.user.role == User.Roles.ADMIN or 
            request.user.role == User.Roles.SUPER_ADMIN
        )
