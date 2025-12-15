"""
Job Orchestration Layer
Enterprise-grade job lifecycle management with priority queuing and dead-letter handling.
"""
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


class Job(models.Model):
    """
    Represents a file processing job with full lifecycle management.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        QUEUED = 'QUEUED', 'Queued'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        DEAD_LETTER = 'DEAD_LETTER', 'Dead Letter'
        CANCELED = 'CANCELED', 'Canceled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    file = models.ForeignKey(
        'files.UserFile',
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
    retry_at = models.DateTimeField(null=True, blank=True)
    
    result = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    
    progress_percent = models.PositiveSmallIntegerField(default=0)
    progress_message = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = 'core'
        ordering = ['-priority', 'created_at']
        indexes = [
            models.Index(fields=['status', '-priority', 'created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['queue_name', 'status']),
        ]
    
    def __str__(self):
        return f"{self.tool_type} - {self.status}"
    
    @property
    def duration_seconds(self) -> float:
        if not self.started_at:
            return 0
        end = self.completed_at or timezone.now()
        return (end - self.started_at).total_seconds()
    
    def mark_queued(self, celery_task_id: str = None):
        self.status = self.Status.QUEUED
        if celery_task_id:
            self.celery_task_id = celery_task_id
        self.save(update_fields=['status', 'celery_task_id'])
    
    def mark_started(self):
        self.status = self.Status.PROCESSING
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def update_progress(self, percent: int, message: str = ''):
        self.progress_percent = min(percent, 100)
        self.progress_message = message
        self.save(update_fields=['progress_percent', 'progress_message'])
    
    def mark_completed(self, result: dict = None):
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.progress_percent = 100
        if result:
            self.result = result
        self.save(update_fields=['status', 'completed_at', 'result', 'progress_percent'])
    
    def mark_failed(self, error: str, error_code: str = 'UNKNOWN'):
        self.retry_count += 1
        self.error_message = error
        self.error_code = error_code
        
        if self.retry_count >= self.max_retries:
            self.status = self.Status.DEAD_LETTER
        else:
            self.status = self.Status.FAILED
            self.retry_at = timezone.now() + timedelta(seconds=min(60 * (2 ** self.retry_count), 3600))
        
        self.save()
    
    def cancel(self):
        if self.status not in (self.Status.COMPLETED, self.Status.DEAD_LETTER):
            self.status = self.Status.CANCELED
            self.save(update_fields=['status'])


class JobOrchestrator:
    """Enterprise-grade job orchestration service."""
    
    PRIORITY_MAP = {
        'ADMIN': (100, 'high_priority'),
        'PREMIUM': (50, 'high_priority'),
        'TEAM': (50, 'high_priority'),
        'FREE': (0, 'default'),
        'GUEST': (-10, 'default'),
    }
    
    @classmethod
    def resolve_priority(cls, user) -> tuple:
        """
        Determine job priority and queue based on user tier.
        
        Returns:
            tuple: (priority: int, queue_name: str)
        """
        from core.user_context import UserContextResolver
        
        context = UserContextResolver.resolve(user)
        tier = context['tier'].value if hasattr(context['tier'], 'value') else str(context['tier'])
        
        return cls.PRIORITY_MAP.get(tier, (0, 'default'))
    
    @classmethod
    @transaction.atomic
    def create_job(cls, file_asset, tool_type: str, user, parameters: dict = None) -> Job:
        """
        Create and register a new job.
        
        Args:
            file_asset: File to process
            tool_type: Tool identifier
            user: Requesting user
            parameters: Tool-specific parameters
            
        Returns:
            Job: Created job instance
        """
        from core.quotas import QuotaManager
        if not QuotaManager.check_job_quota(user):
            raise Exception("Job quota exceeded")
        
        priority, queue_name = cls.resolve_priority(user)
        
        job = Job.objects.create(
            file=file_asset,
            user=user,
            tool_type=tool_type,
            parameters=parameters or {},
            priority=priority,
            queue_name=queue_name,
            status=Job.Status.PENDING,
        )
        
        logger.info(f"JobOrchestrator:CREATE job={job.id} tool={tool_type} user={user.id}")
        
        return job
    
    @classmethod
    def dispatch(cls, job: Job) -> str:
        """
        Dispatch job to Celery worker.
        
        Returns:
            str: Celery task ID
        """
        from core.tasks import process_job_task
        
        task = process_job_task.apply_async(
            args=[str(job.id)],
            queue=job.queue_name,
            priority=job.priority
        )
        
        job.mark_queued(task.id)
        
        logger.info(f"JobOrchestrator:DISPATCH job={job.id} celery_task={task.id}")
        
        return task.id
    
    @classmethod
    def create_and_dispatch(cls, file_asset, tool_type: str, user, parameters: dict = None) -> Job:
        """Create and immediately dispatch a job."""
        job = cls.create_job(file_asset, tool_type, user, parameters)
        cls.dispatch(job)
        return job
    
    @classmethod
    def retry_failed(cls, job: Job) -> bool:
        """
        Retry a failed job.
        
        Returns:
            bool: True if retry was enqueued
        """
        if job.status != Job.Status.FAILED:
            return False
        
        if job.retry_count >= job.max_retries:
            job.status = Job.Status.DEAD_LETTER
            job.save(update_fields=['status'])
            return False
        
        job.status = Job.Status.PENDING
        job.save(update_fields=['status'])
        
        cls.dispatch(job)
        
        logger.info(f"JobOrchestrator:RETRY job={job.id} attempt={job.retry_count + 1}")
        
        return True
    
    @classmethod
    def process_dead_letter_queue(cls) -> int:
        """
        Review dead letter jobs for potential recovery.
        Called by scheduled task.
        
        Returns:
            int: Number of jobs reviewed
        """
        dead_jobs = Job.objects.filter(status=Job.Status.DEAD_LETTER)
        count = 0
        
        for job in dead_jobs[:100]:
            logger.warning(
                f"DeadLetterQueue: job={job.id} tool={job.tool_type} "
                f"error={job.error_code} user={job.user_id}"
            )
            count += 1
        
        return count
    
    @classmethod
    def get_queue_stats(cls) -> dict:
        """Get current queue statistics."""
        from django.db.models import Count
        
        stats = Job.objects.values('queue_name', 'status').annotate(
            count=Count('id')
        )
        
        result = {
            'high_priority': {'pending': 0, 'queued': 0, 'processing': 0, 'failed': 0},
            'default': {'pending': 0, 'queued': 0, 'processing': 0, 'failed': 0},
            'totals': {'pending': 0, 'queued': 0, 'processing': 0, 'completed': 0, 'failed': 0}
        }
        
        for row in stats:
            queue = row['queue_name']
            status = row['status'].lower()
            count = row['count']
            
            if queue in result and status in result[queue]:
                result[queue][status] = count
            if status in result['totals']:
                result['totals'][status] += count
        
        return result
    
    @classmethod
    def cleanup_old_jobs(cls, days: int = 30) -> int:
        """
        Delete jobs older than specified days.
        
        Returns:
            int: Number of jobs deleted
        """
        cutoff = timezone.now() - timedelta(days=days)
        
        count, _ = Job.objects.filter(
            status__in=[Job.Status.COMPLETED, Job.Status.CANCELED],
            completed_at__lt=cutoff
        ).delete()
        
        logger.info(f"JobOrchestrator:CLEANUP deleted={count}")
        
        return count


def enqueue_job(file_asset, tool_type: str, user, parameters: dict = None) -> Job:
    """Convenience function."""
    return JobOrchestrator.create_and_dispatch(file_asset, tool_type, user, parameters)


def resolve_job_priority(user) -> tuple:
    """Convenience function."""
    return JobOrchestrator.resolve_priority(user)


def handle_job_failure(job: Job, error: str, error_code: str = 'UNKNOWN'):
    """Handle job failure with retry logic."""
    job.mark_failed(error, error_code)
    logger.error(f"Job {job.id} failed: {error}")
