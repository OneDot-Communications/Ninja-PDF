"""Tax Configuration Models for Multi-Region Billing"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class TaxRule(models.Model):
    """
    Tax configuration for different regions/countries.
    Supports VAT, GST, Sales Tax, and other tax types.
    """
    class TaxType(models.TextChoices):
        VAT = 'VAT', _('Value Added Tax')
        GST = 'GST', _('Goods and Services Tax')
        SALES_TAX = 'SALES_TAX', _('Sales Tax')
        WITHHOLDING = 'WITHHOLDING', _('Withholding Tax')
        CUSTOM = 'CUSTOM', _('Custom Tax')
    
    name = models.CharField(max_length=100, help_text="Display name for this tax rule")
    country_code = models.CharField(max_length=2, db_index=True, help_text="ISO 3166-1 alpha-2 country code")
    region = models.CharField(max_length=100, blank=True, help_text="Optional: State/Province/Region code")
    
    tax_type = models.CharField(max_length=20, choices=TaxType.choices, default=TaxType.VAT)
    rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Tax rate as percentage (e.g., 18.00 for 18%)")
    
    is_inclusive = models.BooleanField(default=False, help_text="Whether tax is included in displayed prices")
    is_active = models.BooleanField(default=True)
    
    applies_to_digital = models.BooleanField(default=True, help_text="Whether this tax applies to digital services")
    applies_to_business = models.BooleanField(default=True, help_text="Whether this tax applies to B2B transactions")
    
    # Thresholds
    registration_threshold = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Revenue threshold for tax registration requirement"
    )
    threshold_currency = models.CharField(max_length=3, default='INR')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_tax_rules'
    )
    
    class Meta:
        db_table = 'tax_rules'
        ordering = ['country_code', 'region']
        unique_together = ['country_code', 'region', 'tax_type']
    
    def __str__(self):
        region_str = f" ({self.region})" if self.region else ""
        return f"{self.name} - {self.country_code}{region_str}: {self.rate}%"
    
    @classmethod
    def get_applicable_tax(cls, country_code: str, region: str = None, is_business: bool = False):
        """
        Get the applicable tax rule for a given location.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code
            region: Optional state/province code
            is_business: Whether this is a B2B transaction
        
        Returns:
            TaxRule or None
        """
        # Try region-specific first
        if region:
            tax = cls.objects.filter(
                country_code=country_code.upper(),
                region__iexact=region,
                is_active=True,
                applies_to_digital=True,
            ).first()
            if tax:
                if is_business and not tax.applies_to_business:
                    return None
                return tax
        
        # Fall back to country-level
        return cls.objects.filter(
            country_code=country_code.upper(),
            region='',
            is_active=True,
            applies_to_digital=True,
        ).first()


class TaxExemption(models.Model):
    """
    Tax exemptions for specific users (e.g., businesses with valid tax IDs)
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tax_exemptions')
    country_code = models.CharField(max_length=2)
    tax_id = models.CharField(max_length=50, help_text="VAT/GST/Tax Registration Number")
    tax_id_type = models.CharField(max_length=50, help_text="e.g., EU VAT, GST, EIN")
    company_name = models.CharField(max_length=200)
    
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_exemptions'
    )
    
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_exemptions'
        unique_together = ['user', 'country_code']
    
    def __str__(self):
        return f"{self.user.email} - {self.tax_id} ({self.country_code})"


class BillingConfiguration(models.Model):
    """
    Global billing configuration settings.
    Singleton model - only one active configuration.
    """
    name = models.CharField(max_length=100, default="Default Configuration")
    is_active = models.BooleanField(default=True)
    
    # Company Details (for invoices)
    company_name = models.CharField(max_length=200, default="NinjaPDF")
    company_address = models.TextField(blank=True)
    company_tax_id = models.CharField(max_length=50, blank=True)
    company_email = models.EmailField(blank=True)
    company_phone = models.CharField(max_length=20, blank=True)
    company_logo = models.ImageField(upload_to='billing/', null=True, blank=True)
    
    # Default Currency
    default_currency = models.CharField(max_length=3, default='INR')
    supported_currencies = models.JSONField(default=list, help_text="List of supported currency codes")
    
    # Invoice Settings
    invoice_prefix = models.CharField(max_length=10, default='INV-')
    invoice_start_number = models.PositiveIntegerField(default=1000)
    invoice_footer = models.TextField(blank=True, help_text="Footer text for invoices")
    
    # Payment Settings
    payment_terms_days = models.PositiveIntegerField(default=0, help_text="Days until payment is due (0 = immediate)")
    grace_period_days = models.PositiveIntegerField(default=3, help_text="Grace period after failed payment")
    retry_failed_payments = models.BooleanField(default=True)
    max_payment_retries = models.PositiveIntegerField(default=3)
    
    # Tax Settings
    collect_tax = models.BooleanField(default=True)
    tax_inclusive_pricing = models.BooleanField(default=False)
    require_tax_id_for_business = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'billing_configuration'
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_active(cls):
        """Get the active billing configuration"""
        return cls.objects.filter(is_active=True).first()
    
    def save(self, *args, **kwargs):
        # Ensure only one active configuration
        if self.is_active:
            BillingConfiguration.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
