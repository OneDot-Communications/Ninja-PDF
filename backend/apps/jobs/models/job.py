"""
Job Model
Represents a file processing task.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from common.constants import JobStatus
import uuid


class Job(models.Model):
    """
    Represents an intent to process a file with a specific tool.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        QUEUED = 'QUEUED', 'Queued'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        DEAD_LETTER = 'DEAD_LETTER', 'Dead Letter'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    file_asset = models.ForeignKey(
        'files.FileAsset',
        on_delete=models.CASCADE,
        related_name='jobs'
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='jobs'
    )
    
    tool_type = models.CharField(max_length=100, db_index=True)
    parameters = models.JSONField(default=dict, blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    
    priority = models.IntegerField(default=0, db_index=True)
    queue_name = models.CharField(max_length=50, default='default')
    
    celery_task_id = models.CharField(max_length=255, blank=True, db_index=True)
    
    max_retries = models.PositiveSmallIntegerField(default=3)
    retry_count = models.PositiveSmallIntegerField(default=0)
    
    # Batch Processing Fields (Tasks 181-184)
    batch_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    batch_index = models.PositiveIntegerField(default=0)
    is_batch = models.BooleanField(default=False)
    operation = models.CharField(max_length=100, blank=True, db_index=True)  # User-friendly operation name
    
    result = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = 'jobs'
        db_table = 'jobs_job'
        ordering = ['-priority', 'created_at']
        indexes = [
            models.Index(fields=['status', '-priority', 'created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
        verbose_name = 'Job'
        verbose_name_plural = 'Jobs'
    
    def __str__(self):
        return f"{self.tool_type} - {self.status}"
    
    @property
    def is_complete(self) -> bool:
        return self.status in (self.Status.COMPLETED, self.Status.FAILED, self.Status.DEAD_LETTER)
    
    @property
    def duration_seconds(self) -> float:
        if not self.started_at:
            return 0
        end = self.completed_at or timezone.now()
        return (end - self.started_at).total_seconds()
    
    def mark_started(self):
        self.status = self.Status.PROCESSING
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_completed(self, result: dict = None):
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        if result:
            self.result = result
        self.save(update_fields=['status', 'completed_at', 'result'])
    
    def mark_failed(self, error: str):
        self.retry_count += 1
        self.error_message = error
        
        if self.retry_count >= self.max_retries:
            self.status = self.Status.DEAD_LETTER
        else:
            self.status = self.Status.FAILED
        
        self.save(update_fields=['status', 'retry_count', 'error_message'])


class JobLog(models.Model):
    """
    Execution log entries for a job.
    """
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='logs')
    level = models.CharField(max_length=10, default='INFO')
    message = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'jobs'
        db_table = 'jobs_joblog'
        ordering = ['timestamp']


class BatchJob(models.Model):
    """
    Represents a batch processing operation containing multiple jobs.
    Premium feature for processing multiple files at once.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED', 'Partially Completed'
        FAILED = 'FAILED', 'Failed'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='batch_jobs'
    )
    
    operation = models.CharField(max_length=100, help_text="Tool operation being performed")
    parameters = models.JSONField(default=dict, blank=True, help_text="Shared parameters for all jobs")
    
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    
    total_files = models.PositiveIntegerField(default=0)
    completed_files = models.PositiveIntegerField(default=0)
    failed_files = models.PositiveIntegerField(default=0)
    
    # Results
    output_files = models.JSONField(default=list, blank=True, help_text="List of output file UUIDs")
    errors = models.JSONField(default=list, blank=True, help_text="List of error messages per file")
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = 'jobs'
        db_table = 'batch_jobs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Batch {self.id}: {self.operation} ({self.completed_files}/{self.total_files})"
    
    @property
    def progress_percentage(self) -> int:
        if self.total_files == 0:
            return 0
        return int((self.completed_files + self.failed_files) / self.total_files * 100)
    
    @property
    def is_complete(self) -> bool:
        return self.status in [
            self.Status.COMPLETED, 
            self.Status.PARTIALLY_COMPLETED, 
            self.Status.FAILED,
            self.Status.CANCELLED
        ]
    
    def update_progress(self, completed: bool = True, error: str = None):
        """Update progress after a job completes"""
        if completed:
            self.completed_files += 1
        else:
            self.failed_files += 1
            if error:
                self.errors.append(error)
        
        # Check if batch is complete
        total_processed = self.completed_files + self.failed_files
        if total_processed >= self.total_files:
            self.completed_at = timezone.now()
            if self.failed_files == 0:
                self.status = self.Status.COMPLETED
            elif self.completed_files == 0:
                self.status = self.Status.FAILED
            else:
                self.status = self.Status.PARTIALLY_COMPLETED
        else:
            self.status = self.Status.PROCESSING
        
        self.save()
    
    def cancel(self):
        """Cancel the batch job"""
        self.status = self.Status.CANCELLED
        self.completed_at = timezone.now()
        self.save()

