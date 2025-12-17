from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.jobs.models import Job
from apps.jobs.api.serializers import JobSerializer
from core.views import IsSuperAdmin
from django.db import models


from apps.subscriptions.services.entitlements import EntitlementService

class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet to list user's jobs (processing history) with batch processing support.
    Tasks 181-184: Batch processing, parallel jobs, large file, priority queue
    """
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Job.objects.filter(user=self.request.user).order_by('-created_at')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        
        # Filter by operation
        operation = self.request.query_params.get('operation')
        if operation:
            qs = qs.filter(operation=operation)
            
        return qs

    def create(self, request, *args, **kwargs):
        """
        Override create to check entitlements.
        """
        user = request.user
        operation = request.data.get('operation')
        
        if operation:
            # Check availability
            if not EntitlementService.check_usage(user, operation):
                 return Response(
                    {'error': f'Usage limit reached for {operation}. Upgrade to Premium for more.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        response = super().create(request, *args, **kwargs)
        
        if operation and response.status_code == 201:
            EntitlementService.record_usage(user, operation)
            
        return response

    
    @action(detail=False, methods=['post'])
    def batch(self, request):
        """
        Task 181: Batch processing - submit multiple files for same operation
        """
        user = request.user
        
        # 1. Check Batch Processing Permission
        if not EntitlementService.check_usage(user, 'BATCH_PROCESSING'):
            return Response(
                {'error': 'Batch processing requires premium subscription or is not enabled for your plan.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        files = request.FILES.getlist('files')
        operation = request.data.get('operation')
        options = request.data.get('options', {})
        
        if not files or len(files) < 2:
            return Response(
                {'error': 'At least 2 files required for batch processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(files) > 50:
            return Response(
                {'error': 'Maximum 50 files per batch'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check Operation Limits (Bulk)
        remaining, is_unlimited = EntitlementService.get_remaining_usage(user, operation)
        if not is_unlimited and remaining < len(files):
             return Response(
                {'error': f'Not enough quota for {len(files)} files. Remaining: {remaining}'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create batch jobs
        batch_id = f"batch_{user.id}_{int(__import__('time').time())}"
        jobs = []
        
        for idx, file in enumerate(files):
            job = Job.objects.create(
                user=user,
                operation=operation,
                status='PENDING',
                batch_id=batch_id,
                batch_index=idx,
                is_batch=True,
                priority=2,  # Higher priority for premium
            )
            jobs.append(job.id)
        
        # Record Usage
        EntitlementService.record_usage(user, operation, count=len(files))
        
        return Response({
            'batch_id': batch_id,
            'job_ids': jobs,
            'total_files': len(files),
            'status': 'queued'
        })
    
    @action(detail=False, methods=['get'])
    def batch_status(self, request):
        """Get status of a batch operation"""
        batch_id = request.query_params.get('batch_id')
        if not batch_id:
            return Response({'error': 'batch_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        jobs = Job.objects.filter(batch_id=batch_id, user=request.user)
        
        if not jobs.exists():
            return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
        
        total = jobs.count()
        completed = jobs.filter(status='COMPLETED').count()
        failed = jobs.filter(status='FAILED').count()
        pending = jobs.filter(status='PENDING').count()
        processing = jobs.filter(status='PROCESSING').count()
        
        overall_status = 'completed' if completed == total else (
            'failed' if failed > 0 and pending == 0 and processing == 0 else 'processing'
        )
        
        return Response({
            'batch_id': batch_id,
            'total': total,
            'completed': completed,
            'failed': failed,
            'pending': pending,
            'processing': processing,
            'overall_status': overall_status,
            'progress_percent': round((completed + failed) / total * 100, 1) if total > 0 else 0
        })
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed job"""
        job = self.get_object()
        
        if job.status != 'FAILED':
            return Response(
                {'error': 'Only failed jobs can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'PENDING'
        job.error_message = None
        job.retry_count = (job.retry_count or 0) + 1
        job.save()
        
        return Response({'success': True, 'message': 'Job queued for retry'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending job"""
        job = self.get_object()
        
        if job.status not in ['PENDING', 'PROCESSING']:
            return Response(
                {'error': 'Cannot cancel job in this status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        job.status = 'CANCELLED'
        job.save()
        
        return Response({'success': True, 'message': 'Job cancelled'})
    
    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def priority_boost(self, request):
        """
        Task 184: Priority queue processing - boost job priority
        """
        job_id = request.data.get('job_id')
        priority = request.data.get('priority', 10)  # 10 = highest
        
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        
        job.priority = priority
        job.save()
        
        return Response({
            'success': True,
            'job_id': job_id,
            'new_priority': priority
        })


class AdminJobViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin view for all jobs (Task 132: View job failure logs)"""
    serializer_class = JobSerializer
    permission_classes = [IsSuperAdmin]
    queryset = Job.objects.all()
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        
        return qs.select_related('user').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def admin_retry(self, request, pk=None):
        """Task 132: Admin retry failed PDF job"""
        job = self.get_object()
        job.status = 'PENDING'
        job.error_message = None
        job.priority = 10  # High priority for admin retry
        job.save()
        
        return Response({
            'success': True,
            'message': f'Job {job.id} queued for retry with high priority'
        })

