from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import SystemSetting, AdminActionRequest, PlatformBranding
from .serializers import SystemSettingSerializer, AdminActionRequestSerializer, PlatformBrandingSerializer
from authentication.models import User

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser)

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.role == 'SUPER_ADMIN')

class PublicSettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)

class AdminBrandingView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        branding = PlatformBranding.load()
        
        # Create Version Snapshot before saving
        from .models import ContentVersion
        from .serializers import PlatformBrandingSerializer as PBS
        snapshot_data = PBS(branding).data
        ContentVersion.objects.create(
            snapshot=snapshot_data,
            created_by=request.user,
            note="Auto-save before update"
        )

        serializer = PlatformBrandingSerializer(branding, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
                from billing.models import Plan, Subscription
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
