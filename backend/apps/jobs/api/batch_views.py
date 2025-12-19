"""
Batch Processing API Views

Premium feature for processing multiple files at once.
"""
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import serializers
from django.utils import timezone
import uuid

from apps.jobs.models.job import BatchJob, Job
from apps.files.models import FileAsset


class BatchJobSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = BatchJob
        fields = [
            'id', 'operation', 'status', 'total_files',
            'completed_files', 'failed_files', 'progress',
            'output_files', 'errors', 'created_at', 'completed_at'
        ]
    
    def get_progress(self, obj):
        return obj.progress_percentage


class CreateBatchJobView(APIView):
    """
    Create a new batch processing job.
    Premium feature only.
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Premium check
        if not request.user.is_premium:
            return Response(
                {'error': 'Batch processing is a premium feature. Please upgrade your subscription.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        operation = request.data.get('operation')
        files = request.FILES.getlist('files')
        parameters = request.data.get('parameters', {})
        
        if not operation:
            return Response(
                {'error': 'Operation is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not files or len(files) == 0:
            return Response(
                {'error': 'At least one file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit number of files (configurable)
        max_files = 50
        if len(files) > max_files:
            return Response(
                {'error': f'Maximum {max_files} files allowed per batch'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create batch job
        batch = BatchJob.objects.create(
            user=request.user,
            operation=operation,
            parameters=parameters if isinstance(parameters, dict) else {},
            total_files=len(files),
            status=BatchJob.Status.PENDING,
        )
        
        # Create individual jobs for each file
        for i, file in enumerate(files):
            # Create file asset
            file_asset = FileAsset.objects.create(
                user=request.user,
                name=file.name,
                original_name=file.name,
                size_bytes=file.size,
                mime_type=file.content_type or 'application/octet-stream',
                status=FileAsset.Status.UPLOADED,
            )
            
            # Save file content
            from django.core.files.storage import default_storage
            path = f'uploads/{request.user.id}/{file_asset.uuid}/{file.name}'
            default_storage.save(path, file)
            file_asset.storage_path = path
            file_asset.save()
            
            # Create job
            Job.objects.create(
                file_asset=file_asset,
                user=request.user,
                tool_type=operation,
                parameters=parameters if isinstance(parameters, dict) else {},
                status=Job.Status.PENDING,
                batch_id=str(batch.id),
                batch_index=i,
                is_batch=True,
                operation=operation,
            )
        
        # Queue the batch for processing
        batch.status = BatchJob.Status.PROCESSING
        batch.started_at = timezone.now()
        batch.save()
        
        # Trigger async processing
        from core.tasks import process_batch_job
        process_batch_job.delay(str(batch.id))
        
        return Response({
            'batch_id': str(batch.id),
            'status': batch.status,
            'total_files': batch.total_files,
            'message': 'Batch job created and queued for processing'
        }, status=status.HTTP_201_CREATED)


class BatchJobStatusView(APIView):
    """Get status of a batch job"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, batch_id):
        try:
            batch = BatchJob.objects.get(id=batch_id, user=request.user)
        except BatchJob.DoesNotExist:
            return Response(
                {'error': 'Batch job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BatchJobSerializer(batch)
        return Response(serializer.data)


class BatchJobListView(APIView):
    """List user's batch jobs"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        batches = BatchJob.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = BatchJobSerializer(batches, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })


class CancelBatchJobView(APIView):
    """Cancel a batch job in progress"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, batch_id):
        try:
            batch = BatchJob.objects.get(id=batch_id, user=request.user)
        except BatchJob.DoesNotExist:
            return Response(
                {'error': 'Batch job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if batch.is_complete:
            return Response(
                {'error': 'Batch job is already complete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        batch.cancel()
        
        # Cancel pending jobs in this batch
        Job.objects.filter(
            batch_id=str(batch.id),
            status__in=[Job.Status.PENDING, Job.Status.QUEUED]
        ).update(status=Job.Status.FAILED, error_message='Batch cancelled by user')
        
        return Response({
            'success': True,
            'message': 'Batch job cancelled'
        })


class BatchJobDownloadView(APIView):
    """Download all outputs from a completed batch job as a ZIP"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, batch_id):
        try:
            batch = BatchJob.objects.get(id=batch_id, user=request.user)
        except BatchJob.DoesNotExist:
            return Response(
                {'error': 'Batch job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not batch.is_complete:
            return Response(
                {'error': 'Batch job is not yet complete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not batch.output_files:
            return Response(
                {'error': 'No output files available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create ZIP file with all outputs
        import zipfile
        import io
        from django.http import HttpResponse
        from django.core.files.storage import default_storage
        
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for i, file_uuid in enumerate(batch.output_files):
                try:
                    file_asset = FileAsset.objects.get(uuid=file_uuid)
                    if file_asset.storage_path and default_storage.exists(file_asset.storage_path):
                        content = default_storage.open(file_asset.storage_path).read()
                        zip_file.writestr(file_asset.name, content)
                except FileAsset.DoesNotExist:
                    continue
        
        zip_buffer.seek(0)
        
        response = HttpResponse(zip_buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="batch_{batch_id}_output.zip"'
        return response
