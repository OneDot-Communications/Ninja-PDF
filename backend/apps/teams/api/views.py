"""Teams API Views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.teams.models import Team, TeamMembership
from apps.teams.api.serializers import TeamSerializer, TeamMembershipSerializer
import os


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
        """Invite a user to the team via email."""
        team = self.get_object()
        email = request.data.get('email')
        role = request.data.get('role', 'MEMBER')
        
        if not email:
            return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.accounts.models import User
        from apps.teams.models import TeamMembership, TeamInvitation
        
        # Check if already a member
        if TeamMembership.objects.filter(team=team, user__email=email).exists():
             return Response({'error': 'User already in team'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for pending invitation
        if TeamInvitation.objects.filter(team=team, email=email, status='PENDING').exists():
            # Resend? For now just say invited.
            inv = TeamInvitation.objects.get(team=team, email=email, status='PENDING')
            # Mock Email
            link = f"http://localhost:3000/teams/content/accept-invite?token={inv.token}" 
            print(f"----- MOCK EMAIL TO {email} -----\nJoin {team.name}: {link}\n-----------------------------------")
            return Response({'status': 'invited', 'message': 'Invitation resent', 'mock_link': link})

        # Create Invitation
        inv = TeamInvitation.objects.create(
            team=team, 
            email=email, 
            role=role, 
            invited_by=request.user,
            status='PENDING'
        )

        # Real Email Sending (Zepto Mail)
        from django.core.mail import send_mail
        from django.conf import settings
        
        frontend_host = os.getenv('FRONTEND_HOST', 'https://18pluspdf.com')
        # Ensure no double slash if host ends with /
        if frontend_host.endswith('/'):
            frontend_host = frontend_host[:-1]
            
        link = f"{frontend_host}/teams/content/accept-invite?token={inv.token}"
        
        try:
            send_mail(
                subject=f"Invitation to join {team.name} on 18+ PDF",
                message=f"You have been invited to join the team '{team.name}'.\n\nClick here to accept: {link}\n\nIf you did not expect this, please ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False 
            )
        except Exception as e:
            # Fallback for debugging if needed, or just log
            print(f"Failed to send invite email: {e}")
        
        return Response({'status': 'invited', 'message': f'Invitation sent to {email}'})

    @action(detail=False, methods=['post'], url_path='accept-invite')
    def accept_invite(self, request):
        """Accept an invitation via token."""
        token = request.data.get('token')
        if not token:
             return Response({'error': 'Token required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.teams.models import TeamInvitation, TeamMembership
        from apps.accounts.models import User
        
        try:
            inv = TeamInvitation.objects.get(token=token, status='PENDING')
        except TeamInvitation.DoesNotExist:
            return Response({'error': 'Invalid or expired invitation'}, status=status.HTTP_404_NOT_FOUND)
            
        # Check if user matches email? 
        # Ideally we require the user to be logged in with that email.
        # But for simplicity, we just add the currently logged in user?
        # OR we enforce email match.
        
        if request.user.email != inv.email:
             # We could allow mismatched email acceptance if that's desired behavior (e.g. invite personal, accept on work)
             # But for security usually we warn or block.
             # User prompt says "open *their* a account".
             # Let's Allow it but log warning. Or Block.
             # Blocking:
             return Response({'error': f'This invitation is for {inv.email}, but you are logged in as {request.user.email}. Please login with the correct account.'}, status=status.HTTP_400_BAD_REQUEST)

        # CHECK EXPIRY (1 Day)
        from django.utils import timezone
        import datetime
        if timezone.now() > inv.created_at + datetime.timedelta(days=1):
            inv.status = 'EXPIRED'
            inv.save()
            return Response({'error': 'Invitation has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Add Membership
        TeamMembership.objects.get_or_create(team=inv.team, user=request.user, defaults={'role': inv.role})
        
        inv.status = 'ACCEPTED'
        inv.save()
        
        return Response({'status': 'joined', 'team_id': inv.team.id})
    @action(detail=True, methods=['post'], url_path='revoke_invite')
    def revoke_invite(self, request, pk=None):
        """Revoke a pending invitation."""
        team = self.get_object()
        invitation_id = request.data.get('invitation_id')
        
        try:
            from apps.teams.models import TeamInvitation
            inv = TeamInvitation.objects.get(id=invitation_id, team=team, status='PENDING')
            inv.delete() # Or set to EXPIRED/REVOKED
            return Response({'status': 'revoked'})
        except TeamInvitation.DoesNotExist:
             return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)


class TeamMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for team memberships."""
    serializer_class = TeamMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow viewing memberships of teams where user is OWNER or ADMIN
        # OR just personal memberships?
        # Standard logic: View my own memberships
        return TeamMembership.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        # Capture old role
        instance = self.get_object()
        old_role = instance.role
        
        updated_instance = serializer.save()
        
        if old_role != updated_instance.role:
            from core.services.email_service import EmailService
            EmailService.send_role_updated(updated_instance.user, updated_instance.team.name, updated_instance.role)

    def perform_destroy(self, instance):
        user = instance.user
        team_name = instance.team.name
        
        instance.delete()
        
        from core.services.email_service import EmailService
        EmailService.send_removed_from_team(user, team_name)
