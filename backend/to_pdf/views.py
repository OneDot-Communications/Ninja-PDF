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

@never_cache
@csrf_exempt
def word_to_pdf_view(request):
    return process_to_pdf_request(
        request=request,
        accepted_extensions=['.doc', '.docx'],
        conversion_func=convert_word_to_pdf,
        input_type_name='Word',
        default_ext='.docx'
    )

@never_cache
@csrf_exempt
def powerpoint_to_pdf_view(request):
    return process_to_pdf_request(
        request=request,
        accepted_extensions=['.ppt', '.pptx'],
        conversion_func=convert_powerpoint_to_pdf,
        input_type_name='PowerPoint',
        default_ext='.pptx'
    )

@never_cache
@csrf_exempt
def excel_to_pdf_view(request):
    return process_to_pdf_request(
        request=request,
        accepted_extensions=['.xls', '.xlsx'],
        conversion_func=convert_excel_to_pdf,
        input_type_name='Excel',
        default_ext='.xlsx'
    )

@never_cache
@csrf_exempt
def jpg_to_pdf_view(request):
    return process_to_pdf_request(
        request=request,
        accepted_extensions=['.jpg', '.jpeg', '.png', '.bmp', '.gif'],
        conversion_func=convert_jpg_to_pdf,
        input_type_name='Image',
        default_ext='.jpg'
    )

@never_cache
@csrf_exempt
def html_to_pdf_view(request):
    return process_to_pdf_request(
        request=request,
        accepted_extensions=['.html', '.htm'],
        conversion_func=convert_html_to_pdf,
        input_type_name='HTML',
        default_ext='.html'
    )

@never_cache
@csrf_exempt
def markdown_to_pdf_view(request):
    return process_to_pdf_request(
        request=request,
        accepted_extensions=['.md', '.markdown'],
        conversion_func=convert_markdown_to_pdf,
        input_type_name='Markdown',
        default_ext='.md'
    )

@never_cache
@csrf_exempt
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
            
            # Send protected PDF as response
            with open(output_path, 'rb') as pdf_file:
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

@never_cache
@csrf_exempt
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

