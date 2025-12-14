from django.core.management.base import BaseCommand
from apps.subscriptions.models.subscription import UserFeatureUsage
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reset daily feature usage quotas'

    def handle(self, *args, **options):
        self.stdout.write("Running quota reset...")
        
        # Method 1: Delete all usage records (simplest for "Daily" reset)
        # This assumes we don't keep historical usage for analytics in this table.
        # If we wanted analytics, we would have a separate 'FeatureUsageHistory' or similar, 
        # or we would just query this table by date.
        # But 'UserFeatureUsage' as defined usually enforces the limit for *current* period.
        # If it has a 'date' field, we don't strictly *need* to delete, just ensure we query by today.
        
        # Let's check models.py for UserFeatureUsage definition again.
        # It has 'date' field and unique_together = ('user', 'feature', 'date')
        # So we actually DON'T need to delete anything for the quota to work "Daily", 
        # because the code should query `date=today`.
        
        # However, to prevent DB bloat, we should cleanup OLD records.
        # So this command effectively becomes "Cleanup Old Quota Records".
        
        today = timezone.now().date()
        deleted_count, _ = UserFeatureUsage.objects.filter(date__lt=today).delete()
        
        self.stdout.write(f"Deleted {deleted_count} old usage records.")
        logger.info(f"Quota cleanup completed. Deleted {deleted_count} records.")
