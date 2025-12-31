"""Feedback Model - Stores user feedback submissions"""
from django.db import models
from django.conf import settings


class Feedback(models.Model):
    """Model to store user feedback submissions"""
    
    FEEDBACK_TYPE_CHOICES = [
        ('bug', 'Bug'),
        ('functionality', 'Add functionality'),
        ('ui', 'Change UI'),
    ]
    
    # User who submitted feedback (optional - can be anonymous)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks',
        help_text="User who submitted the feedback (if authenticated)"
    )
    
    # Required fields from form
    name = models.CharField(
        max_length=255,
        help_text="Name of the person providing feedback"
    )
    
    email = models.EmailField(
        help_text="Email address of the person providing feedback"
    )
    
    feedback_type = models.CharField(
        max_length=20,
        choices=FEEDBACK_TYPE_CHOICES,
        help_text="Type of feedback"
    )
    
    description = models.TextField(
        help_text="Detailed description of the feedback"
    )
    
    proof_link = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Optional link to cloud drive attachment (Google Drive, Dropbox, etc.)"
    )
    
    # Metadata
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when feedback was submitted"
    )
    
    # Additional tracking fields
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the submitter"
    )
    
    user_agent = models.TextField(
        null=True,
        blank=True,
        help_text="Browser user agent string"
    )
    
    is_resolved = models.BooleanField(
        default=False,
        help_text="Whether this feedback has been addressed"
    )
    
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the feedback was resolved"
    )
    
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_feedbacks',
        help_text="Admin who resolved the feedback"
    )
    
    admin_notes = models.TextField(
        blank=True,
        default='',
        help_text="Internal notes from admin/staff"
    )
    
    class Meta:
        app_label = 'core'
        db_table = 'core_feedback'
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['feedback_type']),
            models.Index(fields=['is_resolved']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.feedback_type} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def mark_resolved(self, admin_user=None, notes=''):
        """Mark this feedback as resolved"""
        from django.utils import timezone
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = admin_user
        if notes:
            self.admin_notes = notes
        self.save()
