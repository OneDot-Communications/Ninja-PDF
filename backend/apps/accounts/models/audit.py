from django.db import models
from django.conf import settings
from django.utils import timezone


class AuthAuditLog(models.Model):
    class Event(models.TextChoices):
        SUCCESSFUL_LOGIN = 'successful_login', 'Successful Login'
        FAILED_LOGIN = 'failed_login', 'Failed Login'
        FAILED_2FA = 'failed_2fa', 'Failed 2FA'
        ENABLE_2FA = 'enable_2fa', 'Enable 2FA'
        DISABLE_2FA = 'disable_2fa', 'Disable 2FA'
        LOGOUT = 'logout', 'Logout'
        PASSWORD_RESET = 'password_reset', 'Password Reset'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=50, choices=Event.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'auth_audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} - {self.user} @ {self.created_at}"
