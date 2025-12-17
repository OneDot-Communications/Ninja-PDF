"""Legal Document API Views"""
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import serializers
from django.utils import timezone

from apps.core.models import LegalDocument, LegalDocumentVersion, UserLegalConsent
from core.views import IsSuperAdmin


# Serializers
class LegalDocumentSerializer(serializers.ModelSerializer):
    created_by_email = serializers.SerializerMethodField()
    updated_by_email = serializers.SerializerMethodField()
    
    class Meta:
        model = LegalDocument
        fields = [
            'id', 'doc_type', 'title', 'slug', 'content', 'summary',
            'version', 'effective_date', 'is_published', 'requires_consent',
            'meta_title', 'meta_description', 'created_by', 'updated_by',
            'created_by_email', 'updated_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None
    
    def get_updated_by_email(self, obj):
        return obj.updated_by.email if obj.updated_by else None


class LegalDocumentPublicSerializer(serializers.ModelSerializer):
    """Serializer for public viewing - excludes admin fields"""
    class Meta:
        model = LegalDocument
        fields = [
            'doc_type', 'title', 'slug', 'content', 'summary',
            'version', 'effective_date', 'updated_at'
        ]


class LegalDocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalDocumentVersion
        fields = ['id', 'version', 'content', 'effective_date', 'created_by', 'created_at']


class UserLegalConsentSerializer(serializers.ModelSerializer):
    document_title = serializers.SerializerMethodField()
    
    class Meta:
        model = UserLegalConsent
        fields = [
            'id', 'document', 'document_title', 'version',
            'consented_at', 'is_withdrawn', 'withdrawn_at'
        ]
        read_only_fields = ['consented_at', 'withdrawn_at']
    
    def get_document_title(self, obj):
        return obj.document.title


# Admin ViewSet
class LegalDocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD for Legal Documents - Super Admin only
    """
    queryset = LegalDocument.objects.all()
    serializer_class = LegalDocumentSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = LegalDocument.objects.all()
        
        # Filter by type
        doc_type = self.request.query_params.get('type')
        if doc_type:
            qs = qs.filter(doc_type=doc_type.upper())
        
        # Filter by published status
        published = self.request.query_params.get('published')
        if published is not None:
            qs = qs.filter(is_published=published.lower() == 'true')
        
        return qs.select_related('created_by', 'updated_by')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        
        # Create version history before update
        LegalDocumentVersion.objects.create(
            document=instance,
            version=instance.version,
            content=instance.content,
            effective_date=instance.effective_date,
            created_by=self.request.user,
        )
        
        serializer.save(updated_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get version history for a document"""
        document = self.get_object()
        versions = document.versions.all()
        serializer = LegalDocumentVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a legal document"""
        document = self.get_object()
        document.is_published = True
        document.save()
        
        # Audit log
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='LegalDocument',
            resource_id=str(document.id),
            description=f'Published {document.title} v{document.version}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'{document.title} has been published'
        })
    
    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish a legal document"""
        document = self.get_object()
        document.is_published = False
        document.save()
        
        return Response({
            'success': True,
            'message': f'{document.title} has been unpublished'
        })


# Public Views
class PublicLegalDocumentListView(APIView):
    """List all published legal documents - Public"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        documents = LegalDocument.get_published()
        serializer = LegalDocumentPublicSerializer(documents, many=True)
        return Response(serializer.data)


class PublicLegalDocumentDetailView(APIView):
    """Get a specific legal document - Public"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, doc_type):
        document = LegalDocument.get_by_type(doc_type.upper())
        if not document:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = LegalDocumentPublicSerializer(document)
        return Response(serializer.data)


# User Consent Views
class UserConsentView(APIView):
    """Manage user consent to legal documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get all consents for current user"""
        consents = UserLegalConsent.objects.filter(user=request.user)
        serializer = UserLegalConsentSerializer(consents, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Record user consent to a document"""
        doc_type = request.data.get('doc_type')
        
        if not doc_type:
            return Response(
                {'error': 'doc_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document = LegalDocument.get_by_type(doc_type.upper())
        if not document:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create or update consent
        consent, created = UserLegalConsent.objects.update_or_create(
            user=request.user,
            document=document,
            version=document.version,
            defaults={
                'ip_address': request.META.get('REMOTE_ADDR', ''),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'is_withdrawn': False,
                'withdrawn_at': None,
            }
        )
        
        return Response({
            'success': True,
            'message': f'Consent recorded for {document.title}',
            'consent': UserLegalConsentSerializer(consent).data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    def delete(self, request):
        """Withdraw consent from a document"""
        doc_type = request.data.get('doc_type')
        
        if not doc_type:
            return Response(
                {'error': 'doc_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document = LegalDocument.get_by_type(doc_type.upper())
        if not document:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            consent = UserLegalConsent.objects.get(
                user=request.user,
                document=document,
                is_withdrawn=False
            )
            consent.is_withdrawn = True
            consent.withdrawn_at = timezone.now()
            consent.save()
            
            return Response({
                'success': True,
                'message': 'Consent withdrawn'
            })
        except UserLegalConsent.DoesNotExist:
            return Response(
                {'error': 'No active consent found'},
                status=status.HTTP_404_NOT_FOUND
            )


class CheckConsentView(APIView):
    """Check if user needs to consent to required documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get list of documents requiring consent that user hasn't agreed to"""
        required_docs = LegalDocument.objects.filter(
            is_published=True,
            requires_consent=True
        )
        
        pending_consents = []
        
        for doc in required_docs:
            # Check if user has consented to current version
            consent = UserLegalConsent.objects.filter(
                user=request.user,
                document=doc,
                version=doc.version,
                is_withdrawn=False
            ).first()
            
            if not consent:
                pending_consents.append({
                    'doc_type': doc.doc_type,
                    'title': doc.title,
                    'version': doc.version,
                    'summary': doc.summary,
                })
        
        return Response({
            'needs_consent': len(pending_consents) > 0,
            'pending_documents': pending_consents
        })
