"""Workflows API Views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.workflows.models.workflow import Workflow, Task
from apps.workflows.api.serializers import WorkflowSerializer, TaskSerializer


class WorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for workflows (automation templates)."""
    serializer_class = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workflow.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a workflow."""
        workflow = self.get_object()
        # Execute a workflow
        from apps.jobs.models import Job
        from apps.jobs.services.job_runner import JobRunner

        # Create a job for this workflow execution
        job = Job.objects.create(
            user=request.user,
            workflow=workflow,
            status=Job.Status.QUEUED,
            input_file=None # Workflows might not start with a file immediately, or it comes from request.FILES
        )

        # Trigger execution (Async)
        try:
            JobRunner.run_job(job.id)
            return Response({'status': 'Workflow execution started', 'job_id': job.id, 'workflow': workflow.name})
        except Exception as e:
            job.status = Job.Status.FAILED
            job.error = str(e)
            job.save()
            return Response({'error': str(e)}, status=500)


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet for tasks in workflows."""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(workflow__user=self.request.user)
