"""SSO/SAML Models for Single Sign-On Authentication"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import secrets


class SSOProvider(models.Model):
    """
    SSO/SAML Identity Provider Configuration.
    Task 200: Enable SSO
    """
    class ProviderType(models.TextChoices):
        SAML = 'SAML', _('SAML 2.0')
        OIDC = 'OIDC', _('OpenID Connect')
        LDAP = 'LDAP', _('LDAP/Active Directory')
        AZURE_AD = 'AZURE_AD', _('Azure Active Directory')
        OKTA = 'OKTA', _('Okta')
        GOOGLE_WORKSPACE = 'GOOGLE_WORKSPACE', _('Google Workspace')
        ONELOGIN = 'ONELOGIN', _('OneLogin')
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        TESTING = 'TESTING', _('Testing')

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    provider_type = models.CharField(max_length=20, choices=ProviderType.choices)
    
    # Organization/Team (for enterprise)
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, null=True, blank=True, related_name='sso_providers')
    
    # SAML Configuration
    entity_id = models.CharField(max_length=500, blank=True, help_text="IdP Entity ID")
    sso_url = models.URLField(blank=True, help_text="IdP SSO URL")
    slo_url = models.URLField(blank=True, help_text="IdP Single Logout URL")
    certificate = models.TextField(blank=True, help_text="IdP X.509 Certificate")
    
    # OIDC Configuration  
    client_id = models.CharField(max_length=255, blank=True)
    client_secret = models.CharField(max_length=255, blank=True)
    authorization_endpoint = models.URLField(blank=True)
    token_endpoint = models.URLField(blank=True)
    userinfo_endpoint = models.URLField(blank=True)
    jwks_uri = models.URLField(blank=True)
    
    # LDAP Configuration
    ldap_server = models.CharField(max_length=255, blank=True)
    ldap_port = models.PositiveIntegerField(default=389)
    ldap_use_ssl = models.BooleanField(default=False)
    ldap_bind_dn = models.CharField(max_length=255, blank=True)
    ldap_bind_password = models.CharField(max_length=255, blank=True)
    ldap_base_dn = models.CharField(max_length=255, blank=True)
    ldap_user_filter = models.CharField(max_length=255, default='(uid={username})')
    
    # Attribute Mapping
    attribute_mapping = models.JSONField(default=dict, blank=True, help_text="Map IdP attributes to user fields")
    
    # Auto-provisioning
    auto_create_users = models.BooleanField(default=True, help_text="Auto-create users on first SSO login")
    default_role = models.CharField(max_length=20, default='USER')
    allowed_domains = models.JSONField(default=list, blank=True, help_text="Restrict to specific email domains")
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INACTIVE)
    is_default = models.BooleanField(default=False, help_text="Default SSO for organization")
    
    # Metadata
    metadata_url = models.URLField(blank=True, help_text="IdP Metadata URL for auto-configuration")
    sp_entity_id = models.CharField(max_length=500, blank=True, help_text="Service Provider Entity ID")
    sp_acs_url = models.URLField(blank=True, help_text="Service Provider ACS URL")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sso_providers'
        verbose_name = 'SSO Provider'
        verbose_name_plural = 'SSO Providers'

    def __str__(self):
        return f"{self.name} ({self.provider_type})"

    @classmethod
    def get_for_email_domain(cls, email):
        """Find SSO provider for an email domain"""
        domain = email.split('@')[-1].lower()
        providers = cls.objects.filter(status='ACTIVE', allowed_domains__contains=domain)
        return providers.first()


class SSOSession(models.Model):
    """Track SSO login sessions"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sso_sessions')
    provider = models.ForeignKey(SSOProvider, on_delete=models.CASCADE)
    
    session_index = models.CharField(max_length=255, blank=True, help_text="IdP session index for SLO")
    name_id = models.CharField(max_length=255, blank=True, help_text="SAML NameID")
    
    idp_attributes = models.JSONField(default=dict, blank=True, help_text="Raw attributes from IdP")
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sso_sessions'

    def __str__(self):
        return f"{self.user.email} via {self.provider.name}"


class SSOLoginAttempt(models.Model):
    """Track SSO login attempts for debugging"""
    class Status(models.TextChoices):
        INITIATED = 'INITIATED', _('Initiated')
        SUCCESS = 'SUCCESS', _('Success')
        FAILED = 'FAILED', _('Failed')

    provider = models.ForeignKey(SSOProvider, on_delete=models.CASCADE, null=True)
    
    request_id = models.CharField(max_length=255, unique=True)
    relay_state = models.TextField(blank=True)
    
    # Result
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sso_login_attempts'
        ordering = ['-created_at']

    @classmethod
    def generate_request_id(cls):
        return f"req_{secrets.token_urlsafe(32)}"
