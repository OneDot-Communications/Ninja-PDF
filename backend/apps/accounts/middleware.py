import logging
import time
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.http import JsonResponse # Added for IP blocking response

logger = logging.getLogger('audit')

class AuditMiddleware: # Changed from MiddlewareMixin
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. IP Block Check
        user_ip = self.get_client_ip(request)
        if self.is_ip_blocked(user_ip):
            return JsonResponse({'error': 'Access denied from your IP address.'}, status=403)

        # 2. Global System Lock Check (Optional, from Settings)
        # Example: if settings.GLOBAL_SYSTEM_LOCKED: return JsonResponse({'error': 'System is currently locked for maintenance.'}, status=503)
        # For Feature.is_active, you'd typically import a Feature class/module and check its state.
        # e.g., from myapp.features import Feature
        # if not Feature.is_active('main_feature'): return JsonResponse({'error': 'Feature not active.'}, status=503)

        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time

        self.log_access(request, response, duration, user_ip)

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def is_ip_blocked(self, ip):
        # In a real app, cache this or check DB
        # For now, check hardcoded (or mock Settings)
        # BLOCKED_IPS = settings.BLOCKED_IPS
        return False

    def log_access(self, request, response, duration, ip):
        try:
            user = getattr(request, 'user', None)
            user_identity = user.email if (user and user.is_authenticated) else 'Anonymous'
            role = getattr(user, 'role', 'None') if (user and user.is_authenticated) else 'None'
            
            method = request.method
            path = request.path
            status_code = response.status_code
            
            logger.info(f"ACCESS: {method} {path} - {user_identity} ({role}) - {status_code} - {duration:.4f}s - {ip}")
            
            from apps.accounts.models.audit import AuthAuditLog
            # Only DB log significant actions or errors to avoid noise, or log everything if strict
            if status_code >= 400 or path.startswith('/api/auth') or 'admin' in path: 
                AuthAuditLog.objects.create(
                    user=user if (user and user.is_authenticated) else None,
                    event_type='ACCESS_LOG',
                    ip_address=ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:200],
                    metadata={
                        'method': method,
                        'path': path,
                        'status': status_code,
                        'duration': duration
                    }
                )
        except Exception as e:
            logger.error(f"Audit log failed: {e}")
        
