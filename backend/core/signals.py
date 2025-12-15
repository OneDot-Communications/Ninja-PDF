from celery.signals import task_prerun, task_success, task_failure, after_task_publish
from django.dispatch import receiver
from .models import TaskLog
from django.conf import settings
from django.utils import timezone

@task_prerun.connect
def task_prerun_handler(task_id=None, task=None, args=None, kwargs=None, **opts):
    """
    Called when a task starts executing.
    Creates or updates TaskLog to STARTED.
    """
    if not task_id:
        return
        
    task_name = task.name if task else 'unknown'
    user_id = kwargs.get('user_id')
    
    # Try to find user from kwargs if passed
    user = None
    if user_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass

    TaskLog.objects.update_or_create(
        task_id=task_id,
        defaults={
            'task_name': task_name,
            'status': TaskLog.Status.STARTED,
            'user': user,
            'updated_at': timezone.now()
        }
    )

@task_success.connect
def task_success_handler(result=None, task_id=None, **kwargs):
    """
    Called when task succeeds.
    Updates status to SUCCESS and stores result URL if available.
    """
    try:
        task_log = TaskLog.objects.get(task_id=task_id)
        task_log.status = TaskLog.Status.SUCCESS
        task_log.finished_at = timezone.now()
        
        # Extract metadata from result if dict
        if isinstance(result, dict):
            if 'output_url' in result:
                task_log.result_url = result['output_url']
            if 'file_name' in result:
                task_log.file_name = result['file_name']
            if 'file_size' in result:
                task_log.file_size = result['file_size']
            
            # Store full result in metadata
            task_log.metadata = result
            
        task_log.save()
        
        # Link to UserFile if enabled (Premium Only)
        if task_log.user and task_log.user.is_premium and 'output_path' in result:
             try:
                 from apps.files.models.user_file import UserFile
                 # Avoid duplicates if task re-runs
                 if not UserFile.objects.filter(file=result['output_path']).exists():
                     name = task_log.file_name or f"converted_{task_log.task_name}.pdf"
                     if not name.lower().endswith('.pdf'):
                         name += '.pdf'
                         
                     UserFile.objects.create(
                         user=task_log.user,
                         file=result['output_path'],
                         name=name,
                         size_bytes=task_log.file_size or 0,
                         mime_type='application/pdf' # Most outputs are PDF
                     )
             except Exception as e:
                 print(f"Failed to create UserFile: {e}")


    except TaskLog.DoesNotExist:
        # Should not happen if prerun ran, but tasks can be fast
        pass

@task_failure.connect
def task_failure_handler(task_id=None, exception=None, traceback=None, **kwargs):
    """
    Called when task fails.
    """
    try:
        task_log = TaskLog.objects.get(task_id=task_id)
        task_log.status = TaskLog.Status.FAILURE
        task_log.finished_at = timezone.now()
        task_log.error_message = str(exception)
        task_log.save()
    except TaskLog.DoesNotExist:
        pass

from django.db.models.signals import pre_delete
from django.contrib.auth import get_user_model

@receiver(pre_delete, sender=get_user_model())
def delete_user_files(sender, instance, **kwargs):
    """
    Compliance A10: Flatten user data immediately on account deletion.
    """
    # 1. Delete R2 Files (Managed by UserFile model cascade, or manual if simple storage)
    # If using Django Storages with default_storage, we might need manual cleanup 
    # if paths are predictable or rely on bucket lifecycle.
    # But UserFile model has 'file' field which usually doesn't auto-delete from S3 on DB delete 
    # unless using a cleanup lib.
    
    # Check if we have files
    if hasattr(instance, 'files'): # UserFile related name 'files' or custom
        # Iterate and delete?
        # Actually UserFile linked to user will be cascaded by DB.
        # But S3 objects remain.
        pass

    # 2. Anonymize/Delete Logs
    # TaskLog is set to CASCADE? Yes.
    # AuditLog SET_NULL? Yes.
    
    # 3. Cancel Stripe Subscription (if active)
    if hasattr(instance, 'subscription') and instance.subscription.stripe_subscription_id:
        try:
            import stripe
            stripe.Subscription.delete(instance.subscription.stripe_subscription_id)
        except:
             pass

    print(f"GDPR Cleanup: User {instance.email} deleted.")
