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
