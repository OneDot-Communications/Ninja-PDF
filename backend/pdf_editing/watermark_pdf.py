"""
PDF Watermarking module
Handles adding watermarks to PDF files
"""

import fitz  # PyMuPDF
import io
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["POST"])
def watermark_pdf_api(request):
    """
    API endpoint to add watermark to PDF.
    
    POST /api/v1/edit/watermark/
    
    Request:
        - pdf_file or file: PDF file (multipart/form-data)
        - watermark_text: Text to use as watermark (optional, default: 'WATERMARK')
        - watermark_opacity: Opacity (0-1, optional, default: 0.3)
        - watermark_color: Color as hex (optional, default: 'FF0000' for red)
        - watermark_rotation: Rotation angle (optional, default: 45)
    
    Response:
        - Watermarked PDF file (application/pdf)
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
        
        # Get watermark parameters from request
        watermark_text = request.POST.get('watermark_text', 'WATERMARK')
        watermark_opacity = float(request.POST.get('watermark_opacity', 0.3))
        watermark_color = request.POST.get('watermark_color', 'FF0000')  # Red
        watermark_rotation = float(request.POST.get('watermark_rotation', 45))
        
        # Convert hex color to RGB tuple (0-1 range)
        try:
            color_rgb = tuple(int(watermark_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
        except:
            color_rgb = (1, 0, 0)  # Default to red
        
        # Apply watermark to all pages
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            add_text_watermark(page, watermark_text, color_rgb, watermark_rotation, watermark_opacity)
        
        # Save to bytes
        output_stream = io.BytesIO()
        pdf_document.save(output_stream)
        pdf_document.close()
        
        output_stream.seek(0)
        filename = f"watermarked_{uploaded_file.name}"
        
        response = HttpResponse(output_stream.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f"Server error: {str(e)}"}, status=500)


def add_text_watermark(page, text, color=(1, 0, 0), rotation=45, opacity=0.3):
    """
    Add text watermark to a PDF page.
    
    Args:
        page: PyMuPDF page object
        text: Watermark text
        color: Color as RGB tuple (0-1 range)
        rotation: Rotation angle in degrees
        opacity: Opacity (0-1)
    """
    import fitz
    
    rect = page.rect
    fontsize = 60
    
    # Get page dimensions
    page_width = rect.width
    page_height = rect.height
    
    # Center coordinates
    center_x = page_width / 2
    center_y = page_height / 2
    
    # Calculate text positioning
    text_length = fitz.get_text_length(text, fontname="helv", fontsize=fontsize)
    text_x = center_x - text_length / 2
    text_y = center_y
    
    # Draw watermark text - PyMuPDF insert_text doesn't support alpha directly
    # But we can use set_opacity before drawing
    
    # Add text at center of page
    # For rotation, use the rotate parameter (must be 0, 90, 180, 270)
    rot_value = 0
    if 22.5 <= abs(rotation) < 67.5:
        rot_value = 0  # Keep horizontal but we'll handle it differently
    elif 67.5 <= abs(rotation) < 112.5:
        rot_value = 90
    elif 112.5 <= abs(rotation) < 157.5:
        rot_value = 180
    elif 157.5 <= abs(rotation) <= 180:
        rot_value = 180
    
    # Insert the main centered watermark
    page.insert_text(
        (text_x, text_y),
        text,
        fontsize=fontsize,
        fontname="helv",
        color=color,
        rotate=rot_value
    )
    
    # Add a diagonal pattern of watermarks for better coverage
    smaller_fontsize = 40
    for row in range(0, int(page_height) + 100, 200):
        for col in range(-100, int(page_width) + 100, 350):
            try:
                page.insert_text(
                    (col, row),
                    text,
                    fontsize=smaller_fontsize,
                    fontname="helv",
                    color=color,
                    rotate=0
                )
            except:
                pass
    
    print(f"✓ Watermark added: '{text}' in color {color}")


def insert_watermark_text(page, text, opacity=0.3, color=(1, 0, 0), rotation=45):
    """
    Insert text watermark on a PDF page using PyMuPDF.
    
    Args:
        page: PyMuPDF page object
        text: Watermark text
        opacity: Watermark opacity (0-1)
        color: Text color as tuple (r, g, b) in range 0-1
        rotation: Rotation angle in degrees
    """
    try:
        # Get page dimensions
        rect = page.rect
        center_x = rect.width / 2
        center_y = rect.height / 2
        
        # Create a transformation matrix with rotation
        matrix = fitz.Matrix(1, 1).rotate(rotation)
        
        # Insert text with transparency
        page.insert_text(
            point=(center_x, center_y),
            text=text,
            fontsize=100,
            fontname="helv",
            color=color,
            render_mode=3,  # Transparent mode
            matrix=matrix,
        )
        
    except Exception as e:
        print(f"Error inserting watermark: {e}")


def add_watermark_server_side(pdf_path, output_path, watermark_text, opacity=0.3):
    """
    Server-side function to add watermark to PDF (if needed).
    
    Args:
        pdf_path: Path to input PDF
        output_path: Path to output PDF
        watermark_text: Text to use as watermark
        opacity: Opacity level (0-1)
    """
    try:
        pdf_doc = fitz.open(pdf_path)
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            insert_watermark_text(page, watermark_text, opacity=opacity)
        
        pdf_doc.save(output_path)
        pdf_doc.close()
        
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
