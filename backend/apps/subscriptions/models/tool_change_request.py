"""
Tool Change Request Model
Implements approval workflow for admin tool tier changes.

When an admin wants to change a tool from FREE to PREMIUM or vice versa,
they create a ToolChangeRequest. Super Admin reviews and approves/rejects.
Once approved, the change propagates to all users automatically.
"""
from django.db import models
from django.conf import settings


class ToolChangeRequest(models.Model):
    """
    Admin request to change tool tier/availability.
    Requires Super Admin approval before taking effect.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    class ChangeType(models.TextChoices):
        FREE_TO_PREMIUM = 'FREE_TO_PREMIUM', 'Move to Premium Only'
        PREMIUM_TO_FREE = 'PREMIUM_TO_FREE', 'Make Available to Free'
        ENABLE_TOOL = 'ENABLE_TOOL', 'Enable Tool Globally'
        DISABLE_TOOL = 'DISABLE_TOOL', 'Disable Tool Globally'
        ADJUST_LIMIT = 'ADJUST_LIMIT', 'Adjust Usage Limits'
        TOGGLE_WATERMARK = 'TOGGLE_WATERMARK', 'Toggle Watermark'
    
    # Who requested
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tool_change_requests'
    )
    
    # What tool
    feature = models.ForeignKey(
        'subscriptions.Feature',
        on_delete=models.CASCADE,
        related_name='change_requests'
    )
    
    # What change
    change_type = models.CharField(max_length=20, choices=ChangeType.choices)
    
    # Request details
    reason = models.TextField(help_text='Reason for the change')
    
    # For limit changes
    new_value = models.JSONField(null=True, blank=True, help_text='New value for limits/config')
    old_value = models.JSONField(null=True, blank=True, help_text='Previous value (auto-captured)')
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Approval details
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_tool_changes'
    )
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Was the change applied?
    applied_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Tool Change Request'
        verbose_name_plural = 'Tool Change Requests'
    
    def __str__(self):
        return f"{self.change_type} for {self.feature.code} - {self.status}"
    
    def approve(self, reviewer, notes=''):
        """Approve the request and apply the change."""
        from django.utils import timezone
        
        self.status = self.Status.APPROVED
        self.reviewed_by = reviewer
        self.review_notes = notes
        self.reviewed_at = timezone.now()
        self.save()
        
        # Apply the change
        self._apply_change()
        self.applied_at = timezone.now()
        self.save()
        
        # Notify the requester
        self._notify_requester(approved=True)
        
        return True
    
    def reject(self, reviewer, notes=''):
        """Reject the request."""
        from django.utils import timezone
        
        self.status = self.Status.REJECTED
        self.reviewed_by = reviewer
        self.review_notes = notes
        self.reviewed_at = timezone.now()
        self.save()
        
        # Notify the requester
        self._notify_requester(approved=False)
        
        return True
    
    def _apply_change(self):
        """Apply the approved change to the system."""
        from apps.subscriptions.models import PlanFeature, Feature
        from apps.subscriptions.models.subscription import Plan
        
        if self.change_type == self.ChangeType.FREE_TO_PREMIUM:
            # Remove from free plan, ensure in premium
            free_plan = Plan.objects.filter(name__icontains='free').first()
            if free_plan:
                PlanFeature.objects.filter(plan=free_plan, feature=self.feature).delete()
        
        elif self.change_type == self.ChangeType.PREMIUM_TO_FREE:
            # Add to free plan
            free_plan = Plan.objects.filter(name__icontains='free').first()
            if free_plan:
                PlanFeature.objects.get_or_create(
                    plan=free_plan, 
                    feature=self.feature,
                    defaults={'is_enabled': True}
                )
        
        elif self.change_type == self.ChangeType.ENABLE_TOOL:
            self.feature.is_active = True
            self.feature.save()
        
        elif self.change_type == self.ChangeType.DISABLE_TOOL:
            self.feature.is_active = False
            self.feature.save()
        
        elif self.change_type == self.ChangeType.ADJUST_LIMIT:
            # Update plan features with new limits
            if self.new_value:
                PlanFeature.objects.filter(feature=self.feature).update(
                    daily_limit=self.new_value.get('daily_limit'),
                    monthly_limit=self.new_value.get('monthly_limit')
                )
    
    def _notify_requester(self, approved):
        """Send email notification to the admin who requested the change."""
        from django.core.mail import send_mail
        from django.conf import settings
        
        status = 'APPROVED' if approved else 'REJECTED'
        subject = f'Tool Change Request {status}: {self.feature.name}'
        message = f"""
Hello {self.requested_by.first_name or self.requested_by.email},

Your tool change request has been {status.lower()}.

Tool: {self.feature.name}
Change Type: {self.get_change_type_display()}
Reason: {self.reason}

Reviewer Notes: {self.review_notes or 'No notes provided'}

{'The change has been applied to the system.' if approved else 'No changes were made.'}

- 18+ PDF System
"""
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.requested_by.email],
                fail_silently=True
            )
        except Exception:
            pass
