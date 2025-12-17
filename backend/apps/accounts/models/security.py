"""Security Models for IP Rules, Password Policies, and Rate Limiting"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class IPRule(models.Model):
    """
    IP Whitelisting/Blacklisting for security.
    Tasks 93-94: Configure IP whitelisting/blacklisting
    """
    class RuleType(models.TextChoices):
        WHITELIST = 'WHITELIST', _('Whitelist')
        BLACKLIST = 'BLACKLIST', _('Blacklist')
    
    class Scope(models.TextChoices):
        GLOBAL = 'GLOBAL', _('Global - All endpoints')
        ADMIN = 'ADMIN', _('Admin Panel Only')
        API = 'API', _('API Only')
        AUTH = 'AUTH', _('Authentication Only')

    ip_address = models.GenericIPAddressField(help_text="Single IP address")
    ip_range_start = models.GenericIPAddressField(null=True, blank=True, help_text="IP range start (optional)")
    ip_range_end = models.GenericIPAddressField(null=True, blank=True, help_text="IP range end (optional)")
    cidr = models.CharField(max_length=50, blank=True, null=True, help_text="CIDR notation e.g. 192.168.1.0/24")
    
    rule_type = models.CharField(max_length=20, choices=RuleType.choices)
    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.GLOBAL)
    
    reason = models.TextField(blank=True, help_text="Why this rule was created")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Auto-expire date")
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Stats
    hits = models.PositiveIntegerField(default=0, help_text="Number of times this rule was triggered")
    last_hit_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ip_rules'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rule_type}: {self.ip_address} ({self.scope})"

    def is_valid(self):
        """Check if rule is currently active and not expired"""
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True

    def record_hit(self):
        """Record when this rule is triggered"""
        self.hits += 1
        self.last_hit_at = timezone.now()
        self.save(update_fields=['hits', 'last_hit_at'])


class RateLimitRule(models.Model):
    """
    Custom rate limiting rules.
    Task 87: Set API rate limits
    """
    class Scope(models.TextChoices):
        GLOBAL = 'GLOBAL', _('Global - All users')
        ROLE = 'ROLE', _('Per Role')
        PLAN = 'PLAN', _('Per Plan')
        USER = 'USER', _('Specific User')
        ENDPOINT = 'ENDPOINT', _('Specific Endpoint')
    
    class TimeWindow(models.TextChoices):
        SECOND = 'SECOND', _('Per Second')
        MINUTE = 'MINUTE', _('Per Minute')
        HOUR = 'HOUR', _('Per Hour')
        DAY = 'DAY', _('Per Day')

    name = models.CharField(max_length=100)
    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.GLOBAL)
    
    # Target (based on scope)
    target_role = models.CharField(max_length=20, blank=True, null=True, help_text="USER, ADMIN, SUPER_ADMIN")
    target_plan = models.ForeignKey('subscriptions.Plan', on_delete=models.CASCADE, null=True, blank=True)
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    target_endpoint = models.CharField(max_length=200, blank=True, null=True, help_text="API endpoint pattern")
    
    # Rate limit settings
    requests_allowed = models.PositiveIntegerField(default=100)
    time_window = models.CharField(max_length=20, choices=TimeWindow.choices, default=TimeWindow.MINUTE)
    
    # Burst settings
    burst_allowed = models.PositiveIntegerField(default=20, help_text="Extra requests allowed in burst")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rate_limit_rules'

    def __str__(self):
        return f"{self.name}: {self.requests_allowed}/{self.time_window}"


class PasswordPolicy(models.Model):
    """
    Global password policy configuration.
    Task 20: Enforce password policies globally
    """
    name = models.CharField(max_length=100, default="Default Policy")
    is_active = models.BooleanField(default=True)
    
    # Length requirements
    min_length = models.PositiveIntegerField(default=8)
    max_length = models.PositiveIntegerField(default=128)
    
    # Character requirements
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_digit = models.BooleanField(default=True)
    require_special = models.BooleanField(default=True)
    special_characters = models.CharField(max_length=100, default="!@#$%^&*()_+-=[]{}|;':\",./<>?")
    
    # Password history
    prevent_reuse_count = models.PositiveIntegerField(default=5, help_text="Number of previous passwords to check")
    
    # Expiry
    password_expires_days = models.PositiveIntegerField(default=0, help_text="0 = never expires")
    warn_before_expiry_days = models.PositiveIntegerField(default=7)
    
    # Lockout settings
    max_failed_attempts = models.PositiveIntegerField(default=5)
    lockout_duration_minutes = models.PositiveIntegerField(default=30)
    
    # Breach check
    check_breached_passwords = models.BooleanField(default=True, help_text="Check against known breached passwords")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'password_policies'

    def __str__(self):
        return f"{self.name} (min: {self.min_length})"

    @classmethod
    def get_active_policy(cls):
        """Get the currently active password policy"""
        return cls.objects.filter(is_active=True).first()

    def validate_password(self, password):
        """Validate password against policy, returns (is_valid, errors)"""
        errors = []
        
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters")
        if len(password) > self.max_length:
            errors.append(f"Password must be at most {self.max_length} characters")
        
        if self.require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        if self.require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        if self.require_digit and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        if self.require_special and not any(c in self.special_characters for c in password):
            errors.append(f"Password must contain at least one special character ({self.special_characters})")
        
        return len(errors) == 0, errors


class PasswordHistory(models.Model):
    """Track password history to prevent reuse"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_history')
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'password_history'
        ordering = ['-created_at']


