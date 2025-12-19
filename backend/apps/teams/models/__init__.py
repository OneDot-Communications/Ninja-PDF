"""Teams Models"""
from django.db import models
from django.conf import settings


class Team(models.Model):
    """Team for collaborative work."""
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_teams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Enterprise/Organization Features (Tasks 197-199)
    is_organization = models.BooleanField(default=False, help_text="Enterprise organization account")
    storage_quota = models.BigIntegerField(default=0, help_text="Storage quota in bytes (0 = unlimited)")
    operations_quota = models.PositiveIntegerField(default=0, help_text="Monthly operations quota (0 = unlimited)")
    shared_plan = models.ForeignKey('subscriptions.Plan', on_delete=models.SET_NULL, null=True, blank=True, 
                                     help_text="Shared subscription plan for all team members")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    """Membership linking users to teams."""
    ROLE_CHOICES = [
        ('OWNER', 'Owner'),
        ('ADMIN', 'Admin'),
        ('MEMBER', 'Member'),
    ]
    
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['team', 'user']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.email} - {self.team.name} ({self.role})"
from .invitation import TeamInvitation
