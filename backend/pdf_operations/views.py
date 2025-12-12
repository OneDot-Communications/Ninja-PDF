from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import os
import tempfile
import zipfile
from .merge_pdf import merge_pdfs, get_pdf_info
from .split_pdf import split_pdf, split_pdf_by_page_count
from .compare_pdf import compare_pdfs, get_text_differences


# Template views - All serve the static index.html
def merge_pdf_view(request):
    """Serve the static index.html"""
    static_file = os.path.join(settings.BASE_DIR, 'static', 'index.html')
    with open(static_file, 'r', encoding='utf-8') as f:
        return HttpResponse(f.read(), content_type='text/html')


def split_pdf_view(request):
    """Serve the static index.html"""
    static_file = os.path.join(settings.BASE_DIR, 'static', 'index.html')
    with open(static_file, 'r', encoding='utf-8') as f:
        return HttpResponse(f.read(), content_type='text/html')


def compare_pdf_view(request):
    """Serve the static index.html"""
    static_file = os.path.join(settings.BASE_DIR, 'static', 'index.html')
    with open(static_file, 'r', encoding='utf-8') as f:
        return HttpResponse(f.read(), content_type='text/html')


@csrf_exempt
@require_http_methods(["POST"])
def merge_pdf_api(request):
    """
    API endpoint to merge multiple PDF files.
    
    POST /api/v1/pdf-operations/merge-pdf/
    
    Request:
        - files: Multiple PDF files (multipart/form-data)
    
    Response:
        - Merged PDF file (application/pdf)
    """
    
    files = request.FILES.getlist('files')
    
    if not files:
        return JsonResponse({'error': 'No files provided'}, status=400)
    
    if len(files) < 2:
        return JsonResponse({'error': 'At least 2 PDF files are required for merging'}, status=400)
    
    # Validate all files are PDFs
    for uploaded_file in files:
        if not uploaded_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': f'Invalid file type: {uploaded_file.name}. Only PDF files are accepted.'}, status=400)
    
    temp_files = []
    
    try:
        # Save uploaded files to temp location
        for uploaded_file in files:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_file.close()
            temp_files.append(temp_file.name)
        
        # Create output temp file
        output_temp = tempfile.NamedTemporaryFile(delete=False, suffix='_merged.pdf')
        output_path = output_temp.name
        output_temp.close()
        
        # Merge PDFs
        result = merge_pdfs(temp_files, output_path)
        
        # Read merged PDF
        with open(output_path, 'rb') as merged_file:
            pdf_data = merged_file.read()
        
        # Clean up temp files
        for temp_file in temp_files:
            os.unlink(temp_file)
        os.unlink(output_path)
        
        # Return merged PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="merged.pdf"'
        response['X-Total-Files'] = str(result['total_files'])
        response['X-Total-Pages'] = str(result['total_pages'])
        
        return response
    
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except FileNotFoundError as e:
        return JsonResponse({'error': str(e)}, status=404)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=422)
    except Exception as e:
        return JsonResponse({'error': f'Merge failed: {str(e)}'}, status=500)
    finally:
        # Clean up any remaining temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except:
                pass


