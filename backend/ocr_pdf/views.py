from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import os
import tempfile
from .ocr_processor import extract_text_from_pdf_pages


def ocr_pdf_view(request):
    """Serve the static index.html"""
    static_file = os.path.join(settings.BASE_DIR, 'static', 'index.html')
    with open(static_file, 'r', encoding='utf-8') as f:
        return HttpResponse(f.read(), content_type='text/html')


@csrf_exempt
@require_http_methods(["POST"])
def ocr_pdf_api(request):
    """
    API endpoint to extract text from a PDF file.
    
    POST /api/v1/ocr/process/
    
    Request:
        - file: PDF file (multipart/form-data)
    
    Response:
        - Plain text file with extracted text
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    temp_input = None
    
    try:
        # Save uploaded file to temp location
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        for chunk in uploaded_file.chunks():
            temp_input.write(chunk)
        temp_input.close()
        
        # Extract text from PDF
        result = extract_text_from_pdf_pages(temp_input.name)
        
        if not result['success']:
            error_message = result.get('message', 'Text extraction failed')
            if result.get('error'):
                error_message = f"{result['error']}: {error_message}"
            return JsonResponse({'error': error_message}, status=500)
        
        # Return extracted text as plain text file
        text_data = result['text'].encode('utf-8')
        response = HttpResponse(text_data, content_type='text/plain; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="extracted-text-{uploaded_file.name}.txt"'
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
        
    finally:
        # Clean up temp file
        if temp_input and os.path.exists(temp_input.name):
            os.unlink(temp_input.name)


@csrf_exempt
@require_http_methods(["POST"])
def extract_text_api(request):
    """
    API endpoint to extract text from a PDF and return as JSON.
    
    POST /api/v1/ocr/extract-text/
    
    Request:
        - file: PDF file (multipart/form-data)
    
    Response:
        - JSON with extracted text
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    temp_file = None
    
    try:
        # Save uploaded file to temp location
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        for chunk in uploaded_file.chunks():
            temp_file.write(chunk)
        temp_file.close()
        
        # Extract text
        result = extract_text_from_pdf_pages(temp_file.name)
        
        if not result['success']:
            return JsonResponse({
                'success': False,
                'error': result.get('error', 'Unknown error'),
                'message': result.get('message', 'Text extraction failed')
            }, status=500)
        
        return JsonResponse({
            'success': True,
            'text': result['text'],
            'page_count': result['page_count'],
            'filename': uploaded_file.name
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
        
    finally:
        # Clean up temp file
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
