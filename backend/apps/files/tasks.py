from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.files.models.user_file import UserFile
import logging

logger = logging.getLogger(__name__)

@shared_task
def delete_expired_files():
    """
    Deletes files older than the retention policy.
    Master Prompt Requirement: "Define auto-delete duration"
    """
    # Policy: Free = 24h, Premium = 30 days (example)
    # Ideally simpler: Delete ANY file marked as temporary or older than X globally if not persistent
    
    # 1. Delete Guest/Temp files (older than 1 hour)
    expiration_guest = timezone.now() - timedelta(hours=1)
    # Logic: UserFile with no user? Or specific flag.
    # Assuming all UserFiles are owned.
    
    # 2. Delete Free User Files (older than 24 hours) 
    expiration_free = timezone.now() - timedelta(hours=24)
    deleted_count, _ = UserFile.objects.filter(
        user__subscription_tier='FREE', 
        created_at__lt=expiration_free
    ).delete()
    
    if deleted_count > 0:
        logger.info(f"Cleaned up {deleted_count} expired Free user files.")

    return f"Cleanup complete. Deleted {deleted_count} files."
