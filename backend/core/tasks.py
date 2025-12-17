from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

@shared_task
def daily_maintenance():
    """
    Periodic task to run daily maintenance commands.
    """
    logger.info("Starting Daily Maintenance...")
    
    try:
        # 1. Reset Quotas
        call_command('reset_quotas')
        logger.info("Quotas Reset.")
        
        # 2. Cleanup Storage (Expired files)
        call_command('cleanup_storage')
        logger.info("Storage Cleanup Completed.")
        
        # 3. Process expired trials
        process_expired_trials.delay()
        
        # 4. Send trial expiring reminders
        send_trial_expiring_reminders.delay()
        
    except Exception as e:
        logger.error(f"Daily Maintenance Failed: {e}", exc_info=True)


@shared_task
def process_expired_trials():
    """
    Process trials that have expired but not yet converted to FREE.
    """
    logger.info("Processing expired trials...")
    
    try:
        from apps.subscriptions.services.trial_service import TrialService
        
        expired_trials = TrialService.get_expired_trials()
        count = 0
        
        for subscription in expired_trials:
            try:
                TrialService.expire_trial(subscription)
                count += 1
                logger.info(f"Expired trial for {subscription.user.email}")
            except Exception as e:
                logger.error(f"Failed to expire trial for {subscription.user.email}: {e}")
        
        logger.info(f"Processed {count} expired trials")
        return count
    except Exception as e:
        logger.error(f"Process expired trials failed: {e}", exc_info=True)
        return 0


@shared_task
def send_trial_expiring_reminders():
    """
    Send reminder emails to users whose trials are expiring soon.
    """
    logger.info("Sending trial expiring reminders...")
    
    try:
        from apps.subscriptions.services.trial_service import TrialService
        
        # Get trials expiring in 3 days
        expiring_in_3 = TrialService.get_expiring_trials(days_ahead=3)
        for sub in expiring_in_3:
            trial_info = TrialService.check_trial_status(sub)
            if trial_info['days_remaining'] == 3:
                TrialService.send_trial_expiring_reminder(sub, 3)
                logger.info(f"Sent 3-day reminder to {sub.user.email}")
        
        # Get trials expiring in 1 day
        expiring_in_1 = TrialService.get_expiring_trials(days_ahead=1)
        for sub in expiring_in_1:
            trial_info = TrialService.check_trial_status(sub)
            if trial_info['days_remaining'] == 1:
                TrialService.send_trial_expiring_reminder(sub, 1)
                logger.info(f"Sent 1-day reminder to {sub.user.email}")
        
        logger.info("Trial expiring reminders sent")
    except Exception as e:
        logger.error(f"Send trial reminders failed: {e}", exc_info=True)


@shared_task
def process_batch_job(batch_id: str):
    """
    Process all jobs in a batch asynchronously.
    
    Args:
        batch_id: UUID of the BatchJob
    """
    logger.info(f"Processing batch job {batch_id}")
    
    try:
        from apps.jobs.models.job import BatchJob, Job
        from apps.files.models import FileAsset
        
        batch = BatchJob.objects.get(id=batch_id)
        jobs = Job.objects.filter(batch_id=batch_id).order_by('batch_index')
        
        for job in jobs:
            try:
                # Mark job as processing
                job.mark_started()
                
                # Get the tool function based on operation
                result = process_single_job(job)
                
                if result.get('success'):
                    job.mark_completed(result)
                    batch.update_progress(completed=True)
                    
                    # Track output file
                    if result.get('output_uuid'):
                        batch.output_files.append(result['output_uuid'])
                        batch.save()
                else:
                    job.mark_failed(result.get('error', 'Unknown error'))
                    batch.update_progress(completed=False, error=result.get('error'))
                    
            except Exception as e:
                logger.error(f"Batch job {job.id} failed: {e}")
                job.mark_failed(str(e))
                batch.update_progress(completed=False, error=str(e))
        
        logger.info(f"Batch {batch_id} completed: {batch.completed_files}/{batch.total_files}")
        
    except BatchJob.DoesNotExist:
        logger.error(f"Batch job {batch_id} not found")
    except Exception as e:
        logger.error(f"Batch processing failed: {e}", exc_info=True)


def process_single_job(job):
    """
    Process a single job within a batch.
    
    Args:
        job: Job instance
    
    Returns:
        Result dict with success, output_uuid, error
    """
    from django.core.files.storage import default_storage
    from apps.files.models import FileAsset
    import tempfile
    import os
    
    try:
        # Read input file
        file_asset = job.file_asset
        if not file_asset.storage_path or not default_storage.exists(file_asset.storage_path):
            return {'success': False, 'error': 'Input file not found'}
        
        with default_storage.open(file_asset.storage_path, 'rb') as f:
            input_bytes = f.read()
        
        # Route to appropriate tool
        operation = job.tool_type.lower()
        output_bytes = None
        
        if operation == 'compress':
            from apps.tools.optimizers.compress import compress_pdf
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(input_bytes)
                tmp_path = tmp.name
            output_path = tmp_path + '_out.pdf'
            result = compress_pdf(tmp_path, output_path, **job.parameters)
            if result.get('success'):
                with open(output_path, 'rb') as f:
                    output_bytes = f.read()
                os.unlink(tmp_path)
                os.unlink(output_path)
            else:
                return {'success': False, 'error': result.get('message')}
        
        elif operation == 'ocr':
            from apps.tools.ai.ocr import ocr
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(input_bytes)
                tmp_path = tmp.name
            output_path = tmp_path + '_ocr.pdf'
            result = ocr(tmp_path, output_path, **job.parameters)
            if result.get('success'):
                with open(output_path, 'rb') as f:
                    output_bytes = f.read()
                os.unlink(tmp_path)
                os.unlink(output_path)
            else:
                return {'success': False, 'error': result.get('message')}
        
        else:
            return {'success': False, 'error': f'Unknown operation: {operation}'}
        
        # Save output file
        if output_bytes:
            output_asset = FileAsset.objects.create(
                user=job.user,
                name=f"{os.path.splitext(file_asset.name)[0]}_processed.pdf",
                original_name=file_asset.original_name,
                size_bytes=len(output_bytes),
                mime_type='application/pdf',
                status=FileAsset.Status.AVAILABLE,
            )
            
            output_path = f'outputs/{job.user.id}/{output_asset.uuid}/{output_asset.name}'
            default_storage.save(output_path, io.BytesIO(output_bytes))
            output_asset.storage_path = output_path
            output_asset.save()
            
            return {'success': True, 'output_uuid': str(output_asset.uuid)}
        
        return {'success': False, 'error': 'No output generated'}
        
    except Exception as e:
        logger.error(f"Single job processing failed: {e}")
        return {'success': False, 'error': str(e)}


# Import io for BytesIO
import io
