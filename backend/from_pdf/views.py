from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import io
import zipfile
from .pdf_to_jpg.pdf_to_jpg import convert_pdf_to_jpg, get_pdf_page_count


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
