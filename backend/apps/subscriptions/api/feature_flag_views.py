"""Feature Flag API Views"""
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import serializers

from apps.subscriptions.models.feature_flags import FeatureFlag, FeatureFlagAudit
from core.views import IsSuperAdmin


class FeatureFlagSerializer(serializers.ModelSerializer):
    created_by_email = serializers.SerializerMethodField()
    
    class Meta:
        model = FeatureFlag
        fields = [
            'id', 'code', 'name', 'description', 'category',
            'rollout_type', 'is_enabled', 'rollout_percentage',
            'allowed_user_ids', 'allowed_plans', 'allowed_roles',
            'starts_at', 'ends_at', 'created_by', 'created_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None


class FeatureFlagAuditSerializer(serializers.ModelSerializer):
    changed_by_email = serializers.SerializerMethodField()
    
    class Meta:
        model = FeatureFlagAudit
        fields = ['id', 'action', 'old_value', 'new_value', 'changed_by', 'changed_by_email', 'changed_at']
    
    def get_changed_by_email(self, obj):
        return obj.changed_by.email if obj.changed_by else None


class FeatureFlagViewSet(viewsets.ModelViewSet):
    """
    CRUD for Feature Flags - Super Admin only
    """
    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        qs = FeatureFlag.objects.all()
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())
        
        # Filter by enabled status
        enabled = self.request.query_params.get('enabled')
        if enabled is not None:
            qs = qs.filter(is_enabled=enabled.lower() == 'true')
        
        return qs.select_related('created_by')
    
    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        
        # Create audit log
        FeatureFlagAudit.objects.create(
            feature_flag=instance,
            action='created',
            new_value={'is_enabled': instance.is_enabled, 'rollout_type': instance.rollout_type},
            changed_by=self.request.user,
        )
    
    def perform_update(self, serializer):
        instance = self.get_object()
        old_values = {
            'is_enabled': instance.is_enabled,
            'rollout_type': instance.rollout_type,
            'rollout_percentage': instance.rollout_percentage,
        }
        
        updated_instance = serializer.save()
        
        new_values = {
            'is_enabled': updated_instance.is_enabled,
            'rollout_type': updated_instance.rollout_type,
            'rollout_percentage': updated_instance.rollout_percentage,
        }
        
        # Create audit log
        FeatureFlagAudit.objects.create(
            feature_flag=updated_instance,
            action='updated',
            old_value=old_values,
            new_value=new_values,
            changed_by=self.request.user,
        )
    
    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        """Enable a feature flag"""
        flag = self.get_object()
        old_enabled = flag.is_enabled
        flag.is_enabled = True
        flag.save()
        
        FeatureFlagAudit.objects.create(
            feature_flag=flag,
            action='enabled',
            old_value={'is_enabled': old_enabled},
            new_value={'is_enabled': True},
            changed_by=request.user,
        )
        
        return Response({
            'success': True,
            'message': f'{flag.name} has been enabled'
        })
    
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable a feature flag"""
        flag = self.get_object()
        old_enabled = flag.is_enabled
        flag.is_enabled = False
        flag.save()
        
        FeatureFlagAudit.objects.create(
            feature_flag=flag,
            action='disabled',
            old_value={'is_enabled': old_enabled},
            new_value={'is_enabled': False},
            changed_by=request.user,
        )
        
        return Response({
            'success': True,
            'message': f'{flag.name} has been disabled'
        })
    
    @action(detail=True, methods=['get'])
    def audit(self, request, pk=None):
        """Get audit log for a feature flag"""
        flag = self.get_object()
        audits = flag.audit_logs.all()[:50]  # Last 50 changes
        serializer = FeatureFlagAuditSerializer(audits, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_users(self, request, pk=None):
        """Add users to a user-list feature flag"""
        flag = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if flag.rollout_type != FeatureFlag.RolloutType.USER_LIST:
            return Response(
                {'error': 'This flag is not a user-list type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        current_users = set(flag.allowed_user_ids)
        current_users.update(user_ids)
        flag.allowed_user_ids = list(current_users)
        flag.save()
        
        return Response({
            'success': True,
            'user_count': len(flag.allowed_user_ids)
        })
    
    @action(detail=True, methods=['post'])
    def remove_users(self, request, pk=None):
        """Remove users from a user-list feature flag"""
        flag = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        current_users = set(flag.allowed_user_ids)
        current_users -= set(user_ids)
        flag.allowed_user_ids = list(current_users)
        flag.save()
        
        return Response({
            'success': True,
            'user_count': len(flag.allowed_user_ids)
        })


class UserFeatureFlagsView(APIView):
    """
    Get all feature flags for the current user.
    Used by frontend to check feature availability.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        flags = FeatureFlag.get_all_for_user(request.user)
        return Response({
            'flags': flags
        })


class CheckFeatureFlagView(APIView):
    """
    Check if a specific feature flag is enabled for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, code):
        is_enabled = FeatureFlag.is_enabled_for(code, request.user)
        return Response({
            'code': code,
            'is_enabled': is_enabled
        })