@csrf_exempt
@require_http_methods(["POST"])
def split_pdf_api(request):
    """
    API endpoint to split a PDF file.
    
    POST /api/v1/pdf-operations/split-pdf/
    
    Request:
        - file: PDF file (multipart/form-data)
        - mode: 'every' | 'pages' | 'ranges' | 'chunks' (default: 'every')
        - pages: Comma-separated page numbers (for mode='pages'), e.g., "1,3,5"
        - ranges: JSON array of ranges (for mode='ranges'), e.g., [[1,5],[6,10]]
        - pages_per_file: Number of pages per file (for mode='chunks')
    
    Response:
        - ZIP file containing split PDFs (application/zip)
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    # Get split parameters
    mode = request.POST.get('mode', 'every')
    
    try:
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as input_temp:
            for chunk in uploaded_file.chunks():
                input_temp.write(chunk)
            input_path = input_temp.name
        
        # Create output directory
        output_dir = tempfile.mkdtemp()
        
        # Split PDF based on mode
        if mode == 'every':
            result = split_pdf(input_path, output_dir, split_mode='every')
        
        elif mode == 'pages':
            pages_str = request.POST.get('pages', '')
            if not pages_str:
                return JsonResponse({'error': 'Page numbers required for pages mode'}, status=400)
            
            pages = [int(p.strip()) for p in pages_str.split(',')]
            result = split_pdf(input_path, output_dir, split_mode='pages', pages=pages)
        
        elif mode == 'ranges':
            import json
            ranges_str = request.POST.get('ranges', '')
            if not ranges_str:
                return JsonResponse({'error': 'Page ranges required for ranges mode'}, status=400)
            
            ranges = json.loads(ranges_str)
            result = split_pdf(input_path, output_dir, split_mode='ranges', ranges=ranges)
        
        elif mode == 'chunks':
            pages_per_file = int(request.POST.get('pages_per_file', 1))
            result = split_pdf_by_page_count(input_path, output_dir, pages_per_file)
        
        else:
            return JsonResponse({'error': f'Invalid split mode: {mode}'}, status=400)
        
        # Create ZIP file
        zip_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        zip_path = zip_temp.name
        zip_temp.close()
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for output_file in result['output_files']:
                zipf.write(output_file, os.path.basename(output_file))
        
        # Read ZIP data
        with open(zip_path, 'rb') as zip_file:
            zip_data = zip_file.read()
        
        # Clean up
        os.unlink(input_path)
        for output_file in result['output_files']:
            os.unlink(output_file)
        os.rmdir(output_dir)
        os.unlink(zip_path)
        
        # Return ZIP
        original_name = os.path.splitext(uploaded_file.name)[0]
        response = HttpResponse(zip_data, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{original_name}_split.zip"'
        response['X-Files-Created'] = str(result['files_created'])
        response['X-Total-Pages'] = str(result['total_pages'])
        
        return response
    
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except FileNotFoundError as e:
        return JsonResponse({'error': str(e)}, status=404)
    except RuntimeError as e:
        return JsonResponse({'error': str(e)}, status=422)
    except Exception as e:
        return JsonResponse({'error': f'Split failed: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def pdf_info_api(request):
    """
    API endpoint to get PDF information.
    
    POST /api/v1/pdf-operations/pdf-info/
    
    Request:
        - file: PDF file (multipart/form-data)
    
    Response:
        - JSON with PDF information
    """
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    if not uploaded_file.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Invalid file type. Only PDF files are accepted.'}, status=400)
    
    try:
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name
        
        # Get PDF info
        info = get_pdf_info(temp_path)
        
        # Clean up
        os.unlink(temp_path)
        
        return JsonResponse({
            'filename': uploaded_file.name,
            'pages': info['pages'],
            'is_encrypted': info['is_encrypted'],
            'metadata': info['metadata']
        })
    
    except Exception as e:
        try:
            if 'temp_path' in locals():
                os.unlink(temp_path)
        except:
            pass
        
        return JsonResponse({'error': f'Failed to read PDF info: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def compare_pdf_api(request):
    """
    API endpoint to compare two PDF files.
    
    POST /api/v1/pdf-operations/compare-pdf/
    
    Request:
        - file1: First PDF file (multipart/form-data)
        - file2: Second PDF file (multipart/form-data)
    
    Response:
        - Comparison PDF file showing both documents side by side
    """
    
    if 'file1' not in request.FILES or 'file2' not in request.FILES:
        return JsonResponse({'error': 'Two PDF files required'}, status=400)
    
    file1 = request.FILES['file1']
    file2 = request.FILES['file2']
    
    if not file1.name.lower().endswith('.pdf') or not file2.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'Both files must be PDFs'}, status=400)
    
    temp1 = None
    temp2 = None
    temp_output = None
    
    try:
        # Save first PDF
        temp1 = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        for chunk in file1.chunks():
            temp1.write(chunk)
        temp1.close()
        
        # Save second PDF
        temp2 = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        for chunk in file2.chunks():
            temp2.write(chunk)
        temp2.close()
        
        # Create output file
        temp_output = tempfile.NamedTemporaryFile(delete=False, suffix='_comparison.pdf')
        output_path = temp_output.name
        temp_output.close()
        
        # Compare PDFs
        result = compare_pdfs(temp1.name, temp2.name, output_path)
        
        if not result['success']:
            return JsonResponse({'error': result.get('message', 'Comparison failed')}, status=500)
        
        # Read comparison PDF
        with open(output_path, 'rb') as comp_file:
            pdf_data = comp_file.read()
        
        # Return comparison PDF
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="comparison_{file1.name}"'
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
        
    finally:
        # Clean up temp files
        for temp_file in [temp1, temp2]:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
        if temp_output and os.path.exists(output_path):
            try:
                os.unlink(output_path)
            except:
                pass
