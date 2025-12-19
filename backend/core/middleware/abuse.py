"""
Abuse Detection Middleware

Integrates abuse detection into the request/response cycle.
"""
import logging
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger(__name__)


class AbuseDetectionMiddleware:
    """
    Middleware to detect and block abusive request patterns.
    
    Add to MIDDLEWARE in settings.py:
        'core.middleware.abuse.AbuseDetectionMiddleware',
    """
    
    # Paths to exclude from abuse checking
    EXCLUDED_PATHS = [
        '/admin/',
        '/static/',
        '/media/',
        '/health/',
        '/favicon.ico',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'ABUSE_DETECTION_ENABLED', True)
    
    def __call__(self, request):
        # Skip if disabled
        if not self.enabled:
            return self.get_response(request)
        
        # Skip excluded paths
        if self._is_excluded(request.path):
            return self.get_response(request)
        
        # Check for abuse
        is_blocked, message = self._check_abuse(request)
        
        if is_blocked:
            return JsonResponse(
                {
                    'error': 'Request blocked',
                    'message': message,
                    'code': 'ABUSE_DETECTED'
                },
                status=429  # Too Many Requests
            )
        
        return self.get_response(request)
    
    def _is_excluded(self, path: str) -> bool:
        """Check if path should be excluded from abuse checking"""
        for excluded in self.EXCLUDED_PATHS:
            if path.startswith(excluded):
                return True
        return False
    
    def _check_abuse(self, request) -> tuple[bool, str]:
        """
        Perform abuse detection checks.
        
        Returns:
            (is_blocked, message)
        """
        try:
            from apps.accounts.services.abuse_detector import check_request_abuse
            return check_request_abuse(request)
        except Exception as e:
            # Don't block on errors - fail open
            logger.error(f"Abuse detection error: {e}")
            return False, ""


class FileUploadAbuseMiddleware:
    """
    Middleware specifically for detecting file upload abuse.
    Should be placed after authentication middleware.
    """
    
    # Apply only to these path prefixes
    PROTECTED_PATHS = [
        '/api/tools/',
        '/api/files/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'FILE_ABUSE_DETECTION_ENABLED', True)
    
    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)
        
        # Only check protected paths
        if not self._is_protected(request.path):
            return self.get_response(request)
        
        # Only check POST/PUT requests with files
        if request.method not in ('POST', 'PUT'):
            return self.get_response(request)
        
        # Check Content-Length header
        content_length = request.META.get('CONTENT_LENGTH')
        if content_length:
            try:
                size = int(content_length)
                is_blocked, message = self._check_upload_abuse(request, size)
                
                if is_blocked:
                    return JsonResponse(
                        {
                            'error': 'Upload blocked',
                            'message': message,
                            'code': 'UPLOAD_ABUSE'
                        },
                        status=429
                    )
            except ValueError:
                pass
        
        return self.get_response(request)
    
    def _is_protected(self, path: str) -> bool:
        """Check if path should be protected"""
        for protected in self.PROTECTED_PATHS:
            if path.startswith(protected):
                return True
        return False
    
    def _check_upload_abuse(self, request, file_size: int) -> tuple[bool, str]:
        """Check for file upload abuse"""
        try:
            from apps.accounts.services.abuse_detector import get_detector
            detector = get_detector(request)
            return detector.check_large_uploads(file_size)
        except Exception as e:
            logger.error(f"Upload abuse detection error: {e}")
            return False, ""


class ToolAbuseMiddleware:
    """
    Middleware for detecting tool API abuse.
    """
    
    TOOL_PATHS = ['/api/tools/']
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, 'TOOL_ABUSE_DETECTION_ENABLED', True)
    
    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)
        
        # Only check tool paths
        if not any(request.path.startswith(p) for p in self.TOOL_PATHS):
            return self.get_response(request)
        
        # Only check POST requests (actual tool usage)
        if request.method != 'POST':
            return self.get_response(request)
        
        try:
            from apps.accounts.services.abuse_detector import get_detector
            detector = get_detector(request)
            is_blocked, message = detector.check_tool_requests()
            
            if is_blocked:
                return JsonResponse(
                    {
                        'error': 'Tool rate limit exceeded',
                        'message': message,
                        'code': 'TOOL_ABUSE'
                    },
                    status=429
                )
        except Exception as e:
            logger.error(f"Tool abuse detection error: {e}")
        
        return self.get_response(request)
