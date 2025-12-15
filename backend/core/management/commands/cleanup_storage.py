from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.core.files.storage import default_storage
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up expired temporary files and Guest uploads'

    def handle(self, *args, **options):
        # 1. Logic for Guest Files (Assuming we track them or they are in specific path)
        # Since we use R2, listing is expensive. 
        # Ideally we should rely on TaskLog or a specific TemporaryFile model.
        # Currently, we only have TaskLog.
        # A proper implementation requires a "FileExpiry" model or tracking in Redis.
        # But per Blueprint A6.1, we might just define a lifecycle rule on R2 (Infrastructure).
        # OR we check TaskLogs older than X.
        
        self.stdout.write("Running cleanup...")
        
        # Example: Clean records from DB (TaskLog)
        from core.models import TaskLog
        
        # Delete logs older than 7 days
        expiry_date = timezone.now() - timedelta(days=7)
        deleted_count, _ = TaskLog.objects.filter(created_at__lt=expiry_date).delete()
        
        self.stdout.write(f"Deleted {deleted_count} old task logs.")
        
        # For actual files in R2:
        # We rely on Bucket Lifecycle Rules generally for 'uploads/tmp/'.
        # If we need code cleanup:
        # We would need to iterate db records that link to files.
        
        logger.info(f"Cleanup completed. Deleted {deleted_count} logs.")
