"""Signatures Models"""
from django.db import models
from django.conf import settings


class SignatureRequest(models.Model):
    """Signature request for document signing."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('VIEWED', 'Viewed'),
        ('SIGNED', 'Signed'),
        ('DECLINED', 'Declined'),
        ('EXPIRED', 'Expired'),
        ('TRASHED', 'Trashed'),
    ]
    
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_signature_requests')
    recipient_email = models.EmailField()
    recipient_name = models.CharField(max_length=255, blank=True)
    document = models.FileField(upload_to='signatures/documents/')
    document_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_document = models.FileField(upload_to='signatures/signed/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Signature request to {self.recipient_email} - {self.status}"


class SignatureTemplate(models.Model):
    """Reusable signature template."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signature_templates')
    name = models.CharField(max_length=255)
    document = models.FileField(upload_to='signatures/templates/')
    fields = models.JSONField(default=list)  # Signature field positions
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class SignatureContact(models.Model):
    """Contact for signature requests."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signature_contacts')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    company = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ['user', 'email']

    def __str__(self):
        return f"{self.name} <{self.email}>"


class SavedSignature(models.Model):
    """User's saved signature for reuse."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_signatures')
    image = models.FileField(upload_to='signatures/saved/')
    name = models.CharField(max_length=255, default='My Signature')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.email})"

