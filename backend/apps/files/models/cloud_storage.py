"""Cloud Storage Integration Models"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import json


class CloudProvider(models.Model):
    """
    Supported cloud storage providers.
    Tasks 185-189: Cloud storage integrations
    """
    class ProviderType(models.TextChoices):
        GOOGLE_DRIVE = 'GOOGLE_DRIVE', _('Google Drive')
        DROPBOX = 'DROPBOX', _('Dropbox')
        ONEDRIVE = 'ONEDRIVE', _('OneDrive')
        AWS_S3 = 'AWS_S3', _('AWS S3')
        CUSTOM = 'CUSTOM', _('Custom')

    name = models.CharField(max_length=100)
    provider_type = models.CharField(max_length=20, choices=ProviderType.choices, unique=True)
    
    # OAuth/API Configuration (encrypted in production)
    client_id = models.CharField(max_length=255, blank=True)
    client_secret = models.CharField(max_length=255, blank=True)
    redirect_uri = models.URLField(blank=True)
    
    # API endpoints
    auth_url = models.URLField(blank=True)
    token_url = models.URLField(blank=True)
    api_base_url = models.URLField(blank=True)
    
    # Scopes
    scopes = models.JSONField(default=list, help_text="OAuth scopes required")
    
    # Limits
    max_file_size_mb = models.PositiveIntegerField(default=100)
    allowed_file_types = models.JSONField(default=list, blank=True)
    
    is_active = models.BooleanField(default=True)
    icon = models.ImageField(upload_to='cloud_providers/', null=True, blank=True)

    class Meta:
        db_table = 'cloud_providers'

    def __str__(self):
        return self.name


class CloudConnection(models.Model):
    """
    User's connected cloud storage accounts.
    """
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        EXPIRED = 'EXPIRED', _('Token Expired')
        REVOKED = 'REVOKED', _('Revoked')
        ERROR = 'ERROR', _('Error')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cloud_connections')
    provider = models.ForeignKey(CloudProvider, on_delete=models.CASCADE)
    
    # OAuth tokens (encrypted in production)
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Account info
    account_id = models.CharField(max_length=255, blank=True)
    account_email = models.EmailField(blank=True)
    account_name = models.CharField(max_length=255, blank=True)
    
    # Default folder for this connection
    default_folder_id = models.CharField(max_length=255, blank=True)
    default_folder_path = models.CharField(max_length=500, blank=True)
    
    # Settings
    auto_sync_enabled = models.BooleanField(default=False)
    sync_direction = models.CharField(max_length=20, default='BOTH', 
        choices=[('UPLOAD', 'Upload Only'), ('DOWNLOAD', 'Download Only'), ('BOTH', 'Both')])
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cloud_connections'
        unique_together = ('user', 'provider', 'account_id')

    def __str__(self):
        return f"{self.user.email} - {self.provider.name}"

    @property
    def is_token_expired(self):
        if not self.token_expires_at:
            return False
        return timezone.now() > self.token_expires_at

    def refresh_access_token(self):
        """Refresh OAuth token using refresh_token"""
        # Implementation depends on provider
        pass


class CloudSyncJob(models.Model):
    """Track file sync operations with cloud storage"""
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        FAILED = 'FAILED', _('Failed')

    class Direction(models.TextChoices):
        UPLOAD = 'UPLOAD', _('Upload')
        DOWNLOAD = 'DOWNLOAD', _('Download')

    connection = models.ForeignKey(CloudConnection, on_delete=models.CASCADE, related_name='sync_jobs')
    direction = models.CharField(max_length=20, choices=Direction.choices)
    
    # Local file
    local_file = models.ForeignKey('files.FileAsset', on_delete=models.SET_NULL, null=True, blank=True)
    local_path = models.CharField(max_length=500, blank=True)
    
    # Remote file
    remote_file_id = models.CharField(max_length=255, blank=True)
    remote_path = models.CharField(max_length=500, blank=True)
    remote_name = models.CharField(max_length=255, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress = models.PositiveIntegerField(default=0, help_text="Progress percentage")
    error_message = models.TextField(blank=True)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cloud_sync_jobs'

    def __str__(self):
        return f"{self.direction}: {self.remote_name}"
