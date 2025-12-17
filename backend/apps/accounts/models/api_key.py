from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
import secrets
from django.contrib.auth.hashers import make_password, check_password

class APIKey(models.Model):
    """
    API Keys for programmatic access.
    Display key only once upon creation. Store hash.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100, help_text="Friendly name for the key")
    
    # Store prefix for identification (e.g. 'nk_abc123...')
    prefix = models.CharField(max_length=8)
    # Store hashed key for verification
    key_hash = models.CharField(max_length=128)
    
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"

    @classmethod
    def create_key(cls, user, name):
        """
        Generates a new key, hashes it, and returns (instance, raw_key).
        """
        # Generate random key: prefix + secret
        # Format: nk_ + 32 chars hex
        prefix = secrets.token_hex(4) # 8 chars
        secret = secrets.token_hex(32)
        raw_key = f"nk_{prefix}_{secret}"
        
        # Hash the raw key
        key_hash = make_password(raw_key)
        
        instance = cls.objects.create(
            user=user,
            name=name,
            prefix=prefix,
            key_hash=key_hash
        )
        return instance, raw_key

    def verify(self, raw_key):
        return check_password(raw_key, self.key_hash)
