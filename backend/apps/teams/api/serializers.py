"""Teams API Serializers"""
from rest_framework import serializers
from apps.teams.models import Team, TeamMembership


class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'owner_email', 'member_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner_email', 'member_count', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.memberships.count()


class TeamMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = TeamMembership
        fields = ['id', 'team', 'team_name', 'user', 'user_email', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'user_email', 'joined_at']
