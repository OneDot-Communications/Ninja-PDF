"""
File Asset Model
Core file entity with full lifecycle state machine.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from common.constants import FileStatus
import uuid


class FileAsset(models.Model):
    """
    Represents a file in the system.
    Every file is a first-class entity with full lifecycle tracking.
    """
    
    class Status(models.TextChoices):
        CREATED = 'CREATED', 'Created'
        UPLOADING = 'UPLOADING', 'Uploading'
        VALIDATED = 'VALIDATED', 'Validated'
        TEMP_STORED = 'TEMP_STORED', 'Temporarily Stored'
        METADATA_REGISTERED = 'METADATA_REGISTERED', 'Metadata Registered'
        QUEUED = 'QUEUED', 'Queued for Processing'
        PROCESSING = 'PROCESSING', 'Processing'
        OUTPUT_GENERATED = 'OUTPUT_GENERATED', 'Output Generated'
        PREVIEW_GENERATED = 'PREVIEW_GENERATED', 'Preview Generated'
        STORED_FINAL = 'STORED_FINAL', 'Stored Final'
        AVAILABLE = 'AVAILABLE', 'Available'
        EXPIRED = 'EXPIRED', 'Expired'
        DELETED = 'DELETED', 'Deleted'
        FAILED = 'FAILED', 'Failed'
    
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='file_assets',
        null=True,
        blank=True,
        help_text="Null for guest uploads"
    )
    
    name = models.CharField(max_length=255)
    original_name = models.CharField(max_length=255)
    
    storage_path = models.CharField(max_length=500, blank=True)
    
    size_bytes = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.CREATED,
        db_index=True
    )
    
    version = models.PositiveIntegerField(default=1)
    
    md5_hash = models.CharField(max_length=32, blank=True, db_index=True)
    sha256_hash = models.CharField(max_length=64, blank=True, db_index=True)
    
    metadata = models.JSONField(default=dict, blank=True)
    
    page_count = models.PositiveIntegerField(null=True, blank=True)
    is_encrypted = models.BooleanField(default=False)
    
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'files'
        db_table = 'files_fileasset'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', '-created_at']),
        ]
        verbose_name = 'File Asset'
        verbose_name_plural = 'File Assets'
    
    def __str__(self):
        return f"{self.name} ({self.status})"
    
    @property
    def is_terminal_state(self) -> bool:
        return self.status in (self.Status.DELETED, self.Status.EXPIRED)
    
    @property
    def is_available(self) -> bool:
        return self.status == self.Status.AVAILABLE
    
    def mark_available(self):
        self.status = self.Status.AVAILABLE
        self.save(update_fields=['status', 'updated_at'])
    
    def mark_failed(self, error_message: str = None):
        self.status = self.Status.FAILED
        if error_message:
            self.metadata['error'] = error_message
        self.save(update_fields=['status', 'metadata', 'updated_at'])


class FileVersion(models.Model):
    """
    Tracks versions of a file (immutable outputs from processing).
    """
    file_asset = models.ForeignKey(FileAsset, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    storage_path = models.CharField(max_length=500)
    size_bytes = models.BigIntegerField()
    md5_hash = models.CharField(max_length=32, blank=True)
    sha256_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'files'
        db_table = 'files_fileversion'
        unique_together = ['file_asset', 'version_number']
        ordering = ['-version_number']


class FileStateLog(models.Model):
    """
    Immutable log of all file state transitions.
    """
    file_asset = models.ForeignKey(FileAsset, on_delete=models.CASCADE, related_name='state_logs')
    from_status = models.CharField(max_length=25, blank=True)
    to_status = models.CharField(max_length=25)
    actor_id = models.BigIntegerField(null=True, blank=True)
    actor_type = models.CharField(max_length=20, default='SYSTEM')
    timestamp = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'files'
        db_table = 'files_filestatelog'
        ordering = ['-timestamp']
    
    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("State logs are immutable")
        super().save(*args, **kwargs)
