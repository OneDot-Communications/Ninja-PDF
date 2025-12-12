from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager
from .session_models import UserSession # Import the new model

class User(AbstractUser):
    username = None # Remove username field
    email = models.EmailField(_('email address'), unique=True)
    
    class Roles(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', _('Super Admin')
        ADMIN = 'ADMIN', _('Admin')
        USER = 'USER', _('User')

    class SubscriptionTiers(models.TextChoices):
        FREE = 'FREE', _('Free')
        PRO = 'PRO', _('Pro')
        PREMIUM = 'PREMIUM', _('Premium')
        ENTERPRISE = 'ENTERPRISE', _('Enterprise')

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.USER,
        help_text=_("User role in the system")
    )

    subscription_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTiers.choices,
        default=SubscriptionTiers.FREE,
        help_text=_("Subscription tier level")
    )

    is_verified = models.BooleanField(
        default=False,
        help_text=_("Whether the user has verified their email via OTP")
    )

    # Profile Fields
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = CustomUserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email

    @property
    def is_super_admin(self):
        return self.role == self.Roles.SUPER_ADMIN

    @property
    def is_admin(self):
        return self.role in [self.Roles.SUPER_ADMIN, self.Roles.ADMIN]

class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_otps'

    def __str__(self):
        return f"{self.user.email} - {self.code}"
