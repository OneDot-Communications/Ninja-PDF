"""Coupon and Discount Models for Subscription Management"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import secrets
import string


class Coupon(models.Model):
    """
    Promotional coupon for discounts on subscriptions.
    Tasks 32-33: Promotional pricing, coupons & discounts
    """
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', _('Percentage')
        FIXED_AMOUNT = 'FIXED_AMOUNT', _('Fixed Amount')
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        EXPIRED = 'EXPIRED', _('Expired')
        EXHAUSTED = 'EXHAUSTED', _('Exhausted')
        DISABLED = 'DISABLED', _('Disabled')

    code = models.CharField(max_length=50, unique=True, help_text="Unique coupon code")
    name = models.CharField(max_length=100, help_text="Internal name for reference")
    description = models.TextField(blank=True)
    
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage (0-100) or fixed amount")
    
    # Validity
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True, help_text="Leave blank for indefinite")
    
    # Usage limits
    max_uses = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    times_used = models.PositiveIntegerField(default=0)
    max_uses_per_user = models.PositiveIntegerField(default=1, help_text="0 = unlimited per user")
    
    # Restrictions
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    applicable_plans = models.ManyToManyField('Plan', blank=True, help_text="Leave empty for all plans")
    new_users_only = models.BooleanField(default=False)
    
    # Stripe integration
    stripe_coupon_id = models.CharField(max_length=100, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'coupons'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.discount_value}{'%' if self.discount_type == 'PERCENTAGE' else ''})"

    @property
    def is_valid(self):
        """Check if coupon is currently valid"""
        now = timezone.now()
        if self.status != self.Status.ACTIVE:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_uses > 0 and self.times_used >= self.max_uses:
            return False
        return True

    def apply_discount(self, original_price):
        """Calculate discounted price"""
        if self.discount_type == self.DiscountType.PERCENTAGE:
            discount = original_price * (self.discount_value / 100)
        else:
            discount = self.discount_value
        return max(0, original_price - discount)

    @classmethod
    def generate_code(cls, length=8):
        """Generate a random coupon code"""
        chars = string.ascii_uppercase + string.digits
        while True:
            code = ''.join(secrets.choice(chars) for _ in range(length))
            if not cls.objects.filter(code=code).exists():
                return code


class CouponUsage(models.Model):
    """Track coupon usage per user"""
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coupon_usages')
    used_at = models.DateTimeField(auto_now_add=True)
    order_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'coupon_usages'


class RegionalPricing(models.Model):
    """
    Regional pricing configuration for plans.
    Task 34: Set regional pricing
    """
    plan = models.ForeignKey('Plan', on_delete=models.CASCADE, related_name='regional_prices')
    country_code = models.CharField(max_length=3, help_text="ISO 3166-1 alpha-2 country code")
    country_name = models.CharField(max_length=100)
    currency = models.CharField(max_length=3, default='INR')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_price_id = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'regional_pricing'
        unique_together = ('plan', 'country_code')

    def __str__(self):
        return f"{self.plan.name} - {self.country_code}: {self.currency} {self.price}"


class TaxConfiguration(models.Model):
    """
    Tax configuration per country/region.
    Task 35: Configure tax rules (VAT, GST)
    """
    class TaxType(models.TextChoices):
        VAT = 'VAT', _('VAT')
        GST = 'GST', _('GST')
        SALES_TAX = 'SALES_TAX', _('Sales Tax')
        NONE = 'NONE', _('None')

    country_code = models.CharField(max_length=3, unique=True)
    country_name = models.CharField(max_length=100)
    tax_type = models.CharField(max_length=20, choices=TaxType.choices, default=TaxType.NONE)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Tax rate as percentage")
    tax_id_required = models.BooleanField(default=False, help_text="Is tax ID required for B2B?")
    reverse_charge_applicable = models.BooleanField(default=False)
    stripe_tax_id = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'tax_configurations'

    def __str__(self):
        return f"{self.country_code}: {self.tax_type} {self.tax_rate}%"


class TrialConfiguration(models.Model):
    """
    Free trial configuration.
    Tasks 26-27: Define free trial duration, Enable/disable trials
    """
    plan = models.OneToOneField('Plan', on_delete=models.CASCADE, related_name='trial_config')
    trial_days = models.PositiveIntegerField(default=7)
    is_enabled = models.BooleanField(default=True)
    requires_payment_method = models.BooleanField(default=False)
    allow_multiple_trials = models.BooleanField(default=False, help_text="Allow same user multiple trials")
    
    class Meta:
        db_table = 'trial_configurations'

    def __str__(self):
        return f"{self.plan.name} Trial: {self.trial_days} days"
