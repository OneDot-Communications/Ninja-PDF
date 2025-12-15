from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import uuid

class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, help_text="Hash of immutable device characteristics")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # We can link this session to a specific refresh token jti if needed, 
    # but for now, we will manage it via middleware/views logic.

    class Meta:
        db_table = 'user_sessions'
        ordering = ['-last_activity']

    def __str__(self):
        return f"{self.user.email} - {self.ip_address} ({self.created_at})"
