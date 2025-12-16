from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.signatures.models import SignatureRequest
from datetime import timedelta

class Command(BaseCommand):
    help = 'Permanently delete trashed signature requests older than 30 days'

    def handle(self, *args, **options):
        cutoff_date = timezone.now() - timedelta(days=30)
        
        # Find items that are TRASHED and updated_at > 30 days ago
        # Note: If an item is trashed, we assume 'updated_at' reflects when it was moved to trash 
        # (or last modified while in trash). If it hasn't been touched, it's safe to delete.
        trashed_items = SignatureRequest.objects.filter(
            status='TRASHED',
            updated_at__lt=cutoff_date
        )
        
        count = trashed_items.count()
        
        if count > 0:
            trashed_items.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} trashed items.'))
        else:
            self.stdout.write(self.style.SUCCESS('No trashed items to delete.'))
