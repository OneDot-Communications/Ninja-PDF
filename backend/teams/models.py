from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Team(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_teams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional: Link to subscription logic if teams have their own plans
    # subscription = ...

    def __str__(self):
        return self.name

class Membership(models.Model):
    class Roles(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        MEMBER = 'MEMBER', _('Member')
        VIEWER = 'VIEWER', _('Viewer')

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_memberships')
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='invitations_sent')

    class Meta:
        unique_together = ('team', 'user')

    def __str__(self):
        return f"{self.user.email} in {self.team.name} as {self.role}"
