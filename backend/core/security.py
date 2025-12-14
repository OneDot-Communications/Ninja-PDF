"""
Security & Access Control
Enterprise-grade security layer with file isolation, audit logging, and GDPR compliance.
"""
from django.conf import settings
from django.utils import timezone
from django.db import models, transaction
import logging

logger = logging.getLogger(__name__)


class SecurityError(Exception):
    """Security violation exception."""
    pass


class AccessControl:
    """File and resource access control."""
    
    @staticmethod
    def can_access_file(user, file_asset) -> bool:
        """
        Check if user can access a file.
        Enforces per-user file isolation.
        """
        if not user or not user.is_authenticated:
            return False
        
        if hasattr(user, 'role') and user.role in ('SUPER_ADMIN', 'ADMIN'):
            return True
        
        if file_asset.user_id != user.id:
            logger.warning(
                f"Security:ACCESS_DENIED user={user.id} file={file_asset.id} owner={file_asset.user_id}"
            )
            return False
        
        return True
    
    @staticmethod
    def enforce_access(user, file_asset):
        """Raise exception if access denied."""
        if not AccessControl.can_access_file(user, file_asset):
            raise SecurityError("Access denied to this file")
    
    @staticmethod
    def can_perform_action(user, action: str, resource=None) -> bool:
        """
        Check if user can perform an action.
        
        Actions: upload, process, use_premium, use_ai, create_workflow, admin
        """
        if not user or not user.is_authenticated:
            return action in ('upload',)
        
        if hasattr(user, 'role') and user.role in ('SUPER_ADMIN', 'ADMIN'):
            return True
        
        from core.user_context import UserContextResolver
        context = UserContextResolver.resolve(user)
        
        action_map = {
            'upload': context['can_upload'],
            'process': context['can_process'],
            'use_premium': context['can_use_premium'],
            'use_ai': context['can_use_ai'],
            'create_workflow': context['can_use_automation'],
            'admin': False,
        }
        
        return action_map.get(action, False)


class AuditLog(models.Model):
    """
    Immutable audit log for security-sensitive operations.
    """
    
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'User Login'
        LOGOUT = 'LOGOUT', 'User Logout'
        FILE_UPLOAD = 'FILE_UPLOAD', 'File Uploaded'
        FILE_DOWNLOAD = 'FILE_DOWNLOAD', 'File Downloaded'
        FILE_DELETE = 'FILE_DELETE', 'File Deleted'
        FILE_SHARE = 'FILE_SHARE', 'File Shared'
        PAYMENT = 'PAYMENT', 'Payment Processed'
        SUBSCRIPTION_CHANGE = 'SUBSCRIPTION_CHANGE', 'Subscription Changed'
        PASSWORD_CHANGE = 'PASSWORD_CHANGE', 'Password Changed'
        GDPR_EXPORT = 'GDPR_EXPORT', 'GDPR Data Export'
        GDPR_DELETE = 'GDPR_DELETE', 'GDPR Data Deletion'
        ADMIN_ACTION = 'ADMIN_ACTION', 'Admin Action'
        SECURITY_ALERT = 'SECURITY_ALERT', 'Security Alert'
    
    id = models.BigAutoField(primary_key=True)
    action = models.CharField(max_length=50, choices=Action.choices, db_index=True)
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    
    metadata = models.JSONField(default=dict, blank=True)
    
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        app_label = 'core'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
    
    def save(self, *args, **kwargs):
        if self.pk:
            raise SecurityError("Audit logs are immutable")
        super().save(*args, **kwargs)


