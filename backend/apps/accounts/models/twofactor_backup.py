from django.db import models
from django.conf import settings
from django.utils import timezone
import hashlib
import secrets


class TwoFactorBackupCode(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='backup_codes')
    code_hash = models.CharField(max_length=128)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'twofactor_backup_codes'

    @staticmethod
    def generate_codes(n=10):
        codes = []
        for _ in range(n):
            code = secrets.token_urlsafe(9)  # ~12 chars
            codes.append(code)
        return codes

    @staticmethod
    def hash_code(code: str) -> str:
        return hashlib.sha256(code.encode('utf-8')).hexdigest()

    def check_code(self, code: str) -> bool:
        return self.code_hash == self.hash_code(code)
