from dj_rest_auth.jwt_auth import JWTCookieAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _
from apps.accounts.models.session import UserSession
import uuid

class SessionEnforcedAuthentication(JWTCookieAuthentication):
    """
    Extends JWTCookieAuthentication to enforce that the session_id 
    embedded in the JWT still exists and is active in the database.
    This allows for immediate revocation of specific sessions.
    """
    def authenticate(self, request):
        auth_result = super().authenticate(request)
        
        if auth_result is None:
            return None
            
        user, token = auth_result
        
        # If token is not a ValidatedToken (dictionary or object), skip check
        # SimpleJWT tokens behave like dicts
        try:
            session_id = token.get('session_id')
            if session_id:
                # Validate that the session exists in DB
                # We can also check is_active=True if we use soft deletes
                if not UserSession.objects.filter(id=session_id).exists():
                    # Return None to treat as anonymous, allowing public views (like login) to proceed
                    return None
        except (AttributeError, ValueError, TypeError):
            # Token doesn't support get() or session_id is invalid
            pass
            
        return user, token

from rest_framework.authentication import BaseAuthentication
class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        api_key_header = request.headers.get('X-API-Key')
        if not api_key_header:
            return None

        # Expected format: nk_prefix_secret
        if not api_key_header.startswith('nk_'):
            return None
        
        parts = api_key_header.split('_')
        if len(parts) != 3:
            return None
            
        prefix = parts[1]
        
        from apps.accounts.models import APIKey
        try:
            # Optimize: filter by prefix first
            # Since prefix is not unique globally (it's random 4 bytes), there might be collisions, but unlikely.
            # Best to filter by prefix, then check hash.
            # But wait, create_key uses secrets.token_hex(4) = 8 chars.
            # We didn't enforce valid uniqueness on prefix in model, but 4 bytes is small space? No, 4 bytes = 32 bits = 4 billion. 
            # Collisions rare.
            
            # Find key candidates
            keys = APIKey.objects.filter(prefix=prefix, is_active=True)
            for key_obj in keys:
                if key_obj.verify(api_key_header):
                    if not key_obj.user.is_active:
                        raise AuthenticationFailed(_('User inactive or deleted.'))
                    
                    # Update usage stats (async or blocking? blocking is fine for now)
                    from django.utils import timezone
                    key_obj.last_used_at = timezone.now()
                    key_obj.save(update_fields=['last_used_at'])
                    
                    return (key_obj.user, None)
                    
            raise AuthenticationFailed(_('Invalid API Key.'))
            
        except APIKey.DoesNotExist:
            raise AuthenticationFailed(_('Invalid API Key.'))
