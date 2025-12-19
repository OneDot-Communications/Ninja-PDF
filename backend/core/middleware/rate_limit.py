"""Rate Limiting Middleware for DDoS Protection and Abuse Prevention"""
import time
import hashlib
import logging
from typing import Optional, Tuple
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class RateLimitMiddleware:
    """
    Rate limiting middleware for DDoS protection.
    Tasks 95-96: DDoS protection, abuse detection
    
    Features:
    - Per-IP rate limiting
    - Per-user rate limiting
    - Per-endpoint rate limiting
    - Burst allowance
    - Automatic IP blocking for repeated violations
    """
    
    # Default limits
    DEFAULT_REQUESTS_PER_MINUTE = 60
    DEFAULT_BURST_SIZE = 10
    BLOCK_DURATION_SECONDS = 300  # 5 minutes auto-block
    VIOLATION_THRESHOLD = 10  # Block after 10 violations
    
    # Endpoints with custom limits
    ENDPOINT_LIMITS = {
        '/api/auth/login/': {'rpm': 10, 'burst': 3},
        '/api/auth/signup/': {'rpm': 5, 'burst': 2},
        '/api/auth/password/reset/': {'rpm': 5, 'burst': 2},
        '/api/tools/': {'rpm': 30, 'burst': 5},
        '/api/files/upload/': {'rpm': 20, 'burst': 3},
    }
    
    # Paths to skip rate limiting
    EXEMPT_PATHS = [
        '/api/health/',
        '/admin/',
        '/static/',
        '/media/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'RATE_LIMITING_ENABLED', True)
    
    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)
        
        # Skip exempt paths
        path = request.path
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return self.get_response(request)
        
        # Get client identifier
        client_ip = self._get_client_ip(request)
        user_id = request.user.id if request.user.is_authenticated else None
        
        # Check if IP is blocked
        if self._is_blocked(client_ip):
            logger.warning(f"Blocked IP attempted access: {client_ip}")
            return JsonResponse({
                'error': 'Too many requests. You have been temporarily blocked.',
                'retry_after': self._get_block_remaining(client_ip)
            }, status=429)
        
        # Get rate limit for this endpoint
        limit_config = self._get_limit_for_path(path)
        rpm = limit_config['rpm']
        burst = limit_config['burst']
        
        # Check rate limit
        is_allowed, retry_after = self._check_rate_limit(
            client_ip, user_id, path, rpm, burst
        )
        
        if not is_allowed:
            # Record violation
            self._record_violation(client_ip)
            
            response = JsonResponse({
                'error': 'Rate limit exceeded. Please slow down.',
                'retry_after': retry_after
            }, status=429)
            response['Retry-After'] = str(retry_after)
            response['X-RateLimit-Limit'] = str(rpm)
            response['X-RateLimit-Remaining'] = '0'
            return response
        
        # Process request
        response = self.get_response(request)
        
        # Add rate limit headers
        remaining = self._get_remaining(client_ip, user_id, path, rpm)
        response['X-RateLimit-Limit'] = str(rpm)
        response['X-RateLimit-Remaining'] = str(max(0, remaining))
        
        return response
    
    def _get_client_ip(self, request) -> str:
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '0.0.0.0')
    
    def _get_limit_for_path(self, path: str) -> dict:
        """Get rate limit configuration for a path"""
        for pattern, config in self.ENDPOINT_LIMITS.items():
            if path.startswith(pattern):
                return config
        return {'rpm': self.DEFAULT_REQUESTS_PER_MINUTE, 'burst': self.DEFAULT_BURST_SIZE}
    
    def _check_rate_limit(
        self, 
        client_ip: str, 
        user_id: Optional[int], 
        path: str, 
        rpm: int, 
        burst: int
    ) -> Tuple[bool, int]:
        """
        Check if request is within rate limit using sliding window algorithm.
        Returns (is_allowed, retry_after_seconds)
        """
        now = time.time()
        window_start = now - 60  # 1 minute window
        
        # Create unique key
        if user_id:
            key = f"ratelimit:user:{user_id}:{self._hash_path(path)}"
        else:
            key = f"ratelimit:ip:{client_ip}:{self._hash_path(path)}"
        
        # Get request timestamps from cache
        timestamps = cache.get(key, [])
        
        # Remove old timestamps
        timestamps = [ts for ts in timestamps if ts > window_start]
        
        # Check if within limit
        if len(timestamps) >= rpm:
            # Calculate retry-after
            oldest = min(timestamps) if timestamps else now
            retry_after = int(60 - (now - oldest)) + 1
            return False, max(1, retry_after)
        
        # Add current timestamp
        timestamps.append(now)
        cache.set(key, timestamps, 120)  # Keep for 2 minutes
        
        return True, 0
    
    def _get_remaining(
        self, 
        client_ip: str, 
        user_id: Optional[int], 
        path: str, 
        rpm: int
    ) -> int:
        """Get remaining requests in current window"""
        now = time.time()
        window_start = now - 60
        
        if user_id:
            key = f"ratelimit:user:{user_id}:{self._hash_path(path)}"
        else:
            key = f"ratelimit:ip:{client_ip}:{self._hash_path(path)}"
        
        timestamps = cache.get(key, [])
        timestamps = [ts for ts in timestamps if ts > window_start]
        
        return rpm - len(timestamps)
    
    def _hash_path(self, path: str) -> str:
        """Create short hash of path for cache key"""
        return hashlib.md5(path.encode(), usedforsecurity=False).hexdigest()[:8]
    
    def _is_blocked(self, client_ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        return cache.get(f"blocked:{client_ip}") is not None
    
    def _get_block_remaining(self, client_ip: str) -> int:
        """Get remaining seconds until block expires"""
        ttl = cache.ttl(f"blocked:{client_ip}")
        return ttl if ttl and ttl > 0 else 0
    
    def _record_violation(self, client_ip: str):
        """Record rate limit violation and auto-block if threshold exceeded"""
        key = f"violations:{client_ip}"
        violations = cache.get(key, 0) + 1
        cache.set(key, violations, 3600)  # Track for 1 hour
        
        if violations >= self.VIOLATION_THRESHOLD:
            # Auto-block this IP
            cache.set(
                f"blocked:{client_ip}", 
                True, 
                self.BLOCK_DURATION_SECONDS
            )
            logger.warning(f"Auto-blocked IP for rate limit abuse: {client_ip}")
            
            # Log to database
            self._log_abuse(client_ip, violations)
    
    def _log_abuse(self, client_ip: str, violations: int):
        """Log abuse to database for admin review"""
        try:
            from apps.accounts.models import AuditLog
            AuditLog.objects.create(
                action_type='ADMIN_ACTION',
                resource_type='RateLimitViolation',
                resource_id=client_ip,
                description=f"IP auto-blocked after {violations} rate limit violations",
                ip_address=client_ip,
                metadata={'violations': violations}
            )
        except Exception as e:
            logger.error(f"Failed to log abuse: {e}")


class IPFilterMiddleware:
    """
    IP Whitelisting/Blacklisting middleware.
    Tasks 93-94: IP whitelisting/blacklisting
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'IP_FILTERING_ENABLED', True)
        self._ip_rules_cache = {}
        self._cache_time = 0
        self._cache_ttl = 60  # Refresh every 60 seconds
    
    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)
        
        client_ip = self._get_client_ip(request)
        path = request.path
        
        # Determine scope
        scope = self._get_scope(path)
        
        # Check blacklist first
        if self._is_blacklisted(client_ip, scope):
            logger.warning(f"Blacklisted IP blocked: {client_ip}")
            return JsonResponse({
                'error': 'Access denied.'
            }, status=403)
        
        # Check if whitelist-only mode and IP not whitelisted
        if self._is_whitelist_only(scope) and not self._is_whitelisted(client_ip, scope):
            return JsonResponse({
                'error': 'Access not permitted from this IP.'
            }, status=403)
        
        return self.get_response(request)
    
    def _get_client_ip(self, request) -> str:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '0.0.0.0')
    
    def _get_scope(self, path: str) -> str:
        if path.startswith('/admin/'):
            return 'ADMIN'
        if path.startswith('/api/'):
            return 'API'
        if path.startswith('/api/auth/'):
            return 'AUTH'
        return 'GLOBAL'
    
    def _refresh_cache(self):
        """Refresh IP rules from database"""
        now = time.time()
        if now - self._cache_time < self._cache_ttl:
            return
        
        try:
            from apps.accounts.models import IPRule
            
            self._ip_rules_cache = {
                'blacklist': {},
                'whitelist': {},
            }
            
            rules = IPRule.objects.filter(is_active=True)
            for rule in rules:
                if not rule.is_valid():
                    continue
                
                rule_type = rule.rule_type.lower()
                scope = rule.scope
                
                if scope not in self._ip_rules_cache[rule_type]:
                    self._ip_rules_cache[rule_type][scope] = set()
                
                self._ip_rules_cache[rule_type][scope].add(rule.ip_address)
            
            self._cache_time = now
        except Exception as e:
            logger.error(f"Failed to refresh IP rules: {e}")
    
    def _is_blacklisted(self, ip: str, scope: str) -> bool:
        self._refresh_cache()
        
        blacklist = self._ip_rules_cache.get('blacklist', {})
        
        # Check global blacklist
        if ip in blacklist.get('GLOBAL', set()):
            return True
        
        # Check scope-specific blacklist
        if ip in blacklist.get(scope, set()):
            return True
        
        return False
    
    def _is_whitelisted(self, ip: str, scope: str) -> bool:
        self._refresh_cache()
        
        whitelist = self._ip_rules_cache.get('whitelist', {})
        
        # Check global whitelist
        if ip in whitelist.get('GLOBAL', set()):
            return True
        
        # Check scope-specific whitelist
        if ip in whitelist.get(scope, set()):
            return True
        
        return False
    
    def _is_whitelist_only(self, scope: str) -> bool:
        """Check if scope requires whitelist"""
        # Could be configurable per-scope
        return scope == 'ADMIN'  # Admin panel requires whitelist
