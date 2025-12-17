"""Content Management Models for FAQs, Tutorials, and Announcements"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.utils.text import slugify


class ContentCategory(models.Model):
    """Categories for organizing content"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or emoji")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')

    class Meta:
        app_label = 'core'
        db_table = 'content_categories'
        ordering = ['order', 'name']
        verbose_name_plural = 'Content Categories'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class FAQArticle(models.Model):
    """
    FAQ articles for help center.
    Tasks 135-137: Create/Edit/Delete FAQ articles
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PUBLISHED = 'PUBLISHED', _('Published')
        ARCHIVED = 'ARCHIVED', _('Archived')

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    question = models.TextField(help_text="The FAQ question")
    answer = models.TextField(help_text="The answer (supports Markdown)")
    
    category = models.ForeignKey(ContentCategory, on_delete=models.SET_NULL, null=True, related_name='faqs')
    tags = models.JSONField(default=list, blank=True)
    
    # SEO
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True, max_length=500)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    order = models.PositiveIntegerField(default=0)
    
    # Feature in prominent places
    is_featured = models.BooleanField(default=False)
    
    # Stats
    view_count = models.PositiveIntegerField(default=0)
    helpful_count = models.PositiveIntegerField(default=0)
    not_helpful_count = models.PositiveIntegerField(default=0)
    
    # Authorship
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_faqs')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='updated_faqs')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'core'
        db_table = 'faq_articles'
        ordering = ['category', 'order', 'title']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:255]
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class Tutorial(models.Model):
    """
    Tutorial/Guide articles.
    Tasks 138-139: Create tutorials, Update tutorials
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PUBLISHED = 'PUBLISHED', _('Published')
        ARCHIVED = 'ARCHIVED', _('Archived')
    
    class DifficultyLevel(models.TextChoices):
        BEGINNER = 'BEGINNER', _('Beginner')
        INTERMEDIATE = 'INTERMEDIATE', _('Intermediate')
        ADVANCED = 'ADVANCED', _('Advanced')

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    summary = models.TextField(max_length=500, help_text="Brief description shown in lists")
    content = models.TextField(help_text="Full tutorial content (supports Markdown)")
    
    category = models.ForeignKey(ContentCategory, on_delete=models.SET_NULL, null=True, related_name='tutorials')
    tags = models.JSONField(default=list, blank=True)
    
    # Media
    featured_image = models.ImageField(upload_to='tutorials/', null=True, blank=True)
    video_url = models.URLField(blank=True, help_text="External video URL (YouTube, Vimeo)")
    
    # Difficulty and time
    difficulty = models.CharField(max_length=20, choices=DifficultyLevel.choices, default=DifficultyLevel.BEGINNER)
    estimated_time_minutes = models.PositiveIntegerField(default=5)
    
    # Related tools
    related_tools = models.JSONField(default=list, blank=True, help_text="Tool codes this tutorial covers")
    
    # SEO
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True, max_length=500)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    order = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    
    # Stats
    view_count = models.PositiveIntegerField(default=0)
    completion_count = models.PositiveIntegerField(default=0)
    
    # Authorship
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tutorials')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='updated_tutorials')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'core'
        db_table = 'tutorials'
        ordering = ['order', '-published_at']

    def __str__(self):
        return self.title


