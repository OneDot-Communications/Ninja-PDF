from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os

class Command(BaseCommand):
    help = 'Verifies the storage backend configuration (Local vs S3/R2)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("--- Storage Verification ---"))
        self.stdout.write(f"Current Backend: {settings.STORAGES['default']['BACKEND']}")
        self.stdout.write(f"Env STORAGE_BACKEND: {os.getenv('STORAGE_BACKEND', 'local')}")

        file_name = 'storage_check_cmd.txt'
        content = b'This is a verification file from manage.py verify_storage'

        self.stdout.write(f"\nAttempting to save '{file_name}'...")
        
        try:
            saved_name = default_storage.save(file_name, ContentFile(content))
            self.stdout.write(self.style.SUCCESS(f"Success! Saved as: {saved_name}"))

            # Check URL
            try:
                url = default_storage.url(saved_name)
                self.stdout.write(f"File URL: {url}")
                
                if any(provider in url for provider in ['amazonaws', 'digitaloceanspaces', 'r2', 'supabase']):
                     self.stdout.write(self.style.SUCCESS(">> CONFIRMED: File is on CLOUD storage."))
                else:
                     self.stdout.write(self.style.WARNING(">> CONFIRMED: File is on LOCAL storage."))
                     
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Could not generate URL: {e}"))

            # Clean up
            self.stdout.write(f"\nCleaning up...")
            default_storage.delete(saved_name)
            self.stdout.write("Test file deleted.")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Storage verification failed: {e}"))
