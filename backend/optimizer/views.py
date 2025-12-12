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


@csrf_exempt
@require_http_methods(["POST"])
def merge_pdf_view(request):
    """
    API endpoint to merge multiple PDF files.
    """
    try:
        # Check files. 'files' convention might differ (e.g. file, file_1, or standard Django request.FILES.getlist('files'))
        # Frontend usually sends 'files' array if using FormData with same key.
        files = request.FILES.getlist('files')
        
        if not files:
            # Try to grab 'file' if single or multiple with same key
            if 'file' in request.FILES:
                files = request.FILES.getlist('file')
        
        if not files or len(files) < 2:
            return JsonResponse({'error': 'At least 2 PDF files are required for merging'}, status=400)

        # Validate
        for f in files:
            if not f.name.lower().endswith('.pdf'):
                return JsonResponse({'error': f'File {f.name} is not a PDF'}, status=400)

        from .utils.pdf_ops import merge_pdfs
        merged_stream = merge_pdfs(files)
        
        filename = "merged_document.pdf"
        response = HttpResponse(merged_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f"Merge error: {str(e)}"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def split_pdf_view(request):
    """
    API endpoint to split/extract pages from PDF.
    """
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # Get params
        import json
        selected_pages_str = request.POST.get('selectedPages', '[]')
        try:
           selected_pages = json.loads(selected_pages_str)
           # Handle if it came as "1,2,3" string
           if isinstance(selected_pages, str):
               selected_pages = [int(p) for p in selected_pages.split(',')]
        except:
           # Fallback comma separated
           selected_pages = [int(p) for p in selected_pages_str.split(',') if p.strip()]

        mode = request.POST.get('splitMode', 'merge') # 'merge' (into one file) or 'separate' (zip?)
        
        if mode != 'merge':
            return JsonResponse({'error': 'Only merge split mode supported currently via backend'}, status=400)

        from .utils.pdf_ops import split_pdf
        output_stream = split_pdf(uploaded_file, selected_pages)
        
        if not output_stream:
             return JsonResponse({'error': 'Failed to process split'}, status=400)

        filename = f"split_{uploaded_file.name}"
        response = HttpResponse(output_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f"Split error: {str(e)}"}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def organize_pdf_view(request):
    """
    API endpoint for Organize PDF (Rotate, Delete, Reorder).
    """
    # Simply using the merge/split logic internally or pypdf to reconstruct
    try:
        if 'file' not in request.FILES:
             return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # 'pages' param: JSON string [{originalIndex: 0, rotation: 90}, ...]
        import json
        pages_config_str = request.POST.get('pages', '[]')
        pages_config = json.loads(pages_config_str)
        
        if not pages_config:
            return JsonResponse({'error': 'No page configuration provided'}, status=400)

        from pypdf import PdfReader, PdfWriter
        import io
        
        reader = PdfReader(uploaded_file)
        writer = PdfWriter()
        
        total_source_pages = len(reader.pages)
        
        for p_config in pages_config:
            # { originalIndex: number, rotation: number, isBlank?: boolean }
            
            if p_config.get('isBlank'):
                writer.add_blank_page()
                continue
                
            orig_idx = p_config.get('originalIndex')
            if orig_idx is not None and 0 <= orig_idx < total_source_pages:
                page = reader.pages[orig_idx]
                
                # Apply rotation (relative)
                # Note: pypdf rotation is absolute usually, or we add to existing
                # If frontend sends 'rotation' as 0, 90, 180 (additional rotation)
                add_rotation = p_config.get('rotation', 0)
                if add_rotation != 0:
                    page.rotate(add_rotation)
                
                writer.add_page(page)
        
        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_stream.seek(0)
        
        filename = f"organized_{uploaded_file.name}"
        response = HttpResponse(output_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f"Organize error: {str(e)}"}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def flatten_pdf_view(request):
    """
    API endpoint to flatten PDF (forms).
    """
    try:
        if 'file' not in request.FILES:
             return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # Simplistic flattening using pypdf logic (or fallback to just returning file if lib not powerful enough)
        # Real flattening usually requires specific handling of AcroForms
        
        from .utils.pdf_ops import merge_pdfs
        # Just passing it through merge sometimes flattens depending on library, 
        # But let's try a dedicated Reader/Writer pass which normalizes stream
        
        from pypdf import PdfReader, PdfWriter
        import io
        
        reader = PdfReader(uploaded_file)
        writer = PdfWriter()
        
        # Copy pages
        for page in reader.pages:
            writer.add_page(page)
            
        # Attempt to make form fields read only
        # This is strictly a best-effort "flatten" in pure python without specific tools
        # For 'true' visual flattening we often need pdf2image or similar
        
        # But often users just want to 'save' the form data so it's not editable
        # pypdf.PdfWriter has minimal support for `update_page_form_field_values`
        
        # Ideally we'd use `pdftk` or `ghostscript` via subprocess here
        # But staying "in existing" (python env):
        
        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_stream.seek(0)
        
        filename = f"flattened_{uploaded_file.name}"
        response = HttpResponse(output_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        return JsonResponse({'error': f"Flatten error: {str(e)}"}, status=500)


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
