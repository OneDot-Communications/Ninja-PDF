from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import os
import tempfile
from .repair_pdf import repair_pdf, validate_pdf
from .scan_to_pdf import scan_to_pdf, batch_scan_to_pdf


@csrf_exempt
@require_http_methods(["POST"])
def repair_pdf_api(request):
    """
    API endpoint to repair a corrupted PDF file.
    
    POST /api/v1/recovery/repair-pdf/
    
    Request:
        - file: PDF file (multipart/form-data)
    
    Response:
        - Repaired PDF file (application/pdf)
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    # Validate file extension
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    try:
        # Create temporary files for input and output
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as input_temp:
            # Write uploaded file to temp location
            for chunk in uploaded_file.chunks():
                input_temp.write(chunk)
            input_path = input_temp.name
        
        # Create output temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='_repaired.pdf') as output_temp:
            output_path = output_temp.name
        
        # Repair the PDF
        result = repair_pdf(input_path, output_path)
        
        # Read repaired PDF
        with open(output_path, 'rb') as repaired_file:
            pdf_data = repaired_file.read()
        
        # Clean up temporary files
        os.unlink(input_path)
        os.unlink(output_path)
        
        # Return repaired PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="repaired_{uploaded_file.name}"'
        response['X-Repair-Method'] = result['method']
        response['X-Pages-Count'] = str(result['pages'])
        
        return response
    
    except FileNotFoundError as e:
        return JsonResponse({'error': str(e)}, status=404)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=422)
    except Exception as e:
        # Clean up files if they exist
        try:
            if 'input_path' in locals():
                os.unlink(input_path)
            if 'output_path' in locals():
                os.unlink(output_path)
        except:
            pass
        
        return JsonResponse({'error': f'Repair failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def validate_pdf_api(request):
    """
    API endpoint to validate a PDF file without repairing it.
    
    POST /api/v1/recovery/validate-pdf/
    
    Request:
        - file: PDF file (multipart/form-data)
    
    Response:
        - JSON with validation results
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name
        
        # Validate PDF
        result = validate_pdf(temp_path)
        
        # Clean up
        os.unlink(temp_path)
        
        return JsonResponse({
            'filename': uploaded_file.name,
            'is_valid': result['is_valid'],
            'issues': result['issues'],
            'info': result['info']
        })
    
    except Exception as e:
        try:
            if 'temp_path' in locals():
                os.unlink(temp_path)
        except:
            pass
        
        return JsonResponse({'error': f'Validation failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def scan_to_pdf_api(request):
    """
    API endpoint to convert a scanned image to PDF.
    
    POST /api/v1/recovery/scan-to-pdf/
    
    Request:
        - file: Image file (multipart/form-data)
        - enhance: Optional, boolean (default: true)
        - deskew: Optional, boolean (default: true)
    
    Response:
        - PDF file (application/pdf)
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    # Validate file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']
    if not any(uploaded_file.name.lower().endswith(ext) for ext in allowed_extensions):
        return JsonResponse({
            'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'
        }, status=400)
    
    # Get optional parameters
    enhance = request.POST.get('enhance', 'true').lower() == 'true'
    deskew = request.POST.get('deskew', 'true').lower() == 'true'
    
    try:
        # Create temporary files
        file_extension = os.path.splitext(uploaded_file.name)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as input_temp:
            for chunk in uploaded_file.chunks():
                input_temp.write(chunk)
            input_path = input_temp.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as output_temp:
            output_path = output_temp.name
        
        # Convert image to PDF
        result = scan_to_pdf(input_path, output_path, enhance=enhance, deskew=deskew)
        
        # Read generated PDF
        with open(output_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
        
        # Clean up temporary files
        os.unlink(input_path)
        os.unlink(output_path)
        
        # Return PDF
        original_name = os.path.splitext(uploaded_file.name)[0]
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{original_name}.pdf"'
        response['X-Original-Size'] = f"{result['original_size'][0]}x{result['original_size'][1]}"
        response['X-Enhancements-Applied'] = str(result['enhancements_applied'])
        response['X-Deskew-Applied'] = str(result['deskew_applied'])
        
        return response
    
    except FileNotFoundError as e:
        return JsonResponse({'error': str(e)}, status=404)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=422)
    except Exception as e:
        # Clean up files if they exist
        try:
            if 'input_path' in locals():
                os.unlink(input_path)
            if 'output_path' in locals():
                os.unlink(output_path)
        except:
            pass
        
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def batch_scan_to_pdf_api(request):
    """
    API endpoint to convert multiple scanned images into a single PDF.
    
    POST /api/v1/recovery/batch-scan-to-pdf/
    
    Request:
        - files: Multiple image files (multipart/form-data)
    
    Response:
        - PDF file (application/pdf)
    """
    
    files = request.FILES.getlist('files')
    
    if not files:
        return JsonResponse({'error': 'No files provided'}, status=400)
    
    # Validate file extensions
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp']
    temp_paths = []
    
    try:
        # Save all uploaded files to temporary locations
        for uploaded_file in files:
            if not any(uploaded_file.name.lower().endswith(ext) for ext in allowed_extensions):
                return JsonResponse({
                    'error': f'Invalid file type: {uploaded_file.name}. Allowed: {", ".join(allowed_extensions)}'
                }, status=400)
            
            file_extension = os.path.splitext(uploaded_file.name)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
                temp_paths.append(temp_file.name)
        
        # Create output PDF path
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as output_temp:
            output_path = output_temp.name
        
        # Convert all images to single PDF
        result = batch_scan_to_pdf(temp_paths, output_path)
        
        # Read generated PDF
        with open(output_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
        
        # Clean up temporary files
        for temp_path in temp_paths:
            os.unlink(temp_path)
        os.unlink(output_path)
        
        # Return PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="scanned_document.pdf"'
        response['X-Pages-Count'] = str(result['pages'])
        
        return response
    
    except Exception as e:
        # Clean up files if they exist
        try:
            for temp_path in temp_paths:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            if 'output_path' in locals() and os.path.exists(output_path):
                os.unlink(output_path)
        except:
            pass
        
        return JsonResponse({'error': f'Batch conversion failed: {str(e)}'}, status=500)
