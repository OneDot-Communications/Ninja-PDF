"""SSO/SAML API Views and Serializers"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from django.utils import timezone
from django.shortcuts import redirect
from django.http import HttpResponse
import logging

from apps.accounts.models.sso import SSOProvider, SSOSession, SSOLoginAttempt
from core.views import IsSuperAdmin

logger = logging.getLogger(__name__)


class SSOProviderSerializer(serializers.ModelSerializer):
    """Public SSO provider info"""
    class Meta:
        model = SSOProvider
        fields = ['id', 'name', 'slug', 'provider_type', 'status']


class SSOProviderAdminSerializer(serializers.ModelSerializer):
    """Full SSO provider for admin"""
    class Meta:
        model = SSOProvider
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class SSOSessionSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    
    class Meta:
        model = SSOSession
        fields = ['id', 'provider', 'provider_name', 'created_at', 'expires_at']


class SSOLoginAttemptSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    
    class Meta:
        model = SSOLoginAttempt
        fields = ['id', 'provider_name', 'status', 'error_message', 'ip_address', 'created_at', 'completed_at']


class SSOProviderViewSet(viewsets.ModelViewSet):
    """
    SSO Provider management.
    Task 200: Enable SSO
    """
    queryset = SSOProvider.objects.all()
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'discover']:
            return [permissions.AllowAny()]
        return [IsSuperAdmin()]
    
    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role == 'SUPER_ADMIN':
            return SSOProviderAdminSerializer
        return SSOProviderSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_authenticated or self.request.user.role != 'SUPER_ADMIN':
            qs = qs.filter(status='ACTIVE')
        return qs
    
    @action(detail=False, methods=['get'])
    def discover(self, request):
        """Discover SSO provider for email domain"""
        email = request.query_params.get('email', '')
        if '@' not in email:
            return Response({'error': 'Invalid email'}, status=status.HTTP_400_BAD_REQUEST)
        
        provider = SSOProvider.get_for_email_domain(email)
        if provider:
            return Response({
                'sso_enabled': True,
                'provider': SSOProviderSerializer(provider).data,
                'login_url': f"/api/auth/sso/{provider.slug}/login/"
            })
        return Response({'sso_enabled': False})
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test SSO provider connection"""
        provider = self.get_object()
        
        if provider.provider_type == 'LDAP':
            # Test LDAP connection
            try:
                import ldap3
                server = ldap3.Server(
                    provider.ldap_server, 
                    port=provider.ldap_port,
                    use_ssl=provider.ldap_use_ssl
                )
                conn = ldap3.Connection(
                    server,
                    provider.ldap_bind_dn,
                    provider.ldap_bind_password,
                    auto_bind=True
                )
                conn.unbind()
                return Response({'status': 'success', 'message': 'LDAP connection successful'})
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        elif provider.provider_type in ['SAML', 'AZURE_AD', 'OKTA', 'GOOGLE_WORKSPACE', 'ONELOGIN']:
            # Validate SAML config
            if not provider.entity_id or not provider.sso_url:
                return Response({'status': 'error', 'message': 'Missing Entity ID or SSO URL'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'status': 'success', 'message': 'SAML configuration valid'})
        
        elif provider.provider_type == 'OIDC':
            # Validate OIDC config
            if not provider.client_id or not provider.authorization_endpoint:
                return Response({'status': 'error', 'message': 'Missing OIDC configuration'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'status': 'success', 'message': 'OIDC configuration valid'})
        
        return Response({'status': 'error', 'message': 'Unknown provider type'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle SSO provider status"""
        provider = self.get_object()
        if provider.status == 'ACTIVE':
            provider.status = 'INACTIVE'
        else:
            provider.status = 'ACTIVE'
        provider.save()
        return Response({'status': provider.status})
    
    @action(detail=True, methods=['get'])
    def metadata(self, request, pk=None):
        """Get SP metadata for SAML providers"""
        provider = self.get_object()
        
        if provider.provider_type not in ['SAML', 'AZURE_AD', 'OKTA']:
            return Response({'error': 'Not a SAML provider'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate SAML SP metadata
        from django.conf import settings
        base_url = getattr(settings, 'SITE_URL', request.build_absolute_uri('/'))
        
        metadata = f"""<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="{provider.sp_entity_id or f'{base_url}saml/{provider.slug}/metadata/'}">
    <md:SPSSODescriptor
        AuthnRequestsSigned="false"
        WantAssertionsSigned="true"
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
        <md:AssertionConsumerService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="{provider.sp_acs_url or f'{base_url}api/auth/sso/{provider.slug}/acs/'}"
            index="1"/>
    </md:SPSSODescriptor>
</md:EntityDescriptor>"""
        
        return HttpResponse(metadata, content_type='application/xml')


class SSOSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """View user's SSO sessions"""
    serializer_class = SSOSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SSOSession.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def logout(self, request, pk=None):
        """Logout from SSO session (SLO)"""
        session = self.get_object()
        provider = session.provider
        
        # Delete session
        session.delete()
        
        # Return SLO URL if available
        if provider.slo_url:
            return Response({
                'status': 'logged_out',
                'slo_url': provider.slo_url
            })
        
        return Response({'status': 'logged_out'})


class SSOLoginAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin view of SSO login attempts for debugging"""
    serializer_class = SSOLoginAttemptSerializer
    permission_classes = [IsSuperAdmin]
    queryset = SSOLoginAttempt.objects.all().order_by('-created_at')[:100]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get SSO login stats"""
        from django.db.models import Count
        
        qs = SSOLoginAttempt.objects.all()
        
        by_status = qs.values('status').annotate(count=Count('id'))
        by_provider = qs.values('provider__name').annotate(count=Count('id'))
        
        recent_failures = qs.filter(status='FAILED').order_by('-created_at')[:10]
        
        return Response({
            'by_status': list(by_status),
            'by_provider': list(by_provider),
            'recent_failures': SSOLoginAttemptSerializer(recent_failures, many=True).data
        })
