from rest_framework import viewsets, status, permissions, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import SystemSetting, AdminActionRequest, PlatformBranding
from .serializers import SystemSettingSerializer, AdminActionRequestSerializer, PlatformBrandingSerializer
from apps.accounts.models import User

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser)

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.role == 'SUPER_ADMIN')

class PublicSettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        data = serializer.data
        data['config'] = {
            'stripe_public_key': getattr(settings, 'STRIPE_PUBLIC_KEY', ''),
            'razorpay_key_id': getattr(settings, 'RAZORPAY_KEY_ID', ''),
        }
        return Response(data)

class AdminBrandingView(APIView):
    permission_classes = [IsSuperAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get(self, request):
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        branding = PlatformBranding.load()
        
        # Create Version Snapshot before saving
        from .models import ContentVersion
        import json
        
        # Create snapshot data, handling logo field properly
        snapshot_data = {
            'platform_name': branding.platform_name,
            'hero_title': branding.hero_title,
            'hero_subtitle': branding.hero_subtitle,
            'primary_color': branding.primary_color,
            'logo': branding.logo.url if branding.logo else None,
            'is_active': branding.is_active,
            'updated_at': branding.updated_at.isoformat() if branding.updated_at else None
        }
        
        ContentVersion.objects.create(
            snapshot=snapshot_data,
            created_by=request.user,
            note="Auto-save before update"
        )
        
        # Update fields manually
        if 'platform_name' in request.data:
            branding.platform_name = request.data['platform_name']
        if 'hero_title' in request.data:
            branding.hero_title = request.data['hero_title']
        if 'hero_subtitle' in request.data:
            branding.hero_subtitle = request.data['hero_subtitle']
        if 'primary_color' in request.data:
            branding.primary_color = request.data['primary_color']
        if 'logo' in request.FILES:
            branding.logo = request.FILES['logo']
        
        branding.save()
        
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsSuperAdmin] # Strict: only Super Admin can change settings
    lookup_field = 'key'

class AdminActionRequestViewSet(viewsets.ModelViewSet):
    queryset = AdminActionRequest.objects.all().order_by('-created_at')
    serializer_class = AdminActionRequestSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
             return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'APPROVED'
        req.reviewer = request.user
        req.save()
        
        # Execute the logic based on action_type
        success = self._execute_action(req)
        if not success:
            return Response({'error': 'Action execution failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def reject(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
             return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'REJECTED'
        req.reviewer = request.user
        req.review_note = request.data.get('note', '')
        req.save()
        
        return Response({'status': 'rejected'})

    def _execute_action(self, req):
        """
        Routing logic for executing approved actions.
        """
        payload = req.payload
        try:
            if req.action_type == 'CHANGE_ROLE':
                user_id = payload.get('user_id')
                new_role = payload.get('new_role')
                user = User.objects.get(id=user_id)
                user.role = new_role
                user.save()
                return True
            
            elif req.action_type == 'CHANGE_USER_PLAN':
                from apps.subscriptions.models.subscription import Plan, Subscription
                user_id = payload.get('user_id')
                plan_slug = payload.get('plan_slug')
                user = User.objects.get(id=user_id)
                plan = Plan.objects.get(slug=plan_slug)
                
                sub, created = Subscription.objects.get_or_create(user=user)
                sub.plan = plan
                sub.status = 'ACTIVE'
                sub.save()
                return True

        except Exception as e:
            print(f"Error executing action {req.action_type}: {e}")
            return False
        
        return True

class ContentVersionViewSet(viewsets.ReadOnlyModelViewSet):
    from .models import ContentVersion
    from .serializers import ContentVersionSerializer
    
    queryset = ContentVersion.objects.all().order_by('-created_at')
    serializer_class = ContentVersionSerializer
    permission_classes = [IsSuperAdmin]

    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        version = self.get_object()
        snapshot = version.snapshot
        
        # Apply snapshot to singleton
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, data=snapshot)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'reverted', 'data': serializer.data})
        return Response({'error': 'Invalid snapshot data'}, status=status.HTTP_400_BAD_REQUEST)

from celery.result import AsyncResult

class TaskStatusView(APIView):
    """
    Checks the status of an async Celery task.
    """
    permission_classes = [permissions.AllowAny] # Or Authenticated depending on needs (Guests need this too)

    def get(self, request, task_id):
        res = AsyncResult(task_id)
        
        status_data = {
            'task_id': task_id,
            'status': res.status,
        }
        
        if res.status == 'SUCCESS':
            status_data['result'] = res.result
        elif res.status == 'FAILURE':
             status_data['error'] = str(res.result)
        
        # If State is standard (PENDING, STARTED, RETRY), just return status
        return Response(status_data)

class UserTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List user's own tasks history.
    """
    from .models import TaskLog
    from .serializers import TaskLogSerializer
    
    serializer_class = TaskLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from .models import TaskLog
        return TaskLog.objects.filter(user=self.request.user).order_by('-created_at')

