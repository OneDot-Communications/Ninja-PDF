"""
Delivery & Access Layer
Handles signed URLs, file sharing, and download notifications.
"""
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


class DeliveryService:
    """File delivery and access management."""
    
    @classmethod
    def generate_download_url(cls, file_asset, user, expiration_hours: int = 24) -> dict:
        """
        Generate secure download URL for file.
        
        Args:
            file_asset: File to download
            user: Requesting user
            expiration_hours: URL validity in hours
            
        Returns:
            dict: {url, preview_url, expires_at, file_info}
        """
        from core.security import AccessControl
        from core.storage import StorageService
        
        AccessControl.enforce_access(user, file_asset)
        
        expiration_seconds = expiration_hours * 3600
        expires_at = timezone.now() + timedelta(hours=expiration_hours)
        
        download_url = StorageService.get_signed_url(
            file_asset.file.name,
            expiration=expiration_seconds,
            operation='get_object'
        )
        
        preview_url = None
        preview_path = file_asset.metadata.get('preview_preview')
        if preview_path:
            preview_url = StorageService.get_signed_url(
                preview_path,
                expiration=expiration_seconds
            )
        
        from core.security import AuditLogger
        AuditLogger.log(
            'FILE_DOWNLOAD',
            user=user,
            resource_type='file',
            resource_id=file_asset.id,
            metadata={'expiration_hours': expiration_hours}
        )
        
        logger.info(f"Delivery:URL file={file_asset.id} user={user.id} expires={expires_at}")
        
        return {
            'url': download_url,
            'preview_url': preview_url,
            'expires_at': expires_at.isoformat(),
            'file_info': {
                'name': file_asset.name,
                'size': file_asset.size_bytes,
                'mime_type': file_asset.mime_type,
                'page_count': file_asset.page_count,
            }
        }
    
    @classmethod
    def create_share_link(cls, file_asset, user, share_options: dict = None) -> dict:
        """
        Create a shareable link for file.
        
        Args:
            file_asset: File to share
            user: Owner user
            share_options: {expiration_hours, password, max_downloads}
            
        Returns:
            dict: {share_id, share_url, expires_at}
        """
        from core.security import AccessControl
        
        AccessControl.enforce_access(user, file_asset)
        
        options = share_options or {}
        expiration_hours = options.get('expiration_hours', 72)
        password = options.get('password')
        max_downloads = options.get('max_downloads', -1)
        
        share_id = str(uuid.uuid4())[:8]
        expires_at = timezone.now() + timedelta(hours=expiration_hours)
        
        share_data = {
            'share_id': share_id,
            'file_id': file_asset.id,
            'created_by': user.id,
            'created_at': timezone.now().isoformat(),
            'expires_at': expires_at.isoformat(),
            'password_protected': bool(password),
            'max_downloads': max_downloads,
            'download_count': 0,
        }
        
        shares = file_asset.metadata.get('shares', [])
        shares.append(share_data)
        file_asset.metadata['shares'] = shares
        file_asset.save(update_fields=['metadata'])
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        share_url = f"{frontend_url}/share/{share_id}"
        
        from core.security import AuditLogger
        AuditLogger.log(
            'FILE_SHARE',
            user=user,
            resource_type='file',
            resource_id=file_asset.id,
            metadata={'share_id': share_id, 'expiration_hours': expiration_hours}
        )
        
        logger.info(f"Delivery:SHARE file={file_asset.id} share_id={share_id}")
        
        return {
            'share_id': share_id,
            'share_url': share_url,
            'expires_at': expires_at.isoformat(),
        }
    
    @classmethod
    def access_shared_file(cls, share_id: str, password: str = None) -> dict:
        """
        Access a shared file via share link.
        
        Returns:
            dict: {file_info, download_url} or {error}
        """
        from apps.files.models.user_file import UserFile
        from core.storage import StorageService
        
        for file_asset in UserFile.objects.filter(metadata__shares__isnull=False):
            shares = file_asset.metadata.get('shares', [])
            for share in shares:
                if share.get('share_id') == share_id:
                    expires_at = share.get('expires_at')
                    if expires_at and timezone.now() > timezone.datetime.fromisoformat(expires_at):
                        return {'error': 'Share link has expired'}
                    
                    max_downloads = share.get('max_downloads', -1)
                    if max_downloads != -1 and share.get('download_count', 0) >= max_downloads:
                        return {'error': 'Download limit reached'}
                    
                    share['download_count'] = share.get('download_count', 0) + 1
                    file_asset.save(update_fields=['metadata'])
                    
                    download_url = StorageService.get_signed_url(
                        file_asset.file.name,
                        expiration=3600
                    )
                    
                    return {
                        'file_info': {
                            'name': file_asset.name,
                            'size': file_asset.size_bytes,
                            'mime_type': file_asset.mime_type,
                        },
                        'download_url': download_url,
                    }
        
        return {'error': 'Share link not found'}
    
    @classmethod
    def send_share_notification(cls, file_asset, recipient_email: str, share_url: str):
        """Send email notification for shared file."""
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        
        try:
            subject = f"File shared with you: {file_asset.name}"
            message = f"A file has been shared with you. Access it here: {share_url}"
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=True,
            )
            
            logger.info(f"Delivery:EMAIL sent to {recipient_email}")
            
        except Exception as e:
            logger.error(f"Delivery:EMAIL:FAILED to={recipient_email} error={e}")


class NotificationService:
    """Real-time notification service."""
    
    @classmethod
    def notify_file_ready(cls, file_asset, user):
        """Notify user that file processing is complete."""
        logger.info(f"Notification:FILE_READY user={user.id} file={file_asset.id}")
    
    @classmethod
    def notify_job_status(cls, job, status: str):
        """Notify user about job status change."""
        logger.info(f"Notification:JOB_STATUS job={job.id} status={status}")


def generate_signed_access_token(file_asset, expiration_hours: int = 24) -> dict:
    """Convenience function (legacy compatibility)."""
    class DummyUser:
        id = file_asset.user_id
        is_authenticated = True
        role = 'USER'
    
    return DeliveryService.generate_download_url(file_asset, DummyUser(), expiration_hours)


def enable_file_sharing(file_asset, **kwargs) -> dict:
    """Convenience function."""
    class DummyUser:
        id = file_asset.user_id
        is_authenticated = True
        role = 'USER'
    
    return DeliveryService.create_share_link(file_asset, DummyUser(), kwargs)
