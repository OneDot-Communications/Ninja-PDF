import os
import tempfile
import time
import traceback
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from rest_framework.response import Response
from django.core.files.storage import default_storage

def cleanup_files(paths, retries=3, delay=0.1):
    """
    Attempts to remove files with retry logic (useful for Windows file locking).
    """
    for attempt in range(retries):
        try:
            for path in paths:
                if path and os.path.exists(path):
                    os.unlink(path)
            break
        except PermissionError:
            if attempt < retries - 1:
                time.sleep(delay)
        except Exception:
            pass

def check_premium_access(request):
    """
    Helper to check Authentication and Premium status.
    Returns (True, None) if allowed.
    Returns (False, JsonResponse) if denied.
    """
    if not request.user.is_authenticated:
        return False, JsonResponse({'error': 'Authentication required'}, status=401)
    
    is_premium = False
    if request.user.role == 'SUPER_ADMIN':
        is_premium = True
    elif hasattr(request.user, 'subscription'):
        if request.user.subscription.status == 'ACTIVE':
            is_premium = True
            
    if not is_premium:
        return False, JsonResponse({'error': 'This feature is available for Premium users only.'}, status=403)
        
    return True, None

def dispatch_async_task(request, task_func, quota_code, task_args=None, task_kwargs_extra=None):
    """
    Generic dispatcher for Async Celery Tasks.
    Handles File Upload -> Storage -> Task Dispatch -> Quota Increment.
    """
    from core.quotas import QuotaManager
    
    if not request.FILES.get('file'):
        return Response({'error': 'No file uploaded'}, status=400)
    
    # Support multiple files (for Merge) if 'files' list is passed, but this function implies single upload handling usually.
    # If the view handles multiple files, it should upload them and pass paths in task_args?
    # For now, let's assume 'file' is the primary input.
    
    file_obj = request.FILES['file']

    # Define storage paths early for UserFile creation
    import time
    user_key = str(request.user.id) if request.user.is_authenticated else f"guest_{QuotaManager.get_client_ip(request)}"
    filename = f"{int(time.time())}_{file_obj.name}"
    
    import hashlib
    import pikepdf
    
    # Calculate SHA256 (preferred). MD5 is deprecated and not used for new security checks.
    sha256_hash = hashlib.sha256()
    for chunk in file_obj.chunks():
        sha256_hash.update(chunk)
    file_sha256 = sha256_hash.hexdigest()
    
    # Reset pointer for saving
    file_obj.seek(0)

    # Validate PDF & Get Page Count
    page_count = None
    if file_obj.content_type == 'application/pdf' or file_obj.name.lower().endswith('.pdf'):
        try:
            # We need to read it to open with pikepdf, or save first. 
            # Since we have it in memory/chunks, let's defer page count until after save or use temporary stream?
            # Using pikepdf.open on stream might work if seekable.
            with pikepdf.open(file_obj) as pdf:
                page_count = len(pdf.pages)
        except Exception:
            # Not a valid PDF or encryption issue
            pass
        finally:
             file_obj.seek(0)
             
    # Create File Asset Record (State: CREATED)
    from apps.files.models.user_file import UserFile
    from django.utils import timezone
    
    file_asset = None
    if request.user.is_authenticated:
        metadata = {'original_name': file_obj.name}
        if page_count:
            metadata['page_count'] = page_count
            
        file_asset = UserFile.objects.create(
            user=request.user,
            file=f"uploads/{user_key}/{filename}", 
            name=file_obj.name,
            size_bytes=file_obj.size,
            mime_type=file_obj.content_type,
            status=UserFile.Status.CREATED,
            md5_hash=None,
            sha256_hash=file_sha256,
            metadata=metadata
        )
    
    # Save Upload (State: UPLOADING -> VALIDATED)
    try:
        if file_asset:
            file_asset.status = UserFile.Status.UPLOADING
            file_asset.save()
            
        file_path = default_storage.save(f"uploads/{user_key}/{filename}", file_obj)
        
        if file_asset:
            # Update actual path if storage changed it
            file_asset.file.name = file_path
            # State: VALIDATED -> TEMP_STORED
            file_asset.status = UserFile.Status.VALIDATED
            file_asset.save()
            # Simulate Validation Steps (MIME, Magic Bytes already done in Form/Serializer usually)
            # Here we mark as TEMP_STORED as it is physically in R2/S3 now
            file_asset.status = UserFile.Status.TEMP_STORED
            file_asset.save()
            
    except Exception as e:
        if file_asset:
            file_asset.status = UserFile.Status.FAILED
            file_asset.save()
        raise e
    
    # Determine Queue based on Priority
    queue = 'default'
    if request.user.is_authenticated and (request.user.is_premium or request.user.is_super_admin):
        queue = 'high_priority'

    # Prepare args
    args = [file_path]
    if task_args:
        args.extend(task_args)

    # Pass Metadata
    task_kwargs = {}
    if request.user.is_authenticated:
        task_kwargs['user_id'] = request.user.id
        if file_asset:
             task_kwargs['file_asset_id'] = file_asset.id
        
    if task_kwargs_extra:
        task_kwargs.update(task_kwargs_extra)
        
    # State: METADATA_REGISTERED
    if file_asset:
        file_asset.status = UserFile.Status.METADATA_REGISTERED
        file_asset.save()

    # Dispatch Task (State: QUEUED)
    if file_asset:
        file_asset.status = UserFile.Status.QUEUED
        file_asset.save()

    task = task_func.apply_async(args=args, kwargs=task_kwargs, queue=queue)
    
    # Link Task ID to File Asset? 
    # Ideally UserFile should have task_id or TaskLog links to UserFile.
    # For now, we rely on TaskLog creation in Signal or here?
    # Signal handles TaskLog. We can update TaskLog with file_asset_id if we want.
    
    # Increment Quota  
    if request.user.is_authenticated:
        QuotaManager.increment_user_quota(request.user, quota_code)
    else:
        QuotaManager.increment_guest_quota(request)
        
    return Response({
        'task_id': task.id,
        'file_id': file_asset.id if file_asset else None,
        'status': 'processing', 
        'message': 'File uploaded and conversion started.'
    })

