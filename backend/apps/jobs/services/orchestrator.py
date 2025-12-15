"""
Job Orchestrator Service
Handles job creation, prioritization, and dispatch.
"""
from django.utils import timezone
from common.constants import UserTier
import logging

logger = logging.getLogger(__name__)


class JobOrchestrator:
    """Central job orchestration service."""
    
    @staticmethod
    def resolve_priority(user) -> tuple:
        """
        Determine job priority and queue based on user tier.
        
        Returns:
            tuple: (priority: int, queue_name: str)
        """
        from apps.accounts.services.user_service import UserService
        
        context = UserService.get_context(user)
        tier = context['tier']
        
        priority_map = {
            UserTier.ADMIN: (100, 'high_priority'),
            UserTier.PREMIUM: (50, 'high_priority'),
            UserTier.TEAM: (50, 'high_priority'),
            UserTier.FREE: (0, 'default'),
            UserTier.GUEST: (0, 'default'),
        }
        
        return priority_map.get(tier, (0, 'default'))
    
    @classmethod
    def create_job(cls, file_asset, tool_type: str, user, parameters: dict = None) -> 'Job':
        """
        Create and enqueue a new job.
        
        Args:
            file_asset: FileAsset to process
            tool_type: Tool identifier (e.g., 'CONVERT_WORD_TO_PDF')
            user: User requesting the job
            parameters: Tool-specific parameters
            
        Returns:
            Job: Created job instance
        """
        from apps.jobs.models.job import Job
        
        priority, queue_name = cls.resolve_priority(user)
        
        job = Job.objects.create(
            file_asset=file_asset,
            user=user,
            tool_type=tool_type,
            parameters=parameters or {},
            priority=priority,
            queue_name=queue_name,
            status=Job.Status.QUEUED,
        )
        
        logger.info(f"Job created: {job.id} ({tool_type}) for user {user.id}")
        
        return job
    
    @staticmethod
    def dispatch_to_celery(job) -> str:
        """
        Dispatch job to Celery worker.
        
        Returns:
            str: Celery task ID
        """
        from apps.jobs.tasks import process_job
        
        task = process_job.apply_async(
            args=[str(job.id)],
            queue=job.queue_name,
            priority=job.priority
        )
        
        job.celery_task_id = task.id
        job.save(update_fields=['celery_task_id'])
        
        logger.info(f"Job {job.id} dispatched to Celery: {task.id}")
        
        return task.id
    
    @staticmethod
    def retry_job(job) -> bool:
        """
        Retry a failed job.
        
        Returns:
            bool: True if retry was enqueued
        """
        if job.status not in ('FAILED',):
            return False
        
        if job.retry_count >= job.max_retries:
            return False
        
        job.status = 'QUEUED'
        job.save(update_fields=['status'])
        
        JobOrchestrator.dispatch_to_celery(job)
        
        return True
    
    @staticmethod
    def get_queue_stats() -> dict:
        """
        Get current queue statistics.
        """
        from apps.jobs.models.job import Job
        from django.db.models import Count
        
        stats = Job.objects.values('queue_name', 'status').annotate(
            count=Count('id')
        )
        
        result = {
            'high_priority': {'queued': 0, 'processing': 0, 'failed': 0},
            'default': {'queued': 0, 'processing': 0, 'failed': 0},
        }
        
        for row in stats:
            queue = row['queue_name']
            status = row['status'].lower()
            if queue in result and status in result[queue]:
                result[queue][status] = row['count']
        
        return result
