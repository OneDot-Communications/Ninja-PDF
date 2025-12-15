from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

@shared_task
def daily_maintenance():
    """
    Periodic task to run daily maintenance commands.
    """
    logger.info("Starting Daily Maintenance...")
    
    try:
        # 1. Reset Quotas
        call_command('reset_quotas')
        logger.info("Quotas Reset.")
        
        # 2. Cleanup Storage (Expired files)
        call_command('cleanup_storage')
        logger.info("Storage Cleanup Completed.")
        
    except Exception as e:
        logger.error(f"Daily Maintenance Failed: {e}", exc_info=True)
