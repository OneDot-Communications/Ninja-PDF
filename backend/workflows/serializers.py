from rest_framework import serializers
from .models import Workflow, Task

class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'completed_at', 'status', 'error_message', 'output_file')
