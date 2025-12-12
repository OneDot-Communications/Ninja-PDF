from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import os
import tempfile
from .protect_pdf import protect_pdf, unlock_pdf


@csrf_exempt
@require_http_methods(["POST"])
def protect_pdf_api(request):
    """
    API endpoint to protect a PDF with password.
    
    POST /api/v1/security/protect-pdf/
    
    Request:
        - file: PDF file (multipart/form-data)
        - password: User password (required)
        - owner_password: Owner password (optional)
    
    Response:
        - Protected PDF file (application/pdf)
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    if 'password' not in request.POST:
        return JsonResponse({'error': 'Password is required'}, status=400)
    
    uploaded_file = request.FILES['file']
    password = request.POST['password']
    owner_password = request.POST.get('owner_password', None)
    
    # Validate file extension
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    # Validate password
    if len(password) < 4:
        return JsonResponse({'error': 'Password must be at least 4 characters long'}, status=400)
    
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as input_temp:
            for chunk in uploaded_file.chunks():
                input_temp.write(chunk)
            input_path = input_temp.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='_protected.pdf') as output_temp:
            output_path = output_temp.name
        
        # Protect the PDF
        result = protect_pdf(input_path, output_path, password, owner_password)
        
        # Read protected PDF
        with open(output_path, 'rb') as protected_file:
            pdf_data = protected_file.read()
        
        # Clean up temporary files
        os.unlink(input_path)
        os.unlink(output_path)
        
        # Return protected PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="protected_{uploaded_file.name}"'
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
        
        return JsonResponse({'error': f'Protection failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def unlock_pdf_api(request):
    """
    API endpoint to unlock a password-protected PDF.
    
    POST /api/v1/security/unlock-pdf/
    
    Request:
        - file: Protected PDF file (multipart/form-data)
        - password: Password to unlock the PDF
    
    Response:
        - Unlocked PDF file (application/pdf)
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    if 'password' not in request.POST:
        return JsonResponse({'error': 'Password is required'}, status=400)
    
    uploaded_file = request.FILES['file']
    password = request.POST['password']
    
    # Validate file extension
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as input_temp:
            for chunk in uploaded_file.chunks():
                input_temp.write(chunk)
            input_path = input_temp.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='_unlocked.pdf') as output_temp:
            output_path = output_temp.name
        
        # Unlock the PDF
        result = unlock_pdf(input_path, output_path, password)
        
        # Read unlocked PDF
        with open(output_path, 'rb') as unlocked_file:
            pdf_data = unlocked_file.read()
        
        # Clean up temporary files
        os.unlink(input_path)
        os.unlink(output_path)
        
        # Return unlocked PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="unlocked_{uploaded_file.name}"'
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
        
        return JsonResponse({'error': f'Unlock failed: {str(e)}'}, status=500)
