import os
import tempfile
import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from io import BytesIO
import fitz  # PyMuPDF for text search and positioning


@csrf_exempt
@require_http_methods(["POST"])
def redact_pdf_api(request):
    """Redact text/areas from PDF.

    Request:
        - file: PDF file
        - search_word: Word/text to find and redact (optional)
        - case_sensitive: Boolean for case sensitivity (default: False)
        - redactions: JSON array of redaction objects (optional, for manual/area redaction)
          Each redaction: {page, type, x, y, width, height, color}

    Response: PDF with redacted content
    """
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'PDF file is required'}, status=400)

    uploaded = request.FILES['file']
    if not uploaded.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'File must be a PDF'}, status=400)

    search_word = request.POST.get('search_word', '').strip()
    case_sensitive = request.POST.get('case_sensitive', 'false').lower() == 'true'
    redactions_json = request.POST.get('redactions', '[]')
    
    try:
        redactions = json.loads(redactions_json)
    except json.JSONDecodeError:
        redactions = []

    temp_in = None
    temp_out_path = None
    try:
        # Save incoming file
        temp_in = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        for chunk in uploaded.chunks():
            temp_in.write(chunk)
        temp_in.close()

        # If search_word provided, find and redact all instances
        if search_word:
            temp_out_path = _redact_by_search_word(temp_in.name, search_word, case_sensitive)
        else:
            # Use manual redactions if provided (or return original if none)
            if redactions:
                temp_out_path = _redact_by_coordinates(temp_in.name, redactions)
            else:
                # No search word or redactions - return original file
                temp_out_path = temp_in.name

        with open(temp_out_path, 'rb') as f_out:
            pdf_bytes = f_out.read()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="redacted_{uploaded.name}"'
        return response

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Redact PDF Error: {error_detail}")
        return JsonResponse({'error': str(e), 'detail': error_detail}, status=500)

    finally:
        for tmp_path in [temp_in and temp_in.name, temp_out_path]:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass


def _redact_by_search_word(pdf_path, search_word, case_sensitive=False):
    """Find all instances of a word in PDF and blur them.
    
    Returns the path to the redacted PDF.
    """
    from PIL import Image, ImageFilter
    import io
    
    # Open PDF with PyMuPDF to search for text
    doc = fitz.open(pdf_path)
    
    # Search flags for case sensitivity
    search_flags = 0 if case_sensitive else fitz.TEXT_PRESERVE_WHITESPACE
    
    # Find and blur all occurrences page by page
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Search for all instances of the word on this page
        text_instances = page.search_for(search_word, flags=search_flags)
        
        if not text_instances:
            continue
            
        # For each text instance, extract the area, blur it, and paste it back
        for rect in text_instances:
            # Add padding to ensure full coverage
            blur_rect = fitz.Rect(rect.x0 - 2, rect.y0 - 2, rect.x1 + 2, rect.y1 + 2)
            
            # Clip to page bounds
            blur_rect = blur_rect & page.rect
            
            if blur_rect.is_empty:
                continue
            
            try:
                # Extract the area as a pixmap (image)
                # Use higher resolution for better blur quality
                mat = fitz.Matrix(3, 3)  # 3x scale for better quality
                pix = page.get_pixmap(matrix=mat, clip=blur_rect)
                
                # Convert to PIL Image
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                
                # Apply multiple strong Gaussian blur passes for maximum blur
                blurred_img = img.filter(ImageFilter.GaussianBlur(radius=15))
                blurred_img = blurred_img.filter(ImageFilter.GaussianBlur(radius=15))
                blurred_img = blurred_img.filter(ImageFilter.GaussianBlur(radius=10))
                
                # Convert back to bytes
                img_buffer = io.BytesIO()
                blurred_img.save(img_buffer, format='PNG')
                img_buffer.seek(0)
                
                # Insert the blurred image back onto the page
                # First, draw a white rectangle to cover the original text
                page.draw_rect(blur_rect, color=(1, 1, 1), fill=(1, 1, 1), width=0)
                
                # Insert the blurred image
                page.insert_image(blur_rect, stream=img_buffer.getvalue())
                
                print(f"✓ Blurred '{search_word}' at page {page_num + 1}, rect {blur_rect}")
                
            except Exception as e:
                print(f"Error blurring text: {e}")
                # Fallback: draw a semi-transparent gray box
                page.draw_rect(blur_rect, color=(0.7, 0.7, 0.7), fill=(0.85, 0.85, 0.85), width=0)
    
    # Save redacted PDF
    temp_out = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_out.close()
    doc.save(temp_out.name)
    doc.close()
    
    return temp_out.name


def _redact_by_coordinates(pdf_path, redactions):
    """Apply area-based redactions to PDF using coordinates.
    
    Returns the path to the redacted PDF.
    """
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    
    # Copy all pages
    for page in reader.pages:
        writer.add_page(page)
    
    # Apply coordinate-based redactions
    for redaction in redactions:
        page_idx = redaction.get('page', 1) - 1
        if page_idx < 0 or page_idx >= len(writer.pages):
            continue
        
        page = writer.pages[page_idx]
        mediabox = page.mediabox
        page_width = float(mediabox.width)
        page_height = float(mediabox.height)
        
        # Convert percentage to PDF coordinates
        x = float(redaction.get('x', 0)) * page_width / 100
        y = float(redaction.get('y', 0)) * page_height / 100
        width = float(redaction.get('width', 10)) * page_width / 100
        height = float(redaction.get('height', 10)) * page_height / 100
        
        color = redaction.get('color', '#000000')
        opacity = float(redaction.get('opacity', 1.0))
        
        # Create overlay with black box
        overlay_buffer = BytesIO()
        c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
        
        hex_color = color.lstrip('#')
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        c.setFillColor(r, g, b, opacity)
        
        rect_y = page_height - y - height
        c.rect(x, rect_y, width, height, fill=1, stroke=0)
        c.save()
        
        overlay_buffer.seek(0)
        overlay_reader = PdfReader(overlay_buffer)
        overlay_page = overlay_reader.pages[0]
        page.merge_page(overlay_page)
    
    # Save redacted PDF
    temp_out = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_out.close()
    with open(temp_out.name, 'wb') as f:
        writer.write(f)
    
    return temp_out.name
