"""Security API Views - IP Rules, Rate Limiting, Password Policies, Audit Logs"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone
import json
import csv
import io

from apps.accounts.models import (
    IPRule, RateLimitRule, PasswordPolicy, PasswordHistory,
    FailedLoginAttempt, AuditLog, SystemConfiguration
)
from apps.accounts.api.security_serializers import (
    IPRuleSerializer, RateLimitRuleSerializer, PasswordPolicySerializer,
    FailedLoginAttemptSerializer, AuditLogSerializer, SystemConfigurationSerializer,
    PasswordValidationSerializer, AuditLogExportSerializer
)
from core.views import IsSuperAdmin, IsAdminOrSuperAdmin


class IPRuleViewSet(viewsets.ModelViewSet):
    """
    CRUD for IP Whitelisting/Blacklisting.
    Tasks 93-94: Configure IP whitelisting/blacklisting
    """
    queryset = IPRule.objects.all()
    serializer_class = IPRuleSerializer
    permission_classes = [IsSuperAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        qs = super().get_queryset()
        rule_type = self.request.query_params.get('type')
        if rule_type:
            qs = qs.filter(rule_type=rule_type.upper())
        scope = self.request.query_params.get('scope')
        if scope:
            qs = qs.filter(scope=scope.upper())
        active_only = self.request.query_params.get('active_only', 'false').lower() == 'true'
        if active_only:
            qs = qs.filter(is_active=True)
        return qs
    
    @action(detail=False, methods=['post'])
    def check_ip(self, request):
        """Check if an IP is blocked or allowed"""
        ip = request.data.get('ip')
        if not ip:
            return Response({'error': 'IP address required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check blacklist first
        blacklisted = IPRule.objects.filter(
            ip_address=ip, rule_type='BLACKLIST', is_active=True
        ).first()
        if blacklisted and blacklisted.is_valid():
            return Response({'allowed': False, 'reason': 'IP is blacklisted', 'rule_id': blacklisted.id})
        
        # Check whitelist
        whitelisted = IPRule.objects.filter(
            ip_address=ip, rule_type='WHITELIST', is_active=True
        ).first()
        if whitelisted and whitelisted.is_valid():
            return Response({'allowed': True, 'reason': 'IP is whitelisted', 'rule_id': whitelisted.id})
        
        return Response({'allowed': True, 'reason': 'No matching rules'})
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle active status"""
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save()
        return Response({'is_active': rule.is_active})
    
    @action(detail=False, methods=['delete'])
    def clear_expired(self, request):
        """Remove all expired rules"""
        now = timezone.now()
        deleted, _ = IPRule.objects.filter(expires_at__lt=now).delete()
        return Response({'deleted': deleted})


