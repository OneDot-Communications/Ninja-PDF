"""Signatures API Views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.signatures.models import SignatureRequest, SignatureTemplate, SignatureContact
from apps.signatures.api.serializers import (
    SignatureRequestSerializer,
    SignatureTemplateSerializer,
    SignatureContactSerializer
)


class SignatureRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for signature requests."""
    serializer_class = SignatureRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        mode = self.request.query_params.get('mode', '')
        
        if mode == 'inbox':
            # Requests where user is recipient
            return SignatureRequest.objects.filter(recipient_email=user.email).exclude(status='TRASHED')
        elif mode == 'signed':
            return SignatureRequest.objects.filter(sender=user, status='SIGNED')
        elif mode == 'trash':
            return SignatureRequest.objects.filter(sender=user, status='TRASHED')
        else:
            # Default: sent by user
            return SignatureRequest.objects.filter(sender=user).exclude(status='TRASHED')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get signature request statistics."""
        user = request.user
        sent = SignatureRequest.objects.filter(sender=user)
        return Response({
            'total_sent': sent.count(),
            'pending': sent.filter(status='PENDING').count(),
            'signed': sent.filter(status='SIGNED').count(),
            'declined': sent.filter(status='DECLINED').count(),
            'expired': sent.filter(status='EXPIRED').count(),
        })

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a trashed signature request."""
        obj = self.get_object()
        if obj.status == 'TRASHED':
            obj.status = 'PENDING'
            obj.save()
        return Response({'status': 'restored'})


class SignatureTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for signature templates."""
    serializer_class = SignatureTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SignatureTemplate.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SignatureContactViewSet(viewsets.ModelViewSet):
    """ViewSet for signature contacts."""
    serializer_class = SignatureContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SignatureContact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
