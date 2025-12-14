from rest_framework import viewsets, permissions, status, exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Team, Membership
from .serializers import TeamSerializer, MembershipSerializer
from authentication.models import User

class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can see teams they own OR are members of
        return Team.objects.filter(
            Q(owner=self.request.user) | Q(memberships__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        # Owner is automatically an ADMIN member
        Membership.objects.create(team=team, user=self.request.user, role=Membership.Roles.ADMIN)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        team = self.get_object()
        
        # Check permission: Only Admins/Owners can invite
        is_owner = team.owner == request.user
        is_admin_member = team.memberships.filter(user=request.user, role=Membership.Roles.ADMIN).exists()
        
        if not (is_owner or is_admin_member):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        role = request.data.get('role', Membership.Roles.MEMBER)

        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_to_invite = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found. They must be registered first.'}, status=status.HTTP_404_NOT_FOUND)

        if Membership.objects.filter(team=team, user=user_to_invite).exists():
            return Response({'error': 'User is already a member'}, status=status.HTTP_400_BAD_REQUEST)

        Membership.objects.create(
            team=team, 
            user=user_to_invite, 
            role=role,
            invited_by=request.user
        )
        return Response({'status': 'Invited successfully'})

class MembershipViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Show memberships for teams the user is part of
        return Membership.objects.filter(team__in=Team.objects.filter(memberships__user=self.request.user))
