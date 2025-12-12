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
            return queryset.filter(requester=user)
        elif mode == 'inbox':
            # Requests where user is a signer
            return queryset.filter(signers__email=user.email).exclude(requester=user)
        elif mode == 'signed':
             return queryset.filter(status='COMPLETED', requester=user) | queryset.filter(status='COMPLETED', signers__email=user.email)
        
        # Default: all involving user
        return queryset.filter(Q(requester=user) | Q(signers__email=user.email)).distinct()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        sent = SignatureRequest.objects.filter(requester=user).count()
        inbox = SignatureRequest.objects.filter(signers__email=user.email).exclude(requester=user).count()
        completed = SignatureRequest.objects.filter(Q(requester=user) | Q(signers__email=user.email), status='COMPLETED').distinct().count()
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
