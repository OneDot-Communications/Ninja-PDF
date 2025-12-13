"""
PDF Rotation module
Handles rotating PDF pages
"""

import fitz  # PyMuPDF
import io
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["POST"])
def rotate_pdf_api(request):
    """
    API endpoint to rotate PDF pages.
    
    POST /api/v1/edit/rotate/
    
    Request:
        - pdf_file or file: PDF file (multipart/form-data)
        - rotation: Rotation angle in degrees (90, 180, 270, or -90)
        - pages: Which pages to rotate - "all" or specific page numbers (optional, default: "all")
    
    Response:
        - Rotated PDF file (application/pdf)
    """
    
    try:
        # Check if file exists - try both field names
        if 'pdf_file' in request.FILES:
            uploaded_file = request.FILES['pdf_file']
        elif 'file' in request.FILES:
            uploaded_file = request.FILES['file']
        else:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        # Validate PDF
        if not uploaded_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)
        
        # Read the PDF bytes
        pdf_bytes = uploaded_file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Get rotation parameter
        rotation = int(request.POST.get('rotation', 90))
        
        # Validate rotation (must be multiple of 90)
        if rotation % 90 != 0:
            return JsonResponse({'error': 'Rotation must be a multiple of 90 degrees'}, status=400)
        
        # Normalize rotation to 0-360 range
        rotation = rotation % 360
        
        # Get pages parameter
        pages_param = request.POST.get('pages', 'all')
        
        # Rotate pages
        if pages_param == 'all':
            # Rotate all pages
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                page.set_rotation(rotation)
                print(f"✓ Rotated page {page_num + 1} by {rotation}°")
        else:
            # Parse specific pages
            try:
                page_numbers = [int(p.strip()) for p in pages_param.split(',')]
                for page_num in page_numbers:
                    if 1 <= page_num <= len(pdf_document):
                        page = pdf_document[page_num - 1]  # Convert to 0-indexed
                        page.set_rotation(rotation)
                        print(f"✓ Rotated page {page_num} by {rotation}°")
            except ValueError:
                return JsonResponse({'error': 'Invalid page numbers format'}, status=400)
        
        # Save to bytes
        output_stream = io.BytesIO()
        pdf_document.save(output_stream)
        pdf_document.close()
        
        output_stream.seek(0)
        filename = f"rotated_{uploaded_file.name}"
        
        response = HttpResponse(output_stream.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f"Server error: {str(e)}"}, status=500)