class RateLimitRuleViewSet(viewsets.ModelViewSet):
    """
    CRUD for Rate Limiting Rules.
    Task 87: Set API rate limits
    """
    queryset = RateLimitRule.objects.all()
    serializer_class = RateLimitRuleSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        scope = self.request.query_params.get('scope')
        if scope:
            qs = qs.filter(scope=scope.upper())
        return qs
    
    @action(detail=False, methods=['get'])
    def for_user(self, request):
        """Get applicable rate limits for a user"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get applicable rules (most specific first)
        rules = []
        
        # User-specific rules
        user_rules = RateLimitRule.objects.filter(target_user=user, is_active=True)
        rules.extend(user_rules)
        
        # Plan-based rules
        if hasattr(user, 'subscription') and user.subscription.plan:
            plan_rules = RateLimitRule.objects.filter(target_plan=user.subscription.plan, is_active=True)
            rules.extend(plan_rules)
        
        # Role-based rules
        role_rules = RateLimitRule.objects.filter(target_role=user.role, is_active=True)
        rules.extend(role_rules)
        
        # Global rules
        global_rules = RateLimitRule.objects.filter(scope='GLOBAL', is_active=True)
        rules.extend(global_rules)
        
        serializer = RateLimitRuleSerializer(rules, many=True)
        return Response(serializer.data)


class PasswordPolicyViewSet(viewsets.ModelViewSet):
    """
    CRUD for Password Policies.
    Task 20: Enforce password policies globally
    """
    queryset = PasswordPolicy.objects.all()
    serializer_class = PasswordPolicySerializer
    permission_classes = [IsSuperAdmin]
    
    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """Set this policy as the active one (deactivate others)"""
        policy = self.get_object()
        PasswordPolicy.objects.update(is_active=False)
        policy.is_active = True
        policy.save()
        return Response({'status': 'activated'})
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active policy"""
        policy = PasswordPolicy.get_active_policy()
        if policy:
            return Response(PasswordPolicySerializer(policy).data)
        return Response({'error': 'No active policy'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def validate_password(self, request):
        """Validate a password against the active policy"""
        serializer = PasswordValidationSerializer(data=request.data)
        if serializer.is_valid():
            return Response({'valid': True, 'errors': []})
        return Response({
            'valid': False,
            'errors': serializer.errors.get('password', [])
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def requirements(self, request):
        """Get password requirements for display in UI"""
        policy = PasswordPolicy.get_active_policy()
        if not policy:
            return Response({'requirements': []})
        
        requirements = []
        if policy.min_length > 0:
            requirements.append(f"At least {policy.min_length} characters")
        if policy.require_uppercase:
            requirements.append("At least one uppercase letter")
        if policy.require_lowercase:
            requirements.append("At least one lowercase letter")
        if policy.require_digit:
            requirements.append("At least one number")
        if policy.require_special:
            requirements.append(f"At least one special character ({policy.special_characters[:10]}...)")
        
        return Response({'requirements': requirements})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only access to Audit Logs with export capability.
    Tasks 91-92: View system audit logs, Export audit logs
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filters
        action_type = self.request.query_params.get('action_type')
        if action_type:
            qs = qs.filter(action_type=action_type.upper())
        
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            qs = qs.filter(resource_type__icontains=resource_type)
        
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        
        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        
        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
        
        return qs.select_related('user')
    
    @action(detail=False, methods=['post'])
    def export(self, request):
        """Export audit logs to CSV or JSON"""
        serializer = AuditLogExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        qs = self.get_queryset()
        
        # Apply export filters
        if serializer.validated_data.get('start_date'):
            qs = qs.filter(created_at__gte=serializer.validated_data['start_date'])
        if serializer.validated_data.get('end_date'):
            qs = qs.filter(created_at__lte=serializer.validated_data['end_date'])
        if serializer.validated_data.get('action_types'):
            qs = qs.filter(action_type__in=serializer.validated_data['action_types'])
        if serializer.validated_data.get('user_ids'):
            qs = qs.filter(user_id__in=serializer.validated_data['user_ids'])
        
        export_format = serializer.validated_data.get('format', 'json')
        
        if export_format == 'csv':
            return self._export_csv(qs)
        else:
            return self._export_json(qs)
    
    def _export_json(self, queryset):
        data = AuditLogSerializer(queryset[:10000], many=True).data
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d")}.json"'
        return response
    
    def _export_csv(self, queryset):
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'ID', 'Timestamp', 'User', 'Action', 'Resource Type',
            'Resource ID', 'Description', 'IP Address'
        ])
        
        # Data
        for log in queryset[:10000]:
            writer.writerow([
                log.id,
                log.created_at.isoformat(),
                log.user.email if log.user else 'System',
                log.action_type,
                log.resource_type,
                log.resource_id,
                log.description,
                log.ip_address
            ])
        
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d")}.csv"'
        return response
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get audit log statistics"""
        from django.db.models import Count
        from django.db.models.functions import TruncDate
        
        qs = self.get_queryset()
        
        # By action type
        by_action = qs.values('action_type').annotate(count=Count('id')).order_by('-count')
        
        # By resource type
        by_resource = qs.values('resource_type').annotate(count=Count('id')).order_by('-count')[:10]
        
        # By day (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        by_day = qs.filter(created_at__gte=thirty_days_ago).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        
        return Response({
            'by_action_type': list(by_action),
            'by_resource_type': list(by_resource),
            'by_day': list(by_day),
            'total': qs.count()
        })


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    """
    CRUD for System Configuration.
    Various Tasks: System settings management
    """
    queryset = SystemConfiguration.objects.all()
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())
        return qs
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request):
        """Get public configuration values"""
        configs = SystemConfiguration.objects.filter(is_public=True)
        result = {}
        for config in configs:
            result[config.key] = self._parse_value(config)
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get configurations grouped by category"""
        configs = self.get_queryset()
        result = {}
        for config in configs:
            category = config.category
            if category not in result:
                result[category] = []
            result[category].append(SystemConfigurationSerializer(config).data)
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Update multiple configurations at once"""
        updates = request.data.get('updates', {})
        updated = []
        for key, value in updates.items():
            try:
                config = SystemConfiguration.objects.get(key=key)
                if config.is_editable:
                    config.value = str(value)
                    config.updated_by = request.user
                    config.save()
                    updated.append(key)
            except SystemConfiguration.DoesNotExist:
                pass
        return Response({'updated': updated})
    
    def _parse_value(self, config):
        if config.value_type == 'INTEGER':
            return int(config.value)
        elif config.value_type == 'BOOLEAN':
            return config.value.lower() == 'true'
        elif config.value_type == 'JSON':
            return json.loads(config.value)
        elif config.value_type == 'FLOAT':
            return float(config.value)
        return config.value


class FailedLoginAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """View failed login attempts for security monitoring"""
    queryset = FailedLoginAttempt.objects.all()
    serializer_class = FailedLoginAttemptSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        email = self.request.query_params.get('email')
        if email:
            qs = qs.filter(email=email)
        ip = self.request.query_params.get('ip')
        if ip:
            qs = qs.filter(ip_address=ip)
        return qs[:500]  # Limit results
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get failed login statistics"""
        from django.db.models import Count
        
        qs = self.get_queryset()
        
        # Top IPs with failures
        top_ips = qs.values('ip_address').annotate(count=Count('id')).order_by('-count')[:10]
        
        # Top emails with failures
        top_emails = qs.values('email').annotate(count=Count('id')).order_by('-count')[:10]
        
        return Response({
            'top_ips': list(top_ips),
            'top_emails': list(top_emails),
            'total_last_hour': FailedLoginAttempt.get_recent_attempts(minutes=60),
            'total_last_day': FailedLoginAttempt.get_recent_attempts(minutes=1440)
        })
