import os
import tempfile
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pypdf import PdfReader, PdfWriter


def _parse_order(order_str, total_pages):
    """Parse comma-separated 1-based page order into zero-based indices."""
    parts = [p.strip() for p in order_str.split(',') if p.strip()]
    if not parts:
        return None, "Order list is empty"
    try:
        indices = [int(p) - 1 for p in parts]
    except ValueError:
        return None, "Order must be comma-separated integers"
    if any(i < 0 or i >= total_pages for i in indices):
        return None, "Order contains page numbers out of range"
    return indices, None


@csrf_exempt
@require_http_methods(["POST"])
def organize_pdf_api(request):
    """Reorder PDF pages based on optional 'order' (comma-separated 1-based).

    Request:
        - file: PDF file
        - order: optional comma-separated list of page numbers (1-based)

    Response: PDF with pages in the requested order (or original order if absent)
    """
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'PDF file is required'}, status=400)

    uploaded = request.FILES['file']
    if not uploaded.name.lower().endswith('.pdf'):
        return JsonResponse({'error': 'File must be a PDF'}, status=400)

    temp_in = None
    temp_out = None
    try:
        # Save incoming file
        temp_in = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        for chunk in uploaded.chunks():
            temp_in.write(chunk)
        temp_in.close()

        reader = PdfReader(temp_in.name)
        writer = PdfWriter()

        order_str = request.POST.get('order')
        if order_str:
            indices, err = _parse_order(order_str, len(reader.pages))
            if err:
                return JsonResponse({'error': err}, status=400)
            page_indices = indices
        else:
            page_indices = list(range(len(reader.pages)))

        for idx in page_indices:
            writer.add_page(reader.pages[idx])

        temp_out = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        with open(temp_out.name, 'wb') as f_out:
            writer.write(f_out)

        with open(temp_out.name, 'rb') as f_out:
            pdf_bytes = f_out.read()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="organized_{uploaded.name}"'
        return response

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    finally:
        for tmp in [temp_in, temp_out]:
            if tmp and os.path.exists(tmp.name):
                try:
                    os.unlink(tmp.name)
                except Exception:
                    pass
