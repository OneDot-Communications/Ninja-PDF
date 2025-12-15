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
        # TODO: Implement workflow execution logic
        return Response({'status': 'Workflow execution started', 'workflow': workflow.name})


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet for tasks in workflows."""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(workflow__user=self.request.user)
