from core.models import AuditLog
from django.utils import timezone

class AuditService:
    @staticmethod
    def log(actor, action, target, details=None, ip_address=None, request=None):
        """
        Log an action to the AuditLog.
        """
        if not details:
            details = {}
        
        # If request provided, try to extract IP and Actor if missing
        if request:
            if not ip_address:
                ip_address = AuditService.get_client_ip(request)
            if not actor and hasattr(request, 'user'):
                actor = request.user
        
        # Ensure actor is a real user instance or None
        if actor and not actor.is_authenticated:
            actor = None

        try:
            AuditLog.objects.create(
                actor=actor,
                action=action,
                target=str(target), # Ensure string
                details=details,
                ip_address=ip_address,
                timestamp=timezone.now()
            )
        except Exception as e:
            # Fallback logging if DB fails (shouldn't happen often)
            print(f"FAILED TO AUDIT LOG: {e}")

    @staticmethod
    def get_client_ip(request):
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            return ip
        except:
            return None
