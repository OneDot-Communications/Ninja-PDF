"""Tax Configuration API Views"""
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal

from apps.subscriptions.models.tax import TaxRule, TaxExemption, BillingConfiguration
from core.views import IsSuperAdmin, IsAdminOrSuperAdmin


# Serializers
class TaxRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRule
        fields = [
            'id', 'name', 'country_code', 'region', 'tax_type', 'rate',
            'is_inclusive', 'is_active', 'applies_to_digital', 'applies_to_business',
            'registration_threshold', 'threshold_currency', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TaxExemptionSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    verified_by_email = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxExemption
        fields = [
            'id', 'user', 'user_email', 'country_code', 'tax_id', 'tax_id_type',
            'company_name', 'is_verified', 'verified_at', 'verified_by', 'verified_by_email',
            'is_active', 'expires_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'verified_at', 'verified_by']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
    
    def get_verified_by_email(self, obj):
        return obj.verified_by.email if obj.verified_by else None


class BillingConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingConfiguration
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


# ViewSets
class TaxRuleViewSet(viewsets.ModelViewSet):
    """
    CRUD for Tax Rules - Super Admin only
    """
    queryset = TaxRule.objects.all()
    serializer_class = TaxRuleSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = TaxRule.objects.all()
        
        # Filter by country
        country = self.request.query_params.get('country')
        if country:
            qs = qs.filter(country_code=country.upper())
        
        # Filter by active status
        active = self.request.query_params.get('active')
        if active is not None:
            qs = qs.filter(is_active=active.lower() == 'true')
        
        return qs.order_by('country_code', 'region')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_country(self, request):
        """Get tax rules grouped by country"""
        rules = TaxRule.objects.filter(is_active=True).order_by('country_code', 'region')
        
        grouped = {}
        for rule in rules:
            if rule.country_code not in grouped:
                grouped[rule.country_code] = []
            grouped[rule.country_code].append(TaxRuleSerializer(rule).data)
        
        return Response(grouped)
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate tax for an amount based on location"""
        amount = Decimal(str(request.data.get('amount', 0)))
        country_code = request.data.get('country_code', '')
        region = request.data.get('region', '')
        is_business = request.data.get('is_business', False)
        
        if not country_code:
            return Response({'error': 'country_code is required'}, status=400)
        
        tax_rule = TaxRule.get_applicable_tax(country_code, region, is_business)
        
        if not tax_rule:
            return Response({
                'amount': str(amount),
                'tax_amount': '0.00',
                'total': str(amount),
                'tax_rate': '0.00',
                'tax_applied': False,
            })
        
        tax_amount = (amount * tax_rule.rate / 100).quantize(Decimal('0.01'))
        
        if tax_rule.is_inclusive:
            # Tax is included in the amount
            base_amount = (amount / (1 + tax_rule.rate / 100)).quantize(Decimal('0.01'))
            tax_amount = (amount - base_amount).quantize(Decimal('0.01'))
            total = amount
        else:
            # Tax is added on top
            total = amount + tax_amount
        
        return Response({
            'amount': str(amount),
            'tax_amount': str(tax_amount),
            'total': str(total),
            'tax_rate': str(tax_rule.rate),
            'tax_name': tax_rule.name,
            'tax_type': tax_rule.tax_type,
            'is_inclusive': tax_rule.is_inclusive,
            'tax_applied': True,
        })


class TaxExemptionViewSet(viewsets.ModelViewSet):
    """
    Manage Tax Exemptions - Admin and Super Admin
    """
    queryset = TaxExemption.objects.all()
    serializer_class = TaxExemptionSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    
    def get_queryset(self):
        qs = TaxExemption.objects.all().select_related('user', 'verified_by')
        
        # Filter by verification status
        verified = self.request.query_params.get('verified')
        if verified is not None:
            qs = qs.filter(is_verified=verified.lower() == 'true')
        
        # Filter pending verifications
        pending = self.request.query_params.get('pending')
        if pending and pending.lower() == 'true':
            qs = qs.filter(is_verified=False, is_active=True)
        
        return qs.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a tax exemption"""
        exemption = self.get_object()
        
        exemption.is_verified = True
        exemption.verified_at = timezone.now()
        exemption.verified_by = request.user
        exemption.save()
        
        # Create audit log
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='TaxExemption',
            resource_id=str(exemption.id),
            description=f'Verified tax exemption for {exemption.user.email} ({exemption.tax_id})',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': 'Tax exemption verified',
            'exemption': TaxExemptionSerializer(exemption).data,
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject/revoke a tax exemption"""
        exemption = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        exemption.is_active = False
        exemption.is_verified = False
        exemption.save()
        
        # Create audit log
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='TaxExemption',
            resource_id=str(exemption.id),
            description=f'Rejected tax exemption for {exemption.user.email}: {reason}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': 'Tax exemption rejected',
        })


class BillingConfigurationViewSet(viewsets.ModelViewSet):
    """
    Manage Billing Configuration - Super Admin only
    """
    queryset = BillingConfiguration.objects.all()
    serializer_class = BillingConfigurationSerializer
    permission_classes = [IsSuperAdmin]
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the active billing configuration"""
        config = BillingConfiguration.get_active()
        if config:
            return Response(BillingConfigurationSerializer(config).data)
        return Response({'error': 'No active configuration'}, status=404)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Set this configuration as active"""
        config = self.get_object()
        config.is_active = True
        config.save()  # This deactivates other configs
        
        return Response({
            'success': True,
            'message': f'{config.name} is now active',
        })


class UserTaxExemptionView(APIView):
    """
    User-facing view to submit tax exemption request
    """
    def get(self, request):
        """Get user's tax exemptions"""
        exemptions = TaxExemption.objects.filter(user=request.user)
        return Response(TaxExemptionSerializer(exemptions, many=True).data)
    
    def post(self, request):
        """Submit a new tax exemption request"""
        data = request.data.copy()
        data['user'] = request.user.id
        
        serializer = TaxExemptionSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Tax exemption submitted for review',
                'exemption': serializer.data,
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
