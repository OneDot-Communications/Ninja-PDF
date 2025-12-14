from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import SignatureRequest, Signer, Template, Contact
from .serializers import SignatureRequestSerializer, TemplateSerializer, ContactSerializer

class SignatureRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SignatureRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = SignatureRequest.objects.all()
        
        # Filter modes
        mode = self.request.query_params.get('mode')
        
        if mode == 'sent':
            return queryset.filter(requester=user).exclude(status='TRASH')
        elif mode == 'inbox':
            # Requests where user is a signer
            return queryset.filter(signers__email=user.email).exclude(requester=user).exclude(status='TRASH')
        elif mode == 'signed':
             return queryset.filter(status='COMPLETED', requester=user) | queryset.filter(status='COMPLETED', signers__email=user.email)
        elif mode == 'trash':
            return queryset.filter(requester=user, status='TRASH')
        
        # Default: all involving user, excluding trash
        return queryset.filter(Q(requester=user) | Q(signers__email=user.email)).exclude(status='TRASH').distinct()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = self.get_object()
        if instance.status == 'TRASH':
            instance.status = 'DRAFT' # Restore to draft
            instance.save()
            return Response({'status': 'restored'})
        return Response({'error': 'Item is not in trash'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        sent = SignatureRequest.objects.filter(requester=user).exclude(status='TRASH').count()
        inbox = SignatureRequest.objects.filter(signers__email=user.email).exclude(requester=user).exclude(status='TRASH').count()
        completed = SignatureRequest.objects.filter(Q(requester=user) | Q(signers__email=user.email), status='COMPLETED').exclude(status='TRASH').distinct().count()
        return Response({
            'sent': sent,
            'inbox': inbox,
            'completed': completed
        })

class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Template.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Contact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
