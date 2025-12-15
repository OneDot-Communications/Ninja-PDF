"""
Automation & Workflows (TASK 59-63)
Defines workflow entity, chaining, failure isolation, and execution logs.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import logging

logger = logging.getLogger(__name__)


class Workflow(models.Model):
    """
    TASK 59: Workflow Entity (trigger, steps, conditions, outputs)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # Trigger definition
    trigger_type = models.CharField(max_length=50, default='MANUAL')  # MANUAL, SCHEDULED, UPLOAD
    trigger_config = models.JSONField(default=dict, blank=True)
    
    # Steps as JSON array
    steps = models.JSONField(default=list, help_text="Array of {tool_id, parameters}")
    
    # Conditions (optional filtering)
    conditions = models.JSONField(default=dict, blank=True)
    
    # Output handling
    output_config = models.JSONField(default=dict, blank=True)
    
    # State
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'workflows'
        ordering = ['-created_at']


class WorkflowExecution(models.Model):
    """
    TASK 63: Full execution logs for workflows.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='executions')
    
    # Input file
    input_file = models.ForeignKey('files.UserFile', on_delete=models.SET_NULL, null=True)
    
    # Execution state
    status = models.CharField(max_length=20, default='PENDING')  # PENDING, RUNNING, COMPLETED, FAILED, PARTIAL
    current_step_index = models.IntegerField(default=0)
    
    # TASK 61, 62: Failure isolation and resume support
    last_successful_step = models.IntegerField(default=-1)
    error_at_step = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Logs
    step_logs = models.JSONField(default=list)  # Array of {step_index, status, result, timestamp}
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = 'workflows'
        ordering = ['-started_at']


def execute_workflow_step(execution: WorkflowExecution, step_index: int):
    """
    TASK 60: Step-by-step job chaining.
    Executes a single step and chains to the next.
    """
    workflow = execution.workflow
    steps = workflow.steps
    
    if step_index >= len(steps):
        # All steps complete
        execution.status = 'COMPLETED'
        execution.completed_at = timezone.now()
        execution.save()
        return
    
    step = steps[step_index]
    tool_id = step.get('tool_id')
    parameters = step.get('parameters', {})
    
    try:
        # Get input file (from previous step output or initial input)
        if step_index == 0:
            input_file = execution.input_file
        else:
            # Get output from previous step
            prev_log = execution.step_logs[step_index - 1]
            input_file_id = prev_log.get('output_file_id')
            from apps.files.models.user_file import UserFile
            input_file = UserFile.objects.get(id=input_file_id)
        
        # Enqueue job for this step
        from core.job_orchestration import enqueue_job
        job = enqueue_job(
            file_asset=input_file,
            tool_type=tool_id,
            user=workflow.user,
            parameters=parameters
        )
        
        # Log step
        execution.step_logs.append({
            'step_index': step_index,
            'tool_id': tool_id,
            'job_id': str(job.id),
            'status': 'QUEUED',
            'timestamp': timezone.now().isoformat()
        })
        execution.current_step_index = step_index
        execution.save()
        
        logger.info(f"Workflow {workflow.id} step {step_index} enqueued as job {job.id}")
        
    except Exception as e:
        # TASK 61: Failure isolation
        execution.status = 'FAILED'
        execution.error_at_step = step_index
        execution.error_message = str(e)
        execution.save()
        
        logger.error(f"Workflow {workflow.id} failed at step {step_index}: {e}")


def resume_workflow(execution: WorkflowExecution):
    """
    TASK 62: Resume from last success.
    """
    if execution.status != 'FAILED':
        return
    
    # Resume from step after last successful
    resume_index = execution.last_successful_step + 1
    
    execution.status = 'RUNNING'
    execution.error_at_step = None
    execution.error_message = ''
    execution.save()
    
    execute_workflow_step(execution, resume_index)
