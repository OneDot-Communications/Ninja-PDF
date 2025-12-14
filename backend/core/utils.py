import os
import tempfile
import time
import traceback
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render

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
