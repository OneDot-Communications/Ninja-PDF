"""
Abuse Detection Service

Detects and prevents abusive behavior patterns:
- Rapid requests (DDoS-like behavior)
- Excessive failed logins
- Large file upload abuse
- API quota abuse
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class AbuseThreshold:
    """Configurable thresholds for abuse detection"""
    
    # (count, seconds) - e.g., (100, 60) = 100 requests per 60 seconds
    RAPID_REQUESTS = getattr(settings, 'ABUSE_RAPID_REQUESTS', (100, 60))
    FAILED_LOGINS = getattr(settings, 'ABUSE_FAILED_LOGINS', (5, 900))  # 5 per 15 min
    LARGE_UPLOADS = getattr(settings, 'ABUSE_LARGE_UPLOADS', (10, 3600))  # 10 per hour
    API_CALLS = getattr(settings, 'ABUSE_API_CALLS', (1000, 3600))  # 1000 per hour
    TOOL_REQUESTS = getattr(settings, 'ABUSE_TOOL_REQUESTS', (50, 300))  # 50 per 5 min


class AbuseDetector:
    """
    Detects various forms of abuse and takes appropriate action.
    Uses Redis cache for distributed counting.
    """
    
    CACHE_PREFIX = 'abuse:'
    
    def __init__(self, user=None, ip_address=None):
        self.user = user
        self.ip_address = ip_address
        self.user_id = str(user.id) if user and user.is_authenticated else 'anon'
    
    def _get_cache_key(self, abuse_type: str) -> str:
        """Generate cache key for tracking"""
        identifier = self.user_id if self.user else self.ip_address or 'unknown'
        return f"{self.CACHE_PREFIX}{abuse_type}:{identifier}"
    
    def _increment_counter(self, abuse_type: str, ttl_seconds: int) -> int:
        """Increment and return the count for an abuse type"""
        key = self._get_cache_key(abuse_type)
        
        # Try to increment existing counter
        count = cache.get(key, 0)
        count += 1
        cache.set(key, count, timeout=ttl_seconds)
        
        return count
    
    def _get_count(self, abuse_type: str) -> int:
        """Get current count for an abuse type"""
        key = self._get_cache_key(abuse_type)
        return cache.get(key, 0)
    
    def check_rapid_requests(self) -> tuple[bool, str]:
        """
        Check for rapid request patterns.
        
        Returns:
            (is_abusive, message)
        """
        limit, window = AbuseThreshold.RAPID_REQUESTS
        count = self._increment_counter('rapid', window)
        
        if count > limit:
            logger.warning(
                f"Rapid request abuse detected: user={self.user_id}, ip={self.ip_address}, count={count}"
            )
            return True, f"Too many requests. Limit: {limit} per {window} seconds"
        
        return False, ""
    
    def check_failed_logins(self) -> tuple[bool, str]:
        """Check for excessive failed login attempts"""
        limit, window = AbuseThreshold.FAILED_LOGINS
        count = self._get_count('failed_login')
        
        if count >= limit:
            logger.warning(
                f"Failed login abuse detected: user={self.user_id}, ip={self.ip_address}, count={count}"
            )
            return True, f"Too many failed login attempts. Try again in {window // 60} minutes"
        
        return False, ""
    
    def record_failed_login(self):
        """Record a failed login attempt"""
        _, window = AbuseThreshold.FAILED_LOGINS
        self._increment_counter('failed_login', window)
    
    def clear_failed_logins(self):
        """Clear failed login counter on successful login"""
        key = self._get_cache_key('failed_login')
        cache.delete(key)
    
    def check_large_uploads(self, file_size_bytes: int) -> tuple[bool, str]:
        """
        Check for excessive large file uploads.
        
        Args:
            file_size_bytes: Size of the file being uploaded
        """
        # Only track uploads over 10MB
        if file_size_bytes < 10 * 1024 * 1024:
            return False, ""
        
        limit, window = AbuseThreshold.LARGE_UPLOADS
        count = self._increment_counter('large_upload', window)
        
        if count > limit:
            logger.warning(
                f"Large upload abuse detected: user={self.user_id}, count={count}"
            )
            return True, f"Too many large file uploads. Limit: {limit} per hour"
        
        return False, ""
    
    def check_api_usage(self) -> tuple[bool, str]:
        """Check for excessive API usage"""
        limit, window = AbuseThreshold.API_CALLS
        count = self._increment_counter('api', window)
        
        if count > limit:
            logger.warning(
                f"API abuse detected: user={self.user_id}, count={count}"
            )
            return True, f"API rate limit exceeded. Limit: {limit} per hour"
        
        return False, ""
    
    def check_tool_requests(self) -> tuple[bool, str]:
        """Check for excessive tool usage"""
        limit, window = AbuseThreshold.TOOL_REQUESTS
        count = self._increment_counter('tool', window)
        
        if count > limit:
            logger.warning(
                f"Tool abuse detected: user={self.user_id}, count={count}"
            )
            return True, f"Too many tool requests. Limit: {limit} per {window // 60} minutes"
        
        return False, ""
    
    def check_all(self) -> list[tuple[str, str]]:
        """
        Run all abuse checks.
        
        Returns:
            List of (abuse_type, message) for any triggered checks
        """
        violations = []
        
        is_abusive, msg = self.check_rapid_requests()
        if is_abusive:
            violations.append(('rapid_requests', msg))
        
        is_abusive, msg = self.check_api_usage()
        if is_abusive:
            violations.append(('api_usage', msg))
        
        return violations
    
    def auto_flag_user(self, reasons: list[str]):
        """
        Automatically flag user for admin review.
        
        Args:
            reasons: List of abuse types triggered
        """
        if not self.user or not self.user.is_authenticated:
            return
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=self.user.id)
            
            if not user.is_flagged:
                user.is_flagged = True
                user.flagged_reason = f"Auto-flagged for abuse: {', '.join(reasons)}"
                user.flagged_at = timezone.now()
                user.save(update_fields=['is_flagged', 'flagged_reason', 'flagged_at'])
                
                logger.warning(f"User {user.email} auto-flagged for abuse: {reasons}")
                
                # Create audit log
                from apps.accounts.models import AuditLog
                AuditLog.objects.create(
                    user=user,
                    action_type='SECURITY',
                    resource_type='User',
                    resource_id=str(user.id),
                    description=f'Auto-flagged for abuse: {", ".join(reasons)}',
                    ip_address=self.ip_address or '',
                )
        except Exception as e:
            logger.error(f"Failed to auto-flag user: {e}")


def get_detector(request) -> AbuseDetector:
    """
    Create an AbuseDetector from a Django request.
    
    Args:
        request: Django HttpRequest
    
    Returns:
        Configured AbuseDetector
    """
    user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    
    # Get IP address
    ip_address = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    if not ip_address:
        ip_address = request.META.get('REMOTE_ADDR', '')
    
    return AbuseDetector(user=user, ip_address=ip_address)


def check_request_abuse(request) -> tuple[bool, str]:
    """
    Quick check for request-level abuse.
    
    Args:
        request: Django HttpRequest
    
    Returns:
        (is_blocked, message)
    """
    detector = get_detector(request)
    violations = detector.check_all()
    
    if violations:
        # Auto-flag if multiple violations
        if len(violations) >= 2:
            detector.auto_flag_user([v[0] for v in violations])
        
        return True, violations[0][1]
    
    return False, ""