def process_to_pdf_request(request, accepted_extensions, conversion_func, input_type_name, template_name='to_pdf/convert_form.html', default_ext=None, premium_required=True):
    """
    Handles the common logic for 'To PDF' conversions (e.g. Word -> PDF).
    Returns an HttpResponse or renders a template on error.
    """
    # 1. Enforce Authentication
    if not request.user.is_authenticated:
        if request.user.is_anonymous:
             from django.shortcuts import redirect
             return redirect('/login')

    # 2. Enforce Premium
    if premium_required:
         is_premium = False
         if request.user.role == 'SUPER_ADMIN':
             is_premium = True
         elif hasattr(request.user, 'subscription'):
             if request.user.subscription.status == 'ACTIVE':
                 # Add expiry check logic here if needed
                 is_premium = True
         
         if not is_premium:
             return render(request, template_name, {
                'title': f'{input_type_name} to PDF Converter',
                'input_type': input_type_name,
                'accept': ','.join(accepted_extensions),
                'error': 'This feature is available for Premium users only. Please upgrade your plan.'
            })

    if request.method != 'POST' or not request.FILES.get('file'):
         return render(request, template_name, {
            'title': f'{input_type_name} to PDF Converter',
            'input_type': input_type_name,
            'accept': ','.join(accepted_extensions)
        })

    uploaded_file = request.FILES['file']
    original_ext = os.path.splitext(uploaded_file.name)[1].lower()
    
    # Validation
    if original_ext not in accepted_extensions:
         response = render(request, template_name, {
            'title': f'{input_type_name} to PDF Converter',
            'input_type': input_type_name,
            'accept': ','.join(accepted_extensions),
            'error': f'Invalid file type. Please upload a {input_type_name} file. You uploaded: {original_ext or "unknown"}'
        })
         response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
         return response

    if not original_ext and default_ext:
        original_ext = default_ext

    input_path = None
    output_path = None

    try:
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=original_ext) as temp_input:
            for chunk in uploaded_file.chunks():
                temp_input.write(chunk)
            temp_input.flush()
            # fsync to ensure write is complete before closing/re-opening
            try:
                os.fsync(temp_input.fileno())
            except OSError:
                pass 
            input_path = temp_input.name
        
        output_path = os.path.splitext(input_path)[0] + '.pdf'
        
        # Convert
        conversion_func(input_path, output_path)
        
        # Check output
        if not os.path.exists(output_path):
             raise RuntimeError("PDF file was not created")

        output_filename = os.path.splitext(uploaded_file.name)[0] + '.pdf'
        
        with open(output_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
            response['Content-Length'] = len(pdf_data)

        # Cleanup success
        cleanup_files([input_path, output_path])
        return response

    except Exception as e:
        # trace back for debugging if needed, or just log
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Exception during To PDF conversion", exc_info=True)
        # Cleanup error
        cleanup_files([input_path, output_path])
        
        response = render(request, template_name, {
            'title': f'{input_type_name} to PDF Converter',
            'input_type': input_type_name,
            'accept': ','.join(accepted_extensions),
            'error': str(e)
        })
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

def process_from_pdf_request(request, conversion_func, content_type, output_ext=None, premium_required=True, **options):
    """
    Handles the common logic for 'From PDF' conversions (e.g. PDF -> Word).
    Returns an HttpResponse (file) or JsonResponse (error).
    options can include default values for the conversion function.
    """
    # 1. Enforce Authentication & Premium via Helper
    if premium_required:
        allowed, error_response = check_premium_access(request)
        if not allowed:
            return error_response

    try:
        uploaded_file = request.FILES.get('pdf_file') or request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse({'error': 'No PDF file uploaded'}, status=400)

        pdf_file = uploaded_file
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)
        
        # Extract common options from POST, mix with defaults
        conversion_options = options.copy()
        
        # Common parameters that might be in POST
        if request.POST.get('page_range'):
             conversion_options['page_range'] = request.POST.get('page_range')
        if request.POST.get('format'):
             conversion_options['format'] = request.POST.get('format')
        # Add other specific params as needed or pass **request.POST.dict() carefully
        
        # Perform conversion
        # Expecting conversion_func to return (filename, file_bytes) or list of them
        result = conversion_func(pdf_file, conversion_options)
        
        # Handle single file result
        if isinstance(result, tuple) and len(result) == 2:
            filename, file_bytes = result
            response = HttpResponse(file_bytes, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        
        # Handle list result (e.g. HTML single file returned as list, or images)
        if isinstance(result, list) and len(result) > 0:
             # Assuming single file for now unless specifically multi-file (like ZIP) used in jpg
             # If it's the HTML view, it returns a list but we take the first one
             filename, file_bytes = result[0]
             response = HttpResponse(file_bytes, content_type=content_type)
             response['Content-Disposition'] = f'attachment; filename="{filename}"'
             return response

        return JsonResponse({'error': 'Conversion returned no data'}, status=500)

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Conversion failed: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)