class Announcement(models.Model):
    """
    System announcements.
    Tasks 140-141: Publish/Schedule system announcements
    """
    class Type(models.TextChoices):
        INFO = 'INFO', _('Information')
        SUCCESS = 'SUCCESS', _('Success')
        WARNING = 'WARNING', _('Warning')
        ERROR = 'ERROR', _('Error/Critical')
        MAINTENANCE = 'MAINTENANCE', _('Maintenance')
        FEATURE = 'FEATURE', _('New Feature')
        PROMOTION = 'PROMOTION', _('Promotion')
    
    class DisplayLocation(models.TextChoices):
        BANNER = 'BANNER', _('Top Banner')
        MODAL = 'MODAL', _('Modal Popup')
        SIDEBAR = 'SIDEBAR', _('Sidebar')
        DASHBOARD = 'DASHBOARD', _('Dashboard Only')
        ALL = 'ALL', _('Everywhere')

    title = models.CharField(max_length=255)
    content = models.TextField(help_text="Announcement content (supports Markdown)")
    
    announcement_type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    display_location = models.CharField(max_length=20, choices=DisplayLocation.choices, default=DisplayLocation.BANNER)
    
    # Targeting
    target_roles = models.JSONField(default=list, blank=True, help_text="Empty = all roles")
    target_plans = models.JSONField(default=list, blank=True, help_text="Empty = all plans")
    target_countries = models.JSONField(default=list, blank=True, help_text="Empty = all countries")
    
    # Link
    link_text = models.CharField(max_length=100, blank=True)
    link_url = models.URLField(blank=True)
    
    # Scheduling
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Display settings
    is_dismissible = models.BooleanField(default=True)
    show_once_per_session = models.BooleanField(default=False)
    priority = models.PositiveIntegerField(default=0, help_text="Higher = shown first")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Stats
    view_count = models.PositiveIntegerField(default=0)
    dismiss_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'announcements'
        ordering = ['-priority', '-start_date']

    def __str__(self):
        return self.title

    @property
    def is_currently_active(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True


class AnnouncementDismissal(models.Model):
    """Track which users have dismissed which announcements"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dismissed_announcements')
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='dismissals')
    dismissed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'announcement_dismissals'
        unique_together = ('user', 'announcement')


class SupportTicket(models.Model):
    """
    Support ticket system.
    Tasks 128-134: Customer support
    Task 194-196: Priority support for premium
    """
    class Status(models.TextChoices):
        OPEN = 'OPEN', _('Open')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        WAITING_CUSTOMER = 'WAITING_CUSTOMER', _('Waiting for Customer')
        WAITING_THIRD_PARTY = 'WAITING_THIRD_PARTY', _('Waiting for Third Party')
        RESOLVED = 'RESOLVED', _('Resolved')
        CLOSED = 'CLOSED', _('Closed')
    
    class Priority(models.TextChoices):
        LOW = 'LOW', _('Low')
        MEDIUM = 'MEDIUM', _('Medium')
        HIGH = 'HIGH', _('High')
        URGENT = 'URGENT', _('Urgent')
    
    class Category(models.TextChoices):
        BILLING = 'BILLING', _('Billing')
        TECHNICAL = 'TECHNICAL', _('Technical Issue')
        ACCOUNT = 'ACCOUNT', _('Account')
        FEATURE_REQUEST = 'FEATURE_REQUEST', _('Feature Request')
        BUG_REPORT = 'BUG_REPORT', _('Bug Report')
        OTHER = 'OTHER', _('Other')

    ticket_number = models.CharField(max_length=20, unique=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    
    # Assignment
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    
    # Premium handling
    is_priority = models.BooleanField(default=False, help_text="Premium user priority ticket")
    
    # SLA tracking
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Related entities
    related_job = models.ForeignKey('jobs.Job', on_delete=models.SET_NULL, null=True, blank=True)
    related_invoice = models.ForeignKey('subscriptions.Invoice', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Attachments (stored as JSON list of file paths)
    attachments = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'support_tickets'
        ordering = ['-is_priority', '-created_at']

    def __str__(self):
        return f"#{self.ticket_number}: {self.subject}"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            # Generate ticket number: TKT-YYYYMMDD-NNNN
            import datetime
            import random
            today = datetime.date.today().strftime('%Y%m%d')
            random_part = str(random.randint(1000, 9999))
            self.ticket_number = f"TKT-{today}-{random_part}"
        super().save(*args, **kwargs)


class TicketMessage(models.Model):
    """Messages within a support ticket"""
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="Internal note not visible to user")
    attachments = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'ticket_messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message on {self.ticket.ticket_number}"
