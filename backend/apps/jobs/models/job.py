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
