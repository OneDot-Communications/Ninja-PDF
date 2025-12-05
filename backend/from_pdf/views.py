from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import io
import zipfile
from .pdf_to_jpg.pdf_to_jpg import convert_pdf_to_jpg, get_pdf_page_count
from .pdf_to_excel.pdf_to_excel import convert_pdf_to_excel
from .pdf_to_powerpoint.pdf_to_powerpoint import convert_pdf_to_powerpoint
from .pdf_to_word.pdf_to_word import convert_pdf_to_word
from .pdf_to_pdfa.pdf_to_pdfa import convert_pdf_to_pdfa
from .pdf_to_html.pdf_to_html import convert_pdf_to_html


def index(request):
    """
    Serve the testing UI for PDF conversions.
    """
    from django.http import FileResponse
    import os
    from django.conf import settings
    
    # Serve the HTML file from the new location
    html_path = os.path.join(settings.BASE_DIR, 'from_pdf', 'pdf_to_jpg', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    from django.http import HttpResponse
    return HttpResponse(html_content, content_type='text/html')


def pdf_to_excel_index(request):
    """
    Serve the PDF to Excel conversion UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'from_pdf', 'pdf_to_excel', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')


def pdf_to_powerpoint_index(request):
    """
    Serve the PDF to PowerPoint conversion UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'from_pdf', 'pdf_to_powerpoint', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')


def pdf_to_word_index(request):
    """
    Serve the PDF to Word conversion UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'from_pdf', 'pdf_to_word', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')


def pdf_to_pdfa_index(request):
    """
    Serve the PDF to PDF/A conversion UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'from_pdf', 'pdf_to_pdfa', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')


def pdf_to_html_index(request):
    """
    Serve the PDF to HTML conversion UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'from_pdf', 'pdf_to_html', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')


@csrf_exempt
@require_http_methods(["POST"])
def analyze_pdf(request):
    """
    Analyze uploaded PDF and return page count and info.
    """
    try:
        if 'pdf_file' not in request.FILES:
            return JsonResponse({
                'error': 'No PDF file uploaded'
            }, status=400)

        pdf_file = request.FILES['pdf_file']

        # Validate file type
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({
                'error': 'File must be a PDF'
            }, status=400)

        # Get page count
        page_count = get_pdf_page_count(pdf_file)

        return JsonResponse({
            'page_count': page_count,
            'filename': pdf_file.name
        })

    except Exception as e:
        return JsonResponse({
            'error': f'Analysis failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_to_jpg_view(request):
    """
    API endpoint for PDF to JPG conversion.

    Accepts:
        - pdf_file: PDF file upload
        - page_range: Optional comma-separated page numbers (e.g., "1,3,5")
        - quality: Optional quality level ("low", "medium", "high", "ultra")

    Returns:
        Single JPG file (if 1 page) or ZIP file (if multiple pages)
    """
    try:
        # Validate file upload
        if 'pdf_file' not in request.FILES:
            return JsonResponse({
                'error': 'No PDF file uploaded'
            }, status=400)

        pdf_file = request.FILES['pdf_file']

        # Validate file type
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({
                'error': 'File must be a PDF'
            }, status=400)

        # Get conversion options
        options = {
            'page_range': request.POST.get('page_range', 'all'),
            'quality': request.POST.get('quality', 'medium'),
        }

        # Convert PDF to JPG
        converted_images = convert_pdf_to_jpg(pdf_file, options)

        # Smart download logic
        if len(converted_images) == 1:
            # Single page - return JPG directly
            filename, image_bytes = converted_images[0]
            response = HttpResponse(image_bytes, content_type='image/jpeg')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            # Multiple pages - return ZIP
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for filename, image_bytes in converted_images:
                    zip_file.writestr(filename, image_bytes)

            zip_buffer.seek(0)
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            zip_filename = pdf_file.name.replace('.pdf', '_converted.zip')
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'

        return response

    except ValueError as e:
        return JsonResponse({
            'error': str(e)
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': f'Conversion failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_to_excel_view(request):
    """
    API endpoint for PDF to Excel conversion.
    """
    try:
        if 'pdf_file' not in request.FILES:
            return JsonResponse({'error': 'No PDF file uploaded'}, status=400)

        pdf_file = request.FILES['pdf_file']
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        options = {
            'page_range': request.POST.get('page_range', 'all'),
            'format': request.POST.get('format', 'xlsx'),
        }

        converted_file = convert_pdf_to_excel(pdf_file, options)
        filename, file_bytes = converted_file

        response = HttpResponse(file_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_to_powerpoint_view(request):
    """
    API endpoint for PDF to PowerPoint conversion.
    """
    try:
        if 'pdf_file' not in request.FILES:
            return JsonResponse({'error': 'No PDF file uploaded'}, status=400)

        pdf_file = request.FILES['pdf_file']
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        options = {
            'page_range': request.POST.get('page_range', 'all'),
            'format': request.POST.get('format', 'pptx'),
        }

        converted_file = convert_pdf_to_powerpoint(pdf_file, options)
        filename, file_bytes = converted_file

        response = HttpResponse(file_bytes, content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_to_word_view(request):
    """
    API endpoint for PDF to Word conversion.
    """
    try:
        if 'pdf_file' not in request.FILES:
            return JsonResponse({'error': 'No PDF file uploaded'}, status=400)

        pdf_file = request.FILES['pdf_file']
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        options = {
            'page_range': request.POST.get('page_range', 'all'),
            'format': request.POST.get('format', 'docx'),
        }

        converted_file = convert_pdf_to_word(pdf_file, options)
        filename, file_bytes = converted_file

        response = HttpResponse(file_bytes, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_to_pdfa_view(request):
    """
    API endpoint for PDF to PDF/A conversion.
    """
    try:
        if 'pdf_file' not in request.FILES:
            return JsonResponse({'error': 'No PDF file uploaded'}, status=400)

        pdf_file = request.FILES['pdf_file']
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        options = {
            'page_range': request.POST.get('page_range', 'all'),
            'version': request.POST.get('format', 'pdfa-1b'),
        }

        converted_file = convert_pdf_to_pdfa(pdf_file, options)
        filename, file_bytes = converted_file

        response = HttpResponse(file_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_to_html_view(request):
    """
    API endpoint for PDF to HTML conversion.
    """
    try:
        if 'pdf_file' not in request.FILES:
            return JsonResponse({'error': 'No PDF file uploaded'}, status=400)

        pdf_file = request.FILES['pdf_file']
        if not pdf_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        options = {
            'page_range': request.POST.get('page_range', 'all'),
            'format': request.POST.get('format', 'html-single'),
        }

        converted_files = convert_pdf_to_html(pdf_file, options)

        if len(converted_files) == 1:
            filename, file_bytes = converted_files[0]
            response = HttpResponse(file_bytes, content_type='text/html')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for filename, file_bytes in converted_files:
                    zip_file.writestr(filename, file_bytes)
            zip_buffer.seek(0)
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            zip_filename = pdf_file.name.replace('.pdf', '_converted.zip')
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'

        return response

    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)
