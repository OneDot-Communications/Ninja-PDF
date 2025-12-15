"""
Security Layer - Authorization & Access Control
"""
from django.conf import settings
from django.utils import timezone
from common.exceptions import AuthorizationError
import logging

logger = logging.getLogger(__name__)


class AccessControl:
    """File access control and isolation."""
    
    @staticmethod
    def can_access_file(user, file_asset) -> bool:
        """
        Check if user can access a file.
        Enforces per-user file isolation.
        """
        if not user or not user.is_authenticated:
            return False
        
        if user.role in ('SUPER_ADMIN', 'ADMIN'):
            return True
        
        if file_asset.user_id != user.id:
            logger.warning(
                f"Access violation: User {user.id} attempted to access file {file_asset.id} "
                f"owned by user {file_asset.user_id}"
            )
            return False
        
        return True
    
    @staticmethod
    def enforce_access(user, file_asset):
        """Raise exception if access denied."""
        if not AccessControl.can_access_file(user, file_asset):
            raise AuthorizationError(
                message="You do not have access to this file.",
                details={'file_id': file_asset.id}
            )
    
    @staticmethod
    def can_perform_action(user, action: str, resource=None) -> bool:
        """
        Check if user can perform a specific action.
        
        Actions:
        - 'upload': Upload a file
        - 'process': Process a file with a tool
        - 'use_premium_tool': Use a premium-only tool
        - 'use_ai': Use AI features
        - 'create_workflow': Create automation workflow
        - 'admin_action': Admin panel actions
        """
        if not user or not user.is_authenticated:
            return action in ('upload',)  # Guests can only upload (temp)
        
        if user.role in ('SUPER_ADMIN', 'ADMIN'):
            return True
        
        tier = getattr(user, 'tier', 'FREE')
        
        action_permissions = {
            'upload': True,
            'process': True,
            'use_premium_tool': tier in ('PREMIUM', 'TEAM'),
            'use_ai': tier in ('PREMIUM', 'TEAM'),
            'create_workflow': tier in ('PREMIUM', 'TEAM'),
            'admin_action': False,
        }
        
        return action_permissions.get(action, False)


class InternalAuth:
    """Internal service-to-service authentication."""
    
    @staticmethod
    def validate_internal_request(request) -> bool:
        """
        Validate internal service token for zero-trust communication.
        """
        token = request.headers.get('X-Internal-Service-Token')
        expected = getattr(settings, 'INTERNAL_SERVICE_TOKEN', None)
        
        if not expected:
            logger.warning("INTERNAL_SERVICE_TOKEN not configured")
            return True  # Allow in development
        
        if token != expected:
            logger.warning("Invalid internal service token")
            return False
        
        return True