class FailedLoginAttempt(models.Model):
    """Track failed login attempts for lockout"""
    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=100, default="invalid_credentials")

    class Meta:
        db_table = 'failed_login_attempts'
        ordering = ['-attempted_at']

    @classmethod
    def get_recent_attempts(cls, email=None, ip_address=None, minutes=30):
        """Get failed attempts in the last N minutes"""
        since = timezone.now() - timezone.timedelta(minutes=minutes)
        qs = cls.objects.filter(attempted_at__gte=since)
        if email:
            qs = qs.filter(email=email)
        if ip_address:
            qs = qs.filter(ip_address=ip_address)
        return qs.count()


class AuditLog(models.Model):
    """
    Comprehensive audit log for all admin actions.
    Tasks 91-92: View system audit logs, Export audit logs
    """
    class ActionType(models.TextChoices):
        CREATE = 'CREATE', _('Create')
        UPDATE = 'UPDATE', _('Update')
        DELETE = 'DELETE', _('Delete')
        VIEW = 'VIEW', _('View')
        LOGIN = 'LOGIN', _('Login')
        LOGOUT = 'LOGOUT', _('Logout')
        EXPORT = 'EXPORT', _('Export')
        IMPORT = 'IMPORT', _('Import')
        ADMIN_ACTION = 'ADMIN_ACTION', _('Admin Action')
        SYSTEM = 'SYSTEM', _('System')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    
    # What was affected
    resource_type = models.CharField(max_length=100, help_text="Model name or resource type")
    resource_id = models.CharField(max_length=100, blank=True, null=True)
    resource_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Details
    description = models.TextField()
    old_value = models.JSONField(null=True, blank=True, help_text="Previous state")
    new_value = models.JSONField(null=True, blank=True, help_text="New state")
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['action_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.action_type}: {self.resource_type} by {self.user}"


class SystemConfiguration(models.Model):
    """
    Extended system configuration for all RBAC settings.
    Extends SystemSetting with more structure.
    """
    class Category(models.TextChoices):
        SECURITY = 'SECURITY', _('Security')
        PROCESSING = 'PROCESSING', _('Processing')
        STORAGE = 'STORAGE', _('Storage')
        PAYMENT = 'PAYMENT', _('Payment')
        EMAIL = 'EMAIL', _('Email')
        FEATURE = 'FEATURE', _('Feature')
        LIMITS = 'LIMITS', _('Limits')
        DISPLAY = 'DISPLAY', _('Display')

    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField(blank=True)
    
    # Validation
    value_type = models.CharField(max_length=20, default='STRING')  # STRING, INTEGER, BOOLEAN, JSON, FLOAT
    min_value = models.CharField(max_length=50, blank=True, null=True)
    max_value = models.CharField(max_length=50, blank=True, null=True)
    allowed_values = models.JSONField(null=True, blank=True, help_text="List of allowed values")
    
    is_public = models.BooleanField(default=False)
    is_editable = models.BooleanField(default=True)
    requires_restart = models.BooleanField(default=False)
    
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_configurations'

    def __str__(self):
        return f"{self.category}/{self.key}"
