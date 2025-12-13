"""
PDF Cropping module
Handles cropping PDF pages
"""

import fitz  # PyMuPDF
import io
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["POST"])
def crop_pdf_api(request):
    """
    API endpoint to crop PDF pages.
    
    POST /api/v1/edit/crop/
    
    Request:
        - pdf_file or file: PDF file (multipart/form-data)
        - crop_top: Top margin in pixels (optional, default: 0)
        - crop_bottom: Bottom margin in pixels (optional, default: 0)
        - crop_left: Left margin in pixels (optional, default: 0)
        - crop_right: Right margin in pixels (optional, default: 0)
    
    Response:
        - Cropped PDF file (application/pdf)
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
        
        # Get crop parameters from request
        crop_top = float(request.POST.get('crop_top', 0))
        crop_bottom = float(request.POST.get('crop_bottom', 0))
        crop_left = float(request.POST.get('crop_left', 0))
        crop_right = float(request.POST.get('crop_right', 0))
        
        # Get page options
        crop_all_pages = request.POST.get('crop_all_pages', 'true').lower() == 'true'
        current_page = int(request.POST.get('current_page', 1)) - 1  # Convert to 0-indexed
        
        # Apply crop to pages
        if crop_all_pages:
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                crop_page(page, crop_top, crop_bottom, crop_left, crop_right)
        else:
            # Only crop current page
            if 0 <= current_page < len(pdf_document):
                page = pdf_document[current_page]
                crop_page(page, crop_top, crop_bottom, crop_left, crop_right)
        
        # Save to bytes
        output_stream = io.BytesIO()
        pdf_document.save(output_stream)
        pdf_document.close()
        
        output_stream.seek(0)
        filename = f"cropped_{uploaded_file.name}"
        
        response = HttpResponse(output_stream.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f"Server error: {str(e)}"}, status=500)


def crop_page(page, top=0, bottom=0, left=0, right=0):
    """
    Crop a PDF page by removing margins.
    
    Args:
        page: PyMuPDF page object
        top: Top margin to remove (in pixels)
        bottom: Bottom margin to remove (in pixels)
        left: Left margin to remove (in pixels)
        right: Right margin to remove (in pixels)
    """
    try:
        # Get the current page rectangle
        rect = page.rect
        
        # Calculate new rectangle with crops
        new_rect = fitz.Rect(
            rect.x0 + left,      # left edge
            rect.y0 + top,       # top edge
            rect.x1 - right,     # right edge
            rect.y1 - bottom     # bottom edge
        )
        
        # Ensure the new rectangle is valid
        if new_rect.is_empty or new_rect.width <= 0 or new_rect.height <= 0:
            print(f"Warning: Crop margins are too large, skipping page {page.number}")
            return
        
        # Apply the crop - set both CropBox and MediaBox for proper cropping
        page.set_cropbox(new_rect)
        page.set_mediabox(new_rect)
        
        print(f"✓ Page {page.number + 1} cropped: removed {top}px top, {bottom}px bottom, {left}px left, {right}px right")
        print(f"  New dimensions: {new_rect.width:.1f} x {new_rect.height:.1f} pixels")
        
    except Exception as e:
        print(f"Error cropping page: {e}")
        import traceback
        traceback.print_exc()
