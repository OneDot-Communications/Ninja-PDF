from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import SystemSetting, AdminActionRequest
from .serializers import SystemSettingSerializer, AdminActionRequestSerializer
from authentication.models import User

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.role == 'SUPER_ADMIN')

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
        self._execute_action(req)
        
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
        if req.action_type == 'CHANGE_ROLE':
            user_id = payload.get('user_id')
            new_role = payload.get('new_role')
            try:
                user = User.objects.get(id=user_id)
                user.role = new_role
                user.save()
            except User.DoesNotExist:
                pass # Log error
        # Add more action handlers here
