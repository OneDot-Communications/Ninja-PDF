"""
File State Machine
Enforces strict state transitions and logs all changes.
"""
from django.db import models
from django.utils import timezone
from .constants import FileStatus
import logging

logger = logging.getLogger(__name__)


VALID_TRANSITIONS = {
    FileStatus.CREATED: [FileStatus.UPLOADING, FileStatus.FAILED, FileStatus.DELETED],
    FileStatus.UPLOADING: [FileStatus.VALIDATED, FileStatus.FAILED],
    FileStatus.VALIDATED: [FileStatus.TEMP_STORED, FileStatus.FAILED],
    FileStatus.TEMP_STORED: [FileStatus.METADATA_REGISTERED, FileStatus.FAILED],
    FileStatus.METADATA_REGISTERED: [FileStatus.QUEUED, FileStatus.FAILED],
    FileStatus.QUEUED: [FileStatus.PROCESSING, FileStatus.FAILED],
    FileStatus.PROCESSING: [FileStatus.OUTPUT_GENERATED, FileStatus.FAILED],
    FileStatus.OUTPUT_GENERATED: [FileStatus.PREVIEW_GENERATED, FileStatus.STORED_FINAL, FileStatus.FAILED],
    FileStatus.PREVIEW_GENERATED: [FileStatus.STORED_FINAL, FileStatus.FAILED],
    FileStatus.STORED_FINAL: [FileStatus.AVAILABLE, FileStatus.FAILED],
    FileStatus.AVAILABLE: [FileStatus.EXPIRED, FileStatus.DELETED],
    FileStatus.EXPIRED: [FileStatus.DELETED],
    FileStatus.FAILED: [FileStatus.DELETED, FileStatus.QUEUED],
    FileStatus.DELETED: [],
}


def validate_transition(current_status: str, new_status: str) -> bool:
    """Validate if state transition is allowed."""
    try:
        current = FileStatus(current_status)
        new = FileStatus(new_status)
    except ValueError:
        return False
    
    return new in VALID_TRANSITIONS.get(current, [])


class FileStateLog(models.Model):
    """Records every state transition for a file."""
    
    file = models.ForeignKey(
        'files.UserFile',
        on_delete=models.CASCADE,
        related_name='state_history'
    )
    from_status = models.CharField(max_length=30, blank=True, null=True)
    to_status = models.CharField(max_length=30)
    actor_id = models.IntegerField(null=True, blank=True)
    actor_type = models.CharField(max_length=20, default='SYSTEM')
    timestamp = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'core'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"File {self.file_id}: {self.from_status} -> {self.to_status}"


def log_file_transition(file_asset, new_status: str, actor_id: int = None, actor_type: str = 'SYSTEM', metadata: dict = None):
    """Log a file state transition with validation."""
    old_status = file_asset.status if hasattr(file_asset, 'status') else None
    
    if old_status and not validate_transition(old_status, new_status):
        raise ValueError(f"Invalid transition: {old_status} -> {new_status}")
    
    FileStateLog.objects.create(
        file=file_asset,
        from_status=old_status,
        to_status=new_status,
        actor_id=actor_id,
        actor_type=actor_type,
        metadata=metadata or {}
    )
    
    logger.info(f"File {file_asset.id}: {old_status} -> {new_status}")
