"""
Tool Change Request API Views
Handles admin requests for tool tier changes that need Super Admin approval.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.services.permissions import IsSuperAdmin, IsAdmin
from apps.subscriptions.models import ToolChangeRequest, Feature


class ToolChangeRequestSerializer:
    """Simple serializer for ToolChangeRequest."""
    
    @staticmethod
    def serialize(obj):
        return {
            'id': obj.id,
            'feature': {
                'id': obj.feature.id,
                'code': obj.feature.code,
                'name': obj.feature.name,
            },
            'change_type': obj.change_type,
            'change_type_display': obj.get_change_type_display(),
            'reason': obj.reason,
            'new_value': obj.new_value,
            'old_value': obj.old_value,
            'status': obj.status,
            'status_display': obj.get_status_display(),
            'requested_by': {
                'id': obj.requested_by.id,
                'email': obj.requested_by.email,
                'name': f"{obj.requested_by.first_name} {obj.requested_by.last_name}".strip() or obj.requested_by.email,
            },
            'reviewed_by': {
                'id': obj.reviewed_by.id,
                'email': obj.reviewed_by.email,
            } if obj.reviewed_by else None,
            'review_notes': obj.review_notes,
            'reviewed_at': obj.reviewed_at.isoformat() if obj.reviewed_at else None,
            'created_at': obj.created_at.isoformat(),
            'applied_at': obj.applied_at.isoformat() if obj.applied_at else None,
        }


class ToolChangeRequestViewSet(viewsets.ViewSet):
    """
    Admin: Create tool change requests
    Super Admin: Approve/reject requests
    """
    permission_classes = [IsAdmin]
    
    def list(self, request):
        """List tool change requests."""
        if request.user.is_super_admin:
            # Super Admin sees all
            queryset = ToolChangeRequest.objects.all()
        else:
            # Admin sees only their own
            queryset = ToolChangeRequest.objects.filter(requested_by=request.user)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        data = [ToolChangeRequestSerializer.serialize(obj) for obj in queryset[:50]]
        return Response(data)
    
    def retrieve(self, request, pk=None):
        """Get single request."""
        try:
            obj = ToolChangeRequest.objects.get(pk=pk)
            if not request.user.is_super_admin and obj.requested_by != request.user:
                return Response({'error': 'Not authorized'}, status=403)
            return Response(ToolChangeRequestSerializer.serialize(obj))
        except ToolChangeRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
    
    def create(self, request):
        """
        Admin creates a tool change request.
        Super Admin still needs to approve.
        """
        feature_id = request.data.get('feature_id')
        change_type = request.data.get('change_type')
        reason = request.data.get('reason', '')
        new_value = request.data.get('new_value')
        
        if not feature_id or not change_type:
            return Response({'error': 'feature_id and change_type required'}, status=400)
        
        try:
            feature = Feature.objects.get(id=feature_id)
        except Feature.DoesNotExist:
            return Response({'error': 'Feature not found'}, status=404)
        
        # Capture old value for limit changes
        old_value = None
        if change_type == ToolChangeRequest.ChangeType.ADJUST_LIMIT:
            from apps.subscriptions.models import PlanFeature
            pf = PlanFeature.objects.filter(feature=feature).first()
            if pf:
                old_value = {'daily_limit': pf.daily_limit, 'monthly_limit': pf.monthly_limit}
        
        obj = ToolChangeRequest.objects.create(
            requested_by=request.user,
            feature=feature,
            change_type=change_type,
            reason=reason,
            new_value=new_value,
            old_value=old_value,
        )
        
        return Response(ToolChangeRequestSerializer.serialize(obj), status=201)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def approve(self, request, pk=None):
        """Super Admin approves the request."""
        try:
            obj = ToolChangeRequest.objects.get(pk=pk)
        except ToolChangeRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        
        if obj.status != ToolChangeRequest.Status.PENDING:
            return Response({'error': 'Request already processed'}, status=400)
        
        notes = request.data.get('notes', '')
        obj.approve(reviewer=request.user, notes=notes)
        
        return Response({
            'status': 'approved',
            'message': f'{obj.feature.name} change has been approved and applied.',
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def reject(self, request, pk=None):
        """Super Admin rejects the request."""
        try:
            obj = ToolChangeRequest.objects.get(pk=pk)
        except ToolChangeRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        
        if obj.status != ToolChangeRequest.Status.PENDING:
            return Response({'error': 'Request already processed'}, status=400)
        
        notes = request.data.get('notes', '')
        if not notes:
            return Response({'error': 'Rejection reason required'}, status=400)
        
        obj.reject(reviewer=request.user, notes=notes)
        
        return Response({
            'status': 'rejected',
            'message': 'Request has been rejected.',
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin])
    def pending_count(self, request):
        """Get count of pending requests for dashboard."""
        count = ToolChangeRequest.objects.filter(status=ToolChangeRequest.Status.PENDING).count()
        return Response({'pending_count': count})
