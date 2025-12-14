from rest_framework import serializers
from authentication.serializers import UserSerializer
from .models import Team, Membership

class MembershipSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Membership
        fields = ['id', 'user', 'user_details', 'role', 'joined_at', 'invited_by']
        read_only_fields = ['joined_at', 'invited_by']

class TeamSerializer(serializers.ModelSerializer):
    memberships = MembershipSerializer(many=True, read_only=True)
    owner_details = UserSerializer(source='owner', read_only=True)
    member_count = serializers.IntegerField(source='memberships.count', read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'owner', 'owner_details', 'memberships', 'member_count', 'created_at', 'updated_at']
        read_only_fields = ['owner', 'created_at', 'updated_at']
