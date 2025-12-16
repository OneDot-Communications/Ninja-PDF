"""Workflows API Serializers"""
from rest_framework import serializers
from apps.workflows.models.workflow import Workflow, Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'workflow', 'tool_name', 'status', 'input_file', 'output_file', 'error_message', 'created_at', 'completed_at']
        read_only_fields = ['id', 'created_at', 'completed_at']


class WorkflowSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Workflow
        fields = ['id', 'name', 'description', 'definition', 'tasks', 'task_count', 'is_active', 'created_at', 'updated_at', 'last_run_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_run_at']
    
    def get_task_count(self, obj):
        return obj.tasks.count()
