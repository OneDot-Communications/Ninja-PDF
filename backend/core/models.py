from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class SystemSetting(models.Model):
    """
    Global system settings like Logo, Platform Name, etc.
    """
    key = models.CharField(max_length=100, unique=True, help_text="Config key (e.g. LOGO_URL)")
    value = models.TextField(blank=True, null=True, help_text="Text value or JSON")
    file = models.FileField(upload_to='system/', blank=True, null=True, help_text="Upload for logo/favicon")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key

class PlatformBranding(models.Model):
    """
    Singleton model for platform branding and configuration.
    Strictly enforce one instance.
    """
    platform_name = models.CharField(max_length=100, default="18+ PDF")
    logo = models.ImageField(upload_to='branding/', blank=True, null=True)
    hero_title = models.TextField(default="All your PDF headache in one place.")
    hero_subtitle = models.TextField(default="Simple, super, and totally free!")
    primary_color = models.CharField(max_length=20, default="#01B0F1")
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1 # Force singleton
        super(PlatformBranding, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.platform_name

class AdminActionRequest(models.Model):
    """
    Queue for sensitive actions requiring Super Admin approval.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='admin_requests')
    action_type = models.CharField(max_length=100, help_text="e.g. USER_PROMOTION, CHANGE_LOGO")
    payload = models.JSONField(help_text="Data required to execute the action")
    reason = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_requests')
    review_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.action_type} by {self.requester.email} ({self.status})"

class ContentVersion(models.Model):
    """
    Version history for PlatformBranding using snapshots.
    """
    snapshot = models.JSONField(help_text="Snapshot of PlatformBranding data")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    note = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Version {self.id} ({self.created_at})"

class TaskLog(models.Model):
    """
    Persistent log of asynchronous tasks for User Dashboard and Audit.
    Linked to Celery Task ID.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        STARTED = 'STARTED', _('Started')
        SUCCESS = 'SUCCESS', _('Success')
        FAILURE = 'FAILURE', _('Failure')
        RETRY = 'RETRY', _('Retry')
        REVOKED = 'REVOKED', _('Revoked')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_logs', null=True, blank=True)
    task_id = models.CharField(max_length=255, unique=True, help_text="Celery Task ID")
    task_name = models.CharField(max_length=255, help_text="e.g. convert_word_to_pdf")
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.PENDING)
    
    # Metadata for UI
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    tool_type = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. WORD_TO_PDF")
    
    result_url = models.URLField(blank=True, null=True, max_length=500)
    error_message = models.TextField(blank=True, null=True)
    
    metadata = models.JSONField(default=dict, blank=True, help_text="Extra task options or context")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task_id']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.task_name} - {self.status} ({self.task_id})"

class AuditLog(models.Model):
    """
    Immutable log of sensitive system actions.
    """
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', _('Login')
        LOGOUT = 'LOGOUT', _('Logout')
        FILE_ACCESS = 'FILE_ACCESS', _('File Access')
        FILE_DELETE = 'FILE_DELETE', _('File Delete')
        SETTINGS_CHANGE = 'SETTINGS_CHANGE', _('Settings Change')
        USER_MODIFIED = 'USER_MODIFIED', _('User Modified')
        EXPORT_DATA = 'EXPORT_DATA', _('Export Data')
        
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    action = models.CharField(max_length=50, choices=Action.choices)
    target = models.CharField(max_length=255, help_text="Target object or description")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['actor', 'action']),
            models.Index(fields=['timestamp']),
        ]
        
    def __str__(self):
        return f"{self.timestamp} - {self.actor} - {self.action}"

class SupportTicket(models.Model):
    """
    User support tickets.
    """
    class Status(models.TextChoices):
        OPEN = 'OPEN', _('Open')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        RESOLVED = 'RESOLVED', _('Resolved')
        CLOSED = 'CLOSED', _('Closed')
    
    class Priority(models.TextChoices):
        LOW = 'LOW', _('Low')
        MEDIUM = 'MEDIUM', _('Medium')
        HIGH = 'HIGH', _('High')
        CRITICAL = 'CRITICAL', _('Critical')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.subject}"
