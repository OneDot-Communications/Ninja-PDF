from django.shortcuts import render, redirect
from django.http import HttpResponse, Http404
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
import os
import tempfile
from .word_pdf.word_to_pdf import convert_word_to_pdf
from .powerpoint_pdf.powerpoint_to_pdf import convert_powerpoint_to_pdf
from .excel_pdf.excel_to_pdf import convert_excel_to_pdf
from .jpg_pdf.jpg_to_pdf import convert_jpg_to_pdf
from .html_pdf.html_to_pdf import convert_html_to_pdf
from .markdown_pdf.markdown_to_pdf import convert_markdown_to_pdf
from .protect_pdf.protect_pdf import protect_pdf
from .unlock_pdf.unlock_pdf import unlock_pdf
from core.utils import process_to_pdf_request

def index_view(request):
    return render(request, 'to_pdf/index.html')

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.quotas import QuotaManager
from core.decorators import check_quota
from .tasks import convert_word_to_pdf_task

@api_view(['POST'])
@permission_classes([AllowAny])
@check_quota('WORD_TO_PDF')
def word_to_pdf_view(request):
    return handle_async_conversion(request, convert_word_to_pdf_task, 'WORD_TO_PDF')

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
@check_quota('PROTECT_PDF')
def protect_pdf_view(request):
    """
    Protect PDF with password encryption and permission controls.
    Serves the custom UI or handles form submission.
    """
    if request.method == 'GET':
        # Serve the custom index.html for protect PDF
        html_path = os.path.join(os.path.dirname(__file__), 'protect_pdf', 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        
        # Validate file extension
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        if original_ext != '.pdf':
            return HttpResponse(f'Invalid file type. Please upload a PDF file. You uploaded: {original_ext or "unknown"}', status=400)
        
        # Get password and permissions from form
        password = request.POST.get('password', '').strip() or None
        
        # Parse boolean permissions
        allow_printing = request.POST.get('allow_printing', 'false').lower() == 'true'
        allow_modify = request.POST.get('allow_modify', 'false').lower() == 'true'
        allow_copy = request.POST.get('allow_copy', 'false').lower() == 'true'
        allow_annotate = request.POST.get('allow_annotate', 'false').lower() == 'true'
        allow_forms = request.POST.get('allow_forms', 'false').lower() == 'true'
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_input:
            for chunk in uploaded_file.chunks():
                temp_input.write(chunk)
            input_path = temp_input.name
        
        output_path = os.path.splitext(input_path)[0] + '_protected.pdf'
        
        try:
            # Protect the PDF with specified settings
            protect_pdf(
                input_path=input_path,
                output_path=output_path,
                user_password=password,
                owner_password=password,
                allow_printing=allow_printing,
                allow_modify=allow_modify,
                allow_copy=allow_copy,
                allow_annotate=allow_annotate,
                allow_forms=allow_forms,
                allow_extract=allow_copy,  # Extract tied to copy permission
                allow_assemble=allow_modify,  # Assemble tied to modify permission
                allow_print_highres=allow_printing  # High-res tied to printing permission
            )
            
            # Generate output filename
            output_filename = os.path.splitext(uploaded_file.name)[0] + '_protected.pdf'
            
            # Increment Quota Manually (if @check_quota only checks but doesn't increment?)
            # Wait, @check_quota in decorators.py often DOES increment or just Checks?
            # I must check decorators.py. If it only checks, I must increment.
            # Assuming it handled it or I need to do it.
            # actually my decorator implementation:
            # if authenticated -> QuotaManager.check_user_quota (just check).
            # if guest -> QuotaManager.check_guest_quota (just check).
            # So I MUST increment manually!
            
            # Increment Quota
            if request.user.is_authenticated:
                QuotaManager.increment_user_quota(request.user, 'PROTECT_PDF')
            else:
                QuotaManager.increment_guest_quota(request)
            
            # Send protected PDF as response
            with open(output_path, 'rb') as pdf_file:
                 # ... response logic ...
                pdf_data = pdf_file.read()
                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
                response['Content-Length'] = len(pdf_data)
            
            # Cleanup
            try:
                if os.path.exists(input_path):
                    os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)
            except:
                pass
            
            return response
            
        except Exception as e:
            # Cleanup on error
            try:
                if os.path.exists(input_path):
                    os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)
            except:
                pass
            
            return HttpResponse(str(e), status=500)
    
    return HttpResponse('Invalid request', status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
@check_quota('PPT_TO_PDF')
def powerpoint_to_pdf_view(request):
    # Use generic task with 'powerpoint' type
    return handle_async_conversion(request, convert_document_task, 'PPT_TO_PDF', task_args=['powerpoint'])

@api_view(['POST'])
@permission_classes([AllowAny])
@check_quota('EXCEL_TO_PDF')
def excel_to_pdf_view(request):
    return handle_async_conversion(request, convert_document_task, 'EXCEL_TO_PDF', task_args=['excel'])

@api_view(['POST'])
@permission_classes([AllowAny])
@check_quota('JPG_TO_PDF')
def jpg_to_pdf_view(request):
    return handle_async_conversion(request, convert_document_task, 'JPG_TO_PDF', task_args=['jpg'])

@api_view(['POST'])
@permission_classes([AllowAny])
@check_quota('HTML_TO_PDF')
def html_to_pdf_view(request):
    return handle_async_conversion(request, convert_document_task, 'HTML_TO_PDF', task_args=['html'])

@api_view(['POST'])
@permission_classes([AllowAny])
@check_quota('MD_TO_PDF')
def markdown_to_pdf_view(request):
    return handle_async_conversion(request, convert_document_task, 'MD_TO_PDF', task_args=['markdown'])

def handle_async_conversion(request, task_func, quota_code, task_args=None):
    if not request.FILES.get('file'):
        return Response({'error': 'No file uploaded'}, status=400)
    
    file_obj = request.FILES['file']
    
    # Save Upload
    import time
    user_key = str(request.user.id) if request.user.is_authenticated else f"guest_{QuotaManager.get_client_ip(request)}"
    filename = f"{int(time.time())}_{file_obj.name}"
    file_path = default_storage.save(f"uploads/{user_key}/{filename}", file_obj)
    
    # Determine Queue based on Priority
    queue = 'default'
    if request.user.is_authenticated and (request.user.is_premium or request.user.is_super_admin):
        queue = 'high_priority'

    # Prepare args
    args = [file_path]
    if task_args:
        args.extend(task_args)

    # Dispatch Task
    task = task_func.apply_async(args=args, queue=queue)
    
    # Increment Quota  
    if request.user.is_authenticated:
        QuotaManager.increment_user_quota(request.user, quota_code)
    else:
        QuotaManager.increment_guest_quota(request)
        
    return Response({
        'task_id': task.id,
        'status': 'processing',
        'message': 'File uploaded and conversion started.'
    })

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
@check_quota('UNLOCK_PDF')
def unlock_pdf_view(request):
    """
    Unlock password-protected PDF.
    Serves the custom UI or handles form submission.
    """
    if request.method == 'GET':
        # Serve the custom index.html for unlock PDF
        html_path = os.path.join(os.path.dirname(__file__), 'unlock_pdf', 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        
        # Validate file extension
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        if original_ext != '.pdf':
            return HttpResponse(f'Invalid file type. Please upload a PDF file. You uploaded: {original_ext or "unknown"}', status=400)
        
        # Get password from form
        password = request.POST.get('password', '').strip()
        if not password:
            return HttpResponse('Password is required to unlock the PDF', status=400)
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_input:
            for chunk in uploaded_file.chunks():
                temp_input.write(chunk)
            input_path = temp_input.name
        
        output_path = os.path.splitext(input_path)[0] + '_unlocked.pdf'
        
        try:
            # Unlock the PDF
            unlock_pdf(
                input_path=input_path,
                output_path=output_path,
                password=password
            )
            
            # Increment Quota
            if request.user.is_authenticated:
                QuotaManager.increment_user_quota(request.user, 'UNLOCK_PDF')
            else:
                QuotaManager.increment_guest_quota(request)

            # Generate output filename
            output_filename = os.path.splitext(uploaded_file.name)[0] + '_unlocked.pdf'
            
            # Send unlocked PDF as response
            with open(output_path, 'rb') as pdf_file:
                pdf_data = pdf_file.read()
                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
                response['Content-Length'] = len(pdf_data)
            
            # Cleanup (clear password from memory)
            password = None
            try:
                if os.path.exists(input_path):
                    os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)
            except:
                pass
            
            return response
            
        except Exception as e:
            # Cleanup on error (clear password from memory)
            password = None
            try:
                if os.path.exists(input_path):
                    os.unlink(input_path)
                if os.path.exists(output_path):
                    os.unlink(output_path)
            except:
                pass
            
            return HttpResponse(str(e), status=500)
    
    return HttpResponse('Invalid request', status=400)


@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
@check_quota('SIGN_PDF')
def sign_pdf_view(request):
    """
    Sign PDF - add signature image to PDF.
    Serves the custom UI or handles form submission.
    """
    if request.method == 'GET':
        # Serve the custom index.html for sign PDF
        html_path = os.path.join(os.path.dirname(__file__), 'sign_pdf', 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
             # Ensure index.html exists or simple fallback
             if os.path.exists(html_path):
                return HttpResponse(f.read(), content_type='text/html')
             return HttpResponse("Sign PDF Interface", content_type='text/plain')
    
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        signature_file = request.FILES.get('signature')
        
        # Validate PDF file
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        if original_ext != '.pdf':
            return HttpResponse(f'Invalid file type. Please upload a PDF file. You uploaded: {original_ext or "unknown"}', status=400)
        
        # Validate signature file
        if not signature_file:
            return HttpResponse('Signature image is required', status=400)
        
        # Get options
        try:
            page_number = int(request.POST.get('page', 0))
        except ValueError:
            return HttpResponse('Invalid page number', status=400)

        position = request.POST.get('position', 'bottom-right')

        # Normalized coordinates (if provided)
        nx = request.POST.get('nx')
        ny = request.POST.get('ny')
        nwidth = request.POST.get('nwidth')
        nheight = request.POST.get('nheight')

        use_normalized = all(v is not None and v != '' for v in [nx, ny, nwidth])

        try:
            # Read files
            pdf_bytes = uploaded_file.read()
            signature_bytes = signature_file.read()
            
            # Increment Quota
            if request.user.is_authenticated:
                QuotaManager.increment_user_quota(request.user, 'SIGN_PDF')
            else:
                QuotaManager.increment_guest_quota(request)

            if use_normalized:
                try:
                    nx_f = float(nx)
                    ny_f = float(ny)
                    nwidth_f = float(nwidth)
                    nheight_f = float(nheight) if nheight not in [None, '', 'null'] else None
                except ValueError:
                    return HttpResponse('Invalid normalized coordinates', status=400)

                signed_pdf_bytes = sign_pdf_normalized(
                    pdf_bytes=pdf_bytes,
                    signature_bytes=signature_bytes,
                    page_number=page_number,
                    nx=nx_f,
                    ny=ny_f,
                    nwidth=nwidth_f,
                    nheight=nheight_f
                )
            else:
                # Sign the PDF using preset position
                signed_pdf_bytes = sign_pdf(
                    pdf_bytes=pdf_bytes,
                    signature_bytes=signature_bytes,
                    page_number=page_number,
                    position=position
                )
            
            # Generate output filename
            output_filename = os.path.splitext(uploaded_file.name)[0] + '_signed.pdf'
            
            # Send signed PDF as response
            response = HttpResponse(signed_pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{output_filename}"'
            response['Content-Length'] = len(signed_pdf_bytes)
            
            return response
            
        except Exception as e:
            return HttpResponse(str(e), status=500)
    
    return HttpResponse('Invalid request', status=400)


@never_cache
@csrf_exempt
def sign_pdf_info_view(request):
    """
    Get PDF info (page count) for the sign PDF UI.
    """
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        
        try:
            pdf_bytes = uploaded_file.read()
            info = get_pdf_info(pdf_bytes)
            
            from django.http import JsonResponse
            return JsonResponse(info)
            
        except Exception as e:
            return HttpResponse(str(e), status=500)
    
    return HttpResponse('Invalid request', status=400)
