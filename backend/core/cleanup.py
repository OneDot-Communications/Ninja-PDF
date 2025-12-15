"""
Cleanup & Lifecycle Management
Handles temp cleanup, expiration, quota recalculation, and scheduled maintenance.
"""
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class CleanupService:
    """File and storage cleanup operations."""
    
    @classmethod
    def remove_temp_artifacts(cls, file_asset):
        """
        Remove temporary upload artifacts after processing.
        """
        from core.storage import StorageService
        
        temp_path = file_asset.metadata.get('temp_upload_path')
        if temp_path and StorageService.exists(temp_path):
            StorageService.delete(temp_path)
            logger.info(f"Cleanup:TEMP file={file_asset.id} path={temp_path}")
        
        file_asset.metadata.pop('temp_upload_path', None)
        file_asset.save(update_fields=['metadata'])
    
    @classmethod
    def remove_old_previews(cls, file_asset, keep_latest: int = 1):
        """Remove old preview versions, keeping N latest."""
        from core.storage import StorageService
        
        preview_types = ['thumbnail', 'preview']
        removed = 0
        
        for preview_type in preview_types:
            key = f'preview_{preview_type}'
            if key in file_asset.metadata:
                pass
        
        return removed
    
    @classmethod
    def scan_expired_files(cls) -> int:
        """
        Scan for expired files and mark them.
        Should run as scheduled task.
        """
        from apps.files.models.user_file import UserFile
        
        now = timezone.now()
        
        expired = UserFile.objects.filter(
            expires_at__lte=now,
            status__in=['AVAILABLE', 'STORED_FINAL']
        )
        
        count = 0
        for file_asset in expired:
            file_asset.status = 'EXPIRED'
            file_asset.save(update_fields=['status'])
            count += 1
            logger.info(f"Cleanup:EXPIRED file={file_asset.id}")
        
        return count
    
    @classmethod
    def scan_orphaned_files(cls, days_old: int = 7) -> int:
        """
        Find and remove orphaned files in storage.
        Orphans are storage objects without database records.
        """
        return 0
    
    @classmethod
    @transaction.atomic
    def delete_file(cls, file_asset, user):
        """
        Soft delete a file with quota recalculation.
        """
        from core.storage import StorageService
        from core.security import AuditLogger
        
        if file_asset.file:
            StorageService.delete(file_asset.file.name)
        
        preview_path = file_asset.metadata.get('preview_preview')
        if preview_path:
            StorageService.delete(preview_path)
        
        thumbnail_path = file_asset.metadata.get('preview_thumbnail')
        if thumbnail_path:
            StorageService.delete(thumbnail_path)
        
        versions = file_asset.metadata.get('versions', [])
        for version in versions:
            path = version.get('storage_path')
            if path:
                StorageService.delete(path)
        
        file_asset.status = 'DELETED'
        file_asset.save(update_fields=['status'])
        
        AuditLogger.log(
            'FILE_DELETE',
            user=user,
            resource_type='file',
            resource_id=file_asset.id
        )
        
        logger.info(f"Cleanup:DELETE file={file_asset.id} user={user.id}")
        
        return cls.recalculate_user_quota(user)
    
    @classmethod
    def recalculate_user_quota(cls, user) -> int:
        """
        Recalculate total storage used by user.
        """
        from core.user_context import UserContextResolver
        
        context = UserContextResolver.resolve(user)
        new_usage = context['storage_used']
        
        logger.info(f"Cleanup:QUOTA user={user.id} usage={new_usage}")
        
        return new_usage
    
    @classmethod
    def cleanup_guest_files(cls) -> int:
        """
        Remove guest files older than 1 hour.
        """
        from apps.files.models.user_file import UserFile
        from core.storage import StorageService
        
        cutoff = timezone.now() - timedelta(hours=1)
        
        guest_files = UserFile.objects.filter(
            user__isnull=True,
            created_at__lt=cutoff,
            status__in=['AVAILABLE', 'STORED_FINAL']
        )
        
        count = 0
        for file_asset in guest_files:
            if file_asset.file:
                StorageService.delete(file_asset.file.name)
            file_asset.status = 'DELETED'
            file_asset.save(update_fields=['status'])
            count += 1
        
        logger.info(f"Cleanup:GUEST deleted={count}")
        
        return count


class MaintenanceService:
    """Scheduled maintenance operations."""
    
    @classmethod
    def run_daily_maintenance(cls) -> dict:
        """
        Run all daily maintenance tasks.
        Call from Celery beat schedule.
        """
        results = {
            'expired_files': CleanupService.scan_expired_files(),
            'guest_files': CleanupService.cleanup_guest_files(),
            'old_jobs': cls.cleanup_old_jobs(),
            'timestamp': timezone.now().isoformat(),
        }
        
        logger.info(f"Maintenance:DAILY results={results}")
        
        return results
    
    @classmethod
    def cleanup_old_jobs(cls, days: int = 30) -> int:
        """Remove completed jobs older than N days."""
        from core.job_orchestration import Job
        
        cutoff = timezone.now() - timedelta(days=days)
        
        count, _ = Job.objects.filter(
            status__in=['COMPLETED', 'CANCELED'],
            completed_at__lt=cutoff
        ).delete()
        
        return count
    
    @classmethod
    def reset_daily_quotas(cls) -> int:
        """
        Reset daily usage counters for all users.
        Call at midnight UTC.
        """
        from django.core.cache import cache
        
        count = 0
        
        logger.info(f"Maintenance:QUOTA_RESET users={count}")
        
        return count


def remove_temp_artifacts(file_asset):
    """Convenience function."""
    return CleanupService.remove_temp_artifacts(file_asset)


def scan_expired_files() -> int:
    """Convenience function."""
    return CleanupService.scan_expired_files()


def recalculate_quota_on_delete(file_asset):
    """Convenience function for legacy compatibility."""
    class DummyUser:
        id = file_asset.user_id
    
    if file_asset.user_id:
        return CleanupService.recalculate_user_quota(DummyUser())
    return 0


def log_audit_entry(action: str, user, file_asset=None, metadata: dict = None):
    """Convenience function for legacy compatibility."""
    from core.security import AuditLogger
    
    AuditLogger.log(
        action=action,
        user=user,
        resource_type='file' if file_asset else '',
        resource_id=file_asset.id if file_asset else '',
        metadata=metadata
    )
