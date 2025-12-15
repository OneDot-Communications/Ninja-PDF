"""Teams API Serializers"""
from rest_framework import serializers
from apps.teams.models import Team, TeamMembership, TeamInvitation

class TeamInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamInvitation
        fields = ['id', 'email', 'role', 'status', 'created_at']

class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    invitations = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'owner_email', 'member_count', 'invitations', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner_email', 'member_count', 'invitations', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_invitations(self, obj):
        # Only show pending invitations to the user (assuming user is owner/member who can see this)
        # Real-world: Check constraints. For now, show all pending.
        invites = obj.invitations.filter(status='PENDING')
        return TeamInvitationSerializer(invites, many=True).data

class TeamMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = TeamMembership
        fields = ['id', 'team', 'team_name', 'user', 'user_email', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'user_email', 'joined_at']
