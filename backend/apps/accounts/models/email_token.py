"""Email Verification Token Model"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class EmailVerificationToken(models.Model):
    """
    Simple token-based email verification.
    Replaces complex allauth HMAC verification.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_verification_tokens'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        """Check if token is still valid (not used, not expired)."""
        if self.used:
            return False
        # Token expires after 24 hours
        expiry = self.created_at + timedelta(hours=24)
        return timezone.now() < expiry

    def mark_used(self):
        """Mark token as used."""
        self.used = True
        self.save()

    @classmethod
    def create_for_user(cls, user):
        """Create a new verification token for a user, invalidating old ones."""
        # Delete any existing unused tokens for this user
        cls.objects.filter(user=user, used=False).delete()
        return cls.objects.create(user=user)

    def __str__(self):
        return f"VerificationToken for {self.user.email}"
