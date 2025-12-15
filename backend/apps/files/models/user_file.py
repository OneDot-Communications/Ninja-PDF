from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class UserFile(models.Model):
    """
    Represents a file permanently saved by a User (Premium feature).
    Linked to actual S3/R2 object.
    """
    class Status(models.TextChoices):
        CREATED = 'CREATED', _('Created')
        UPLOADING = 'UPLOADING', _('Uploading')
        VALIDATED = 'VALIDATED', _('Validated')
        TEMP_STORED = 'TEMP_STORED', _('Temp Stored')
        METADATA_REGISTERED = 'METADATA_REGISTERED', _('Metadata Registered')
        QUEUED = 'QUEUED', _('Queued')
        PROCESSING = 'PROCESSING', _('Processing')
        OUTPUT_GENERATED = 'OUTPUT_GENERATED', _('Output Generated')
        PREVIEW_GENERATED = 'PREVIEW_GENERATED', _('Preview Generated')
        STORED_FINAL = 'STORED_FINAL', _('Stored Final')
        AVAILABLE = 'AVAILABLE', _('Available')
        EXPIRED = 'EXPIRED', _('Expired')
        DELETED = 'DELETED', _('Deleted')
        FAILED = 'FAILED', _('Failed')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='user_files/%Y/%m/%d/')
    name = models.CharField(max_length=255, help_text="Original filename")
    size_bytes = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    
    # OS State Machine Fields
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    version = models.IntegerField(default=1)
    metadata = models.JSONField(default=dict, blank=True, help_text="Page count, encryption, tool params")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="For temp/guest files")
    
    md5_hash = models.CharField(max_length=32, blank=True, null=True, help_text="Integrity check")
    sha256_hash = models.CharField(max_length=64, blank=True, null=True, help_text="SHA256 integrity hash")
    is_public = models.BooleanField(default=False, help_text="Sharable via link")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _("File Asset")
        verbose_name_plural = _("File Assets")

    def __str__(self):
        return f"{self.name} ({self.status}) - v{self.version}"
