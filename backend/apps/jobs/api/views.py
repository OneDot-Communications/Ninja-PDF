from rest_framework import viewsets, permissions
from apps.jobs.models import Job
from apps.jobs.api.serializers import JobSerializer

class JobViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet to list user's jobs (processing history).
    """
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Job.objects.filter(user=self.request.user).order_by('-created_at')
