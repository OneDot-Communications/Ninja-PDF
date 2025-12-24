from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Workflow(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workflows')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    # JSON definition of the pipeline: e.g. steps: [{tool: 'merge', params: {...}}, {tool: 'compress'}]
    definition = models.JSONField(default=dict) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        PROCESSING = 'PROCESSING', _('Processing')
        COMPLETED = 'COMPLETED', _('Completed')
        FAILED = 'FAILED', _('Failed')

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
    workflow = models.ForeignKey(Workflow, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    tool_name = models.CharField(max_length=100) # e.g., 'merge_pdf', 'compress_pdf' or None if it's a workflow
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    input_file = models.FileField(upload_to='tasks/inputs/', null=True, blank=True)
    output_file = models.FileField(upload_to='tasks/outputs/', null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.tool_name or 'Workflow'} - {self.status}"
