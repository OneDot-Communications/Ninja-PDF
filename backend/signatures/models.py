from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class SignatureRequest(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SENT = 'SENT', _('Sent')
        COMPLETED = 'COMPLETED', _('Completed')
        DECLINED = 'DECLINED', _('Declined')
        EXPIRED = 'EXPIRED', _('Expired')
        TRASH = 'TRASH', _('Trash')

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signature_requests_sent')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    original_file = models.FileField(upload_to='signatures/originals/')
    signed_file = models.FileField(upload_to='signatures/signed/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

class Signer(models.Model):
    class Status(models.TextChoices):
        WAITING = 'WAITING', _('Waiting')
        SENT = 'SENT', _('Sent')
        VIEWED = 'VIEWED', _('Viewed')
        SIGNED = 'SIGNED', _('Signed')
        DECLINED = 'DECLINED', _('Declined')

    request = models.ForeignKey(SignatureRequest, on_delete=models.CASCADE, related_name='signers')
    email = models.EmailField()
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    auth_token = models.CharField(max_length=100, blank=True, null=True, unique=True) # For unique signing link
    signed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.request.title}"

class Template(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signature_templates')
    name = models.CharField(max_length=200)
    file = models.FileField(upload_to='signatures/templates/')
    fields_config = models.JSONField(default=dict) # Store x,y coordinates and field types
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contacts')
    email = models.EmailField()
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'email')

    def __str__(self):
        return self.name
