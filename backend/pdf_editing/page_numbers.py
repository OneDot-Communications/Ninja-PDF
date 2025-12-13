"""
PDF Page Numbers module
Adds simple page numbers to PDF pages and returns the modified PDF.
"""

import fitz
import io
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["POST"])
def page_numbers_api(request):
    """
    POST /api/v1/edit/page-numbers/

    Accepts a PDF file (field `file` or `pdf_file`) and adds simple page numbers
    at the bottom-center of each page. Optional POST params:
      - start_from: integer (default 1)
      - font_size: integer (default 12)
      - color: hex string without # (e.g. '000000') default '000000'
      - pages: 'all' or comma separated pages like '1,3,5-7' (default 'all')

    Returns the modified PDF as an attachment.
    """

    try:
        if 'pdf_file' in request.FILES:
            uploaded_file = request.FILES['pdf_file']
        elif 'file' in request.FILES:
            uploaded_file = request.FILES['file']
        else:
            return JsonResponse({'error': 'No file uploaded'}, status=400)

        if not uploaded_file.name.lower().endswith('.pdf'):
            return JsonResponse({'error': 'File must be a PDF'}, status=400)

        pdf_bytes = uploaded_file.read()
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')

        start_from = int(request.POST.get('start_from', 1))
        font_size = int(request.POST.get('font_size', 12))
        # ensure a sensible minimum so numbers are visible on small pages
        if font_size < 6:
            font_size = 6
        color_hex = request.POST.get('color', '000000')
        pages_param = request.POST.get('pages', '')
        # optional explicit range
        from_page = request.POST.get('from_page', '')
        to_page = request.POST.get('to_page', '')
        # text format options: 'n', 'page-n', 'n-of-m', 'page-n-of-m'
        text_format = request.POST.get('format', 'n')
        # position: bottom-center, bottom-right, top-left, etc.
        position = request.POST.get('position', 'bottom-center')

        # determine target pages set (0-indexed). default: all
        total_pages = len(doc)
        target_pages = set(range(total_pages))
        if pages_param and pages_param.strip().lower() != 'all':
            nums = set()
            parts = [p.strip() for p in pages_param.split(',') if p.strip()]
            for part in parts:
                if '-' in part:
                    a, b = part.split('-', 1)
                    try:
                        a_i = int(a); b_i = int(b)
                        for n in range(a_i, b_i + 1):
                            nums.add(n - 1)
                    except ValueError:
                        continue
                else:
                    try:
                        nums.add(int(part) - 1)
                    except ValueError:
                        continue
            if nums:
                target_pages = nums
        # handle from_page / to_page overrides
        try:
            if from_page:
                f = int(from_page) - 1
            else:
                f = None
            if to_page:
                t = int(to_page) - 1
            else:
                t = None
            if f is not None or t is not None:
                f = 0 if f is None else max(0, f)
                t = total_pages - 1 if t is None else min(total_pages - 1, t)
                target_pages = set(range(f, t + 1))
        except ValueError:
            pass

        # convert hex color to RGB tuple 0..1
        try:
            r = int(color_hex[0:2], 16) / 255.0
            g = int(color_hex[2:4], 16) / 255.0
            b = int(color_hex[4:6], 16) / 255.0
            color = (r, g, b)
        except Exception:
            color = (0, 0, 0)

        # iterate pages and add text
        for i in range(total_pages):
            if i not in target_pages:
                continue
            page = doc[i]
            page_width = page.rect.width
            page_height = page.rect.height

            number = start_from + i
            # build text according to requested format
            if text_format == 'n':
                text = str(number)
            elif text_format == 'page-n':
                text = f"Page {number}"
            elif text_format == 'n-of-m':
                text = f"{number} of {total_pages}"
            elif text_format == 'page-n-of-m':
                text = f"Page {number} of {total_pages}"
            else:
                text = str(number)

            # Choose rectangle based on position and margin
            margin_map = {
                'recommended': 20,
                'small': 10,
                'large': 40,
            }
            margin_choice = request.POST.get('margin', 'recommended')
            margin = margin_map.get(margin_choice, 20)

            # compute rect for textbox depending on position
            # make textbox a bit taller than the font size to avoid clipping
            box_h = int(font_size * 1.8)
            if position == 'bottom-center':
                rect = fitz.Rect(0 + margin, page_height - margin - box_h, page_width - margin, page_height - margin)
            elif position == 'bottom-right':
                rect = fitz.Rect(page_width - 200 - margin, page_height - margin - box_h, page_width - margin, page_height - margin)
            elif position == 'bottom-left':
                rect = fitz.Rect(margin, page_height - margin - box_h, margin + 200, page_height - margin)
            elif position == 'top-center':
                rect = fitz.Rect(margin, margin, page_width - margin, margin + box_h)
            elif position == 'top-right':
                rect = fitz.Rect(page_width - 200 - margin, margin, page_width - margin, margin + box_h)
            elif position == 'top-left':
                rect = fitz.Rect(margin, margin, margin + 200, margin + box_h)
            else:
                rect = fitz.Rect(margin, page_height - margin - box_h, page_width - margin, page_height - margin)

            # Use a reliable built-in font and draw centered text.
            # Respect page rotation so text appears correctly on rotated pages.
            try:
                rot = 0
                try:
                    rot = int(getattr(page, 'rotation', 0) or 0)
                except Exception:
                    try:
                        rot = int(page.rotation())
                    except Exception:
                        rot = 0

                page.insert_textbox(
                    rect,
                    text,
                    fontname="Times-Roman",
                    fontsize=font_size,
                    color=color,
                    align=1,
                    rotate=rot,
                )
            except Exception:
                # fallback: try without specifying fontname/rotation
                try:
                    page.insert_textbox(rect, text, fontsize=font_size, color=color, align=1)
                except Exception:
                    # last resort: draw the text at an absolute point (may be visible)
                    try:
                        pt = fitz.Point(rect.x0 + (rect.width / 2), rect.y0 + (rect.height / 2))
                        page.insert_text(pt, text, fontsize=font_size, color=color, align=1)
                    except Exception:
                        # give up quietly for this page
                        pass

        output = io.BytesIO()
        doc.save(output)
        doc.close()
        output.seek(0)

        filename = f"pagenumbers_{uploaded_file.name}"
        response = HttpResponse(output.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)
