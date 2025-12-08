from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .compress_pdf.compress_pdf import compress_pdf
from .compress_image.compress_image import compress_image

@csrf_exempt
@require_http_methods(["POST"])
def compress_pdf_view(request):
    """
    API endpoint to compress PDF files.
    """
    try:
        if 'file' not in request.FILES:
             return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        if not uploaded_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        level = request.POST.get('level', 'recommended')
        
        # Process
        compressed_stream = compress_pdf(uploaded_file, level)
        
        # Return file
        filename = f"optimized_{uploaded_file.name}"
        response = HttpResponse(compressed_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f"Server error: {str(e)}"}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def compress_image_view(request):
    """
    API endpoint to compress Image files.
    """
    try:
        if 'file' not in request.FILES:
             return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        # Basic validation (Pillow will also validate on open)
        if not uploaded_file.name.lower().endswith(('.jpg', '.jpeg', '.png')):
             return JsonResponse({'error': 'File must be a supported image (JPG, PNG)'}, status=400)

        level = request.POST.get('level', 'recommended')

        # Process
        compressed_stream, mime_type = compress_image(uploaded_file, uploaded_file.name, level)
        
        # Return file
        filename = f"optimized_{uploaded_file.name}"
        response = HttpResponse(compressed_stream, content_type=mime_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ValueError as e:
         return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f"Server error: {str(e)}"}, status=500)


def compress_pdf_index(request):
    """
    Serve the Compress PDF UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'optimizer', 'compress_pdf', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')


def compress_image_index(request):
    """
    Serve the Image Compression UI.
    """
    import os
    from django.conf import settings
    
    html_path = os.path.join(settings.BASE_DIR, 'optimizer', 'compress_image', 'index.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return HttpResponse(html_content, content_type='text/html')
