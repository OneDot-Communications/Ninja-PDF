"""
File State Machine
Enforces valid state transitions and logs all changes.
"""
from common.constants import FileStatus
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


def can_transition(current: str, target: str) -> bool:
    """
    Check if a state transition is valid.
    
    Args:
        current: Current status value
        target: Target status value
        
    Returns:
        bool: True if transition is allowed
    """
    try:
        current_enum = FileStatus(current)
        target_enum = FileStatus(target)
    except ValueError:
        return False
    
    return target_enum in VALID_TRANSITIONS.get(current_enum, [])


def transition(file_asset, new_status: str, actor_id: int = None, actor_type: str = 'SYSTEM', metadata: dict = None):
    """
    Perform a validated state transition with logging.
    
    Args:
        file_asset: FileAsset instance
        new_status: Target status
        actor_id: User ID who triggered the change
        actor_type: USER, SYSTEM, or WORKER
        metadata: Additional context
        
    Raises:
        ValueError: If transition is invalid
    """
    from apps.files.models.file_asset import FileStateLog
    
    current = file_asset.status
    
    if not can_transition(current, new_status):
        raise ValueError(f"Invalid state transition: {current} -> {new_status}")
    
    FileStateLog.objects.create(
        file_asset=file_asset,
        from_status=current,
        to_status=new_status,
        actor_id=actor_id,
        actor_type=actor_type,
        metadata=metadata or {}
    )
    
    file_asset.status = new_status
    file_asset.save(update_fields=['status', 'updated_at'])
    
    logger.info(f"File {file_asset.uuid}: {current} -> {new_status}")


def get_terminal_states() -> list:
    """Return list of terminal states."""
    return [FileStatus.DELETED, FileStatus.EXPIRED]


def get_active_states() -> list:
    """Return list of non-terminal states."""
    return [s for s in FileStatus if s not in get_terminal_states()]
