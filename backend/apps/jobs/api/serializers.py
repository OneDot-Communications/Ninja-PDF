from rest_framework import serializers
from apps.jobs.models import Job

class JobSerializer(serializers.ModelSerializer):
    """
    Serializer for the Job model.
    """
    result_url = serializers.SerializerMethodField()
    name = serializers.CharField(source='tool_type', read_only=True)

    class Meta:
        model = Job
        fields = ['id', 'name', 'tool_type', 'status', 'created_at', 'completed_at', 'result', 'error_message', 'result_url']
        read_only_fields = fields

    def get_result_url(self, obj):
        # Extract URL from result dict if present
        if obj.result and 'url' in obj.result:
             return obj.result.get('url')
        if obj.result and 'download_url' in obj.result:
             return obj.result.get('download_url')
        return None