class AuditLogger:
    """Audit logging service."""
    
    @classmethod
    def log(cls, action: str, user=None, request=None, resource_type: str = '', resource_id: str = '', metadata: dict = None):
        """
        Create an audit log entry.
        """
        ip_address = None
        user_agent = ''
        
        if request:
            ip_address = cls._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        AuditLog.objects.create(
            action=action,
            user=user if user and user.is_authenticated else None,
            resource_type=resource_type,
            resource_id=str(resource_id),
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
        )
        
        logger.info(f"Audit:{action} user={user.id if user else 'anon'} resource={resource_type}:{resource_id}")
    
    @staticmethod
    def _get_client_ip(request) -> str:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class GDPRService:
    """GDPR compliance operations."""
    
    @classmethod
    @transaction.atomic
    def export_user_data(cls, user) -> dict:
        """
        Export all user data for GDPR data portability.
        """
        from apps.files.models.user_file import UserFile
        from core.job_orchestration import Job
        
        data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
            },
            'files': [],
            'jobs': [],
            'audit_logs': [],
        }
        
        for f in UserFile.objects.filter(user=user):
            data['files'].append({
                'id': f.id,
                'name': f.name,
                'size_bytes': f.size_bytes,
                'mime_type': f.mime_type,
                'status': f.status,
                'created_at': f.created_at.isoformat(),
            })
        
        for j in Job.objects.filter(user=user):
            data['jobs'].append({
                'id': str(j.id),
                'tool': j.tool_type,
                'status': j.status,
                'created_at': j.created_at.isoformat(),
            })
        
        for log in AuditLog.objects.filter(user=user)[:1000]:
            data['audit_logs'].append({
                'action': log.action,
                'timestamp': log.timestamp.isoformat(),
                'metadata': log.metadata,
            })
        
        AuditLogger.log('GDPR_EXPORT', user=user, resource_type='user', resource_id=user.id)
        
        return data
    
    @classmethod
    @transaction.atomic
    def delete_user_data(cls, user) -> dict:
        """
        Perform full GDPR deletion.
        Removes all personal data while preserving anonymized audit records.
        """
        from apps.files.models.user_file import UserFile
        from core.job_orchestration import Job
        from core.storage import StorageService
        
        deleted = {'files': 0, 'jobs': 0}
        
        for file_asset in UserFile.objects.filter(user=user):
            if file_asset.file:
                StorageService.delete(file_asset.file.name)
            deleted['files'] += 1
        UserFile.objects.filter(user=user).delete()
        
        deleted['jobs'] = Job.objects.filter(user=user).delete()[0]
        
        AuditLogger.log(
            'GDPR_DELETE',
            user=user,
            resource_type='user',
            resource_id=user.id,
            metadata=deleted
        )
        
        user.first_name = 'DELETED'
        user.last_name = 'USER'
        user.is_active = False
        user.save(update_fields=['first_name', 'last_name', 'is_active'])
        
        logger.info(f"GDPR:DELETE user={user.id} files={deleted['files']} jobs={deleted['jobs']}")
        
        return deleted


class InternalAuth:
    """Internal service-to-service authentication."""
    
    @staticmethod
    def validate_internal_request(request) -> bool:
        """Validate internal service token for zero-trust communication."""
        token = request.headers.get('X-Internal-Service-Token')
        expected = getattr(settings, 'INTERNAL_SERVICE_TOKEN', None)
        
        if not expected:
            if settings.DEBUG:
                return True
            return False
        
        return token == expected


def enforce_file_isolation(user, file_asset) -> bool:
    """Convenience function."""
    return AccessControl.can_access_file(user, file_asset)


def generate_secure_access(file_asset, user, expiration_hours: int = 1) -> dict:
    """Generate secure access URL for file."""
    AccessControl.enforce_access(user, file_asset)
    
    from core.storage import StorageService
    
    url = StorageService.get_signed_url(
        file_asset.file.name,
        expiration=expiration_hours * 3600
    )
    
    return {
        'url': url,
        'expires_at': (timezone.now() + timezone.timedelta(hours=expiration_hours)).isoformat()
    }


def gdpr_full_delete(user) -> dict:
    """Convenience function."""
    return GDPRService.delete_user_data(user)
