"""Teams API Views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.teams.models import Team, TeamMembership
from apps.teams.api.serializers import TeamSerializer, TeamMembershipSerializer


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet for teams."""
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Team.objects.filter(memberships__user=self.request.user)

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        TeamMembership.objects.create(team=team, user=self.request.user, role='OWNER')

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the team."""
        team = self.get_object()
        email = request.data.get('email')
        role = request.data.get('role', 'MEMBER')
        
        if not email:
            return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.accounts.models import User
        try:
            user = User.objects.get(email=email)
            membership, created = TeamMembership.objects.get_or_create(
                team=team, user=user, defaults={'role': role}
            )
            if not created:
                return Response({'error': 'User already in team'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'status': 'invited', 'user': user.email})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class TeamMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for team memberships."""
    serializer_class = TeamMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TeamMembership.objects.filter(user=self.request.user)
