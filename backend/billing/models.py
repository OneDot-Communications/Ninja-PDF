from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Plan(models.Model):
    class Intervals(models.TextChoices):
        MONTHLY = 'MONTHLY', _('Monthly')
        YEARLY = 'YEARLY', _('Yearly')

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    interval = models.CharField(max_length=20, choices=Intervals.choices, default=Intervals.MONTHLY)
    features = models.JSONField(default=dict, help_text="JSON listing Plan features")
    is_active = models.BooleanField(default=True)
    stripe_price_id = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.interval})"

class Subscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        CANCELED = 'CANCELED', _('Canceled')
        PAST_DUE = 'PAST_DUE', _('Past Due')
        TRIALING = 'TRIALING', _('Trialing')

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIALING)
    current_period_start = models.DateTimeField(auto_now_add=True)
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)
    stripe_subscription_id = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} - {self.plan.name if self.plan else 'No Plan'}"

class BusinessDetails(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='business_details')
    company_name = models.CharField(max_length=200)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    billing_address = models.TextField()
    billing_email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.company_name

class Invoice(models.Model):
    class Status(models.TextChoices):
        PAID = 'PAID', _('Paid')
        OPEN = 'OPEN', _('Open')
        VOID = 'VOID', _('Void')
        UNCOLLECTIBLE = 'UNCOLLECTIBLE', _('Uncollectible')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invoices')
    number = models.CharField(max_length=50, unique=True)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    hosted_invoice_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Invoice {self.number} - {self.user.email}"

class Feature(models.Model):
    """
    Represents a specific system capability (e.g. 'MERGE_PDF').
    """
    name = models.CharField(max_length=100)
    code = models.SlugField(unique=True, help_text="Unique code used in code checks")
    description = models.TextField(blank=True)
    is_premium_default = models.BooleanField(default=False, help_text="If true, strictly Premium by default")

    def __str__(self):
        return self.name

class UserFeatureOverride(models.Model):
    """
    Per-user override for a feature.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feature_overrides')
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE)
    is_enabled = models.BooleanField(help_text="Explicitly enable (True) or disable (False) this feature for this user")
    
    class Meta:
        unique_together = ('user', 'feature')

    def __str__(self):
        return f"{self.user.email} - {self.feature.code}: {self.is_enabled}"

