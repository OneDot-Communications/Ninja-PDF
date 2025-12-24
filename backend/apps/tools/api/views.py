"""Tools API Views - Complete PDF Processing Endpoints"""
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse, FileResponse
import io
import tempfile
import os


class PDFToolAPIView(APIView):
    """Base class for PDF tool endpoints with file upload handling."""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]  # Allow Guests (Limits enforced in check_usage_limit)

    def get_file_from_request(self, request):
        """Extract uploaded file from request."""
        if 'file' not in request.FILES:
            return None, Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES['file']
        
        # Security: Virus Scan
        # Attempt to use ClamAV if installed on the system
        import shutil
        import subprocess
        import tempfile
        
        scanner = shutil.which('clamdscan') or shutil.which('clamscan')
        if scanner:
            try:
                # We need a file path to scan. 
                # If it's a TemporaryUploadedFile, it has a path.
                # If InMemory, we write to temp.
                if hasattr(file_obj, 'temporary_file_path'):
                    path = file_obj.temporary_file_path()
                    result = subprocess.run([scanner, '--no-summary', path], capture_output=True)
                else:
                    with tempfile.NamedTemporaryFile(delete=True) as tmp:
                        for chunk in file_obj.chunks():
                            tmp.write(chunk)
                        tmp.flush()
                        result = subprocess.run([scanner, '--no-summary', tmp.name], capture_output=True)
                
                if result.returncode != 0:
                    # Non-zero return code typically means virus found or error
                    # Exit code 1 for virus found in clamscan
                    return None, Response(
                        {'error': 'Security check failed. Malware detected.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                # Log error but fail open (don't block user if scanner is broken)
                print(f"Virus Check Error: {e}")

        return file_obj, None


# ─────────────────────────────────────────────────────────────────────────────
# CONVERSION TO PDF
# ─────────────────────────────────────────────────────────────────────────────

class WordToPDFView(PDFToolAPIView):
    """Convert Word documents to PDF."""
    
    def post(self, request):
        # Specific check
        # allowed, error = check_usage_limit(request, 'WORD_TO_PDF')
        # if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from apps.tools.converters.word_to_pdf import convert_word_to_pdf
            result = convert_word_to_pdf(file)
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExcelToPDFView(PDFToolAPIView):
    """Convert Excel spreadsheets to PDF."""
    
    def post(self, request):
        # allowed, error = check_usage_limit(request, 'EXCEL_TO_PDF')
        # if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from apps.tools.converters.office_converter import convert_excel_to_pdf
            result = convert_excel_to_pdf(file)
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PowerpointToPDFView(PDFToolAPIView):
    """Convert PowerPoint presentations to PDF."""
    
    def post(self, request):
        # allowed, error = check_usage_limit(request, 'PPT_TO_PDF')
        # if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from apps.tools.converters.office_converter import convert_powerpoint_to_pdf
            result = convert_powerpoint_to_pdf(file)
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JPGToPDFView(PDFToolAPIView):
    """Convert JPG images to PDF."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'JPG_TO_PDF')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from PIL import Image
            img = Image.open(file)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            output = io.BytesIO()
            img.save(output, format='PDF')
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HTMLToPDFView(PDFToolAPIView):
    """Convert HTML to PDF."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'HTML_TO_PDF')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from apps.tools.converters.office_converter import convert_html_to_pdf
            result = convert_html_to_pdf(file)
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarkdownToPDFView(PDFToolAPIView):
    """Convert Markdown to PDF."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'MARKDOWN_TO_PDF')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from apps.tools.converters.office_converter import convert_markdown_to_pdf
            result = convert_markdown_to_pdf(file)
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# CONVERSION FROM PDF
# ─────────────────────────────────────────────────────────────────────────────

class PDFToJPGView(PDFToolAPIView):
    """Convert PDF to JPG images - ALL pages as ZIP."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'PDF_TO_JPG')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz  # PyMuPDF
            import zipfile
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            base_name = file.name.rsplit(".", 1)[0]
            
            # Create ZIP file in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Convert EACH page to JPG
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    # Scale factor 2 = 144 DPI (good quality)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    
                    # Convert to JPEG bytes
                    img_bytes = pix.tobytes("jpeg")
                    
                    # Add to ZIP with numbered filename
                    jpg_filename = f"{base_name}_page_{page_num + 1}.jpg"
                    zip_file.writestr(jpg_filename, img_bytes)
            
            doc.close()
            zip_buffer.seek(0)
            
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{base_name}_images.zip"'
            return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToWordView(PDFToolAPIView):
    """Convert PDF to Word document."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'PDF_TO_WORD')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from pdf2docx import Converter
            import traceback
            
            # 1. Save uploaded file to temp
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_in:
                for chunk in file.chunks():
                    tmp_in.write(chunk)
                input_path = tmp_in.name
            
            output_path = input_path.replace('.pdf', '.docx')
            
            try:
                # 2. Convert with strictly sequential processing
                # cpu_count=1 and multi_processing=False to prevent spawning issues
                cv = Converter(input_path)
                try:
                    cv.convert(output_path, start=0, end=None, multi_processing=False, cpu_count=1)
                finally:
                    cv.close() # Ensure file handles are released
                
                # 3. Check output
                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                     raise Exception("Conversion resulted in empty or missing file.")

                # 4. Read output
                with open(output_path, 'rb') as f:
                    output_content = f.read()
                    
                # 5. Prepare Response
                response = HttpResponse(
                    output_content,
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                )
                response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.docx"'
                response['Content-Length'] = len(output_content)
                return response

            except Exception as conv_error:
                print(f"PDF2DOCX Error: {conv_error}")
                traceback.print_exc()
                return Response({'error': f"Conversion failed: {str(conv_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            finally:
                # 6. Cleanup (Best effort)
                def safe_remove(path):
                    if os.path.exists(path):
                        try: os.unlink(path)
                        except Exception as e: print(f"Cleanup error for {path}: {e}")
                
                safe_remove(input_path)
                safe_remove(output_path)

        except Exception as e:
            traceback.print_exc()
            return Response({'error': f"System error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToExcelView(PDFToolAPIView):
    """Convert PDF to Excel with inline images (iLovePDF style)."""
    
    def post(self, request):
        # allowed, error = check_usage_limit(request, 'PDF_TO_EXCEL')
        # if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz
            from openpyxl import Workbook
            from openpyxl.drawing.image import Image as XLImage
            from openpyxl.styles import Font
            from io import BytesIO
            import traceback
            
            # Write to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_in:
                tmp_in.write(file.read())
                input_path = tmp_in.name
            
            output_path = input_path.replace('.pdf', '.xlsx')
            
            doc = fitz.open(input_path)
            wb = Workbook()
            ws = wb.active
            ws.title = "Table 1"
            
            current_row = 1
            ws.column_dimensions['A'].width = 100  # Wide column for content
            
            for page_num, page in enumerate(doc):
                # Get all blocks sorted by Y position
                page_dict = page.get_text("dict")
                all_blocks = []
                
                for block in page_dict["blocks"]:
                    y_pos = block["bbox"][1]  # Y coordinate
                    all_blocks.append((y_pos, "text" if block["type"] == 0 else "image", block))
                
                # Render page to get images as picture
                pix = page.get_pixmap(dpi=150)
                page_img_data = pix.tobytes("png")
                
                # Get image blocks (rendered sections)
                image_positions = []
                for block in page_dict["blocks"]:
                    if block["type"] == 1:  # Image block
                        image_positions.append(block["bbox"][1])  # Y position
                
                # Sort blocks by Y position
                all_blocks.sort(key=lambda x: x[0])
                
                # Track if we need to insert a rendered image section
                rendered_section = False
                
                for y_pos, block_type, block in all_blocks:
                    if block_type == "text":
                        # Process text block
                        for line in block["lines"]:
                            line_text = "".join(span["text"] for span in line["spans"])
                            if line_text.strip():
                                cell = ws.cell(row=current_row, column=1, value=line_text.strip())
                                
                                # Check if any span is bold
                                for span in line["spans"]:
                                    if span["flags"] & 16:  # Bold flag
                                        cell.font = Font(bold=True)
                                        break
                                
                                current_row += 1
                    
                    elif block_type == "image":
                        # For image blocks, render that section of the page
                        bbox = block["bbox"]
                        x0, y0, x1, y1 = bbox
                        
                        # Create a clip of just this image area
                        clip_rect = fitz.Rect(x0, y0, x1, y1)
                        clip_pix = page.get_pixmap(clip=clip_rect, dpi=150)
                        clip_img_data = clip_pix.tobytes("png")
                        
                        img_stream = BytesIO(clip_img_data)
                        xl_img = XLImage(img_stream)
                        
                        # Scale if too large
                        max_width = 500
                        if xl_img.width > max_width:
                            scale = max_width / xl_img.width
                            xl_img.width = int(xl_img.width * scale)
                            xl_img.height = int(xl_img.height * scale)
                        
                        # Place image
                        cell_ref = f"A{current_row}"
                        ws.add_image(xl_img, cell_ref)
                        
                        # Skip rows for image height
                        rows_for_img = max(5, int(xl_img.height / 15))
                        current_row += rows_for_img
                
                # Add spacing between pages
                current_row += 3
            
            doc.close()
            wb.save(output_path)
            
            # Read output
            with open(output_path, 'rb') as f:
                output_content = f.read()
            
            # Cleanup
            os.unlink(input_path)
            os.unlink(output_path)
            
            response = HttpResponse(
                output_content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.xlsx"'
            return response
        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToPowerpointView(PDFToolAPIView):
    """Convert PDF to PowerPoint."""
    
    def post(self, request):
        def log_debug(msg):
            try:
                with open("debug_log.txt", "a") as f:
                    f.write(msg + "\n")
            except: pass

        log_debug("DEBUG: [PDFToPPT] Request received")
        
        # allowed, error = check_usage_limit(request, 'PDF_TO_PPT')
        # if not allowed: 
        #    log_debug("DEBUG: [PDFToPPT] Usage denied")
        #    return error

        file, error = self.get_file_from_request(request)
        if error:
            log_debug("DEBUG: [PDFToPPT] File missing")
            return error
        
        try:
            log_debug(f"DEBUG: [PDFToPPT] Processing file: {file.name}")
            import fitz
            from pptx import Presentation
            from pptx.util import Pt
            from pptx.dml.color import RGBColor
            from io import BytesIO
            import traceback

            # Write to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_in:
                for chunk in file.chunks():
                    tmp_in.write(chunk)
                input_path = tmp_in.name
            
            output_path = input_path.replace('.pdf', '.pptx')
            
            doc = fitz.open(input_path)
            log_debug(f"DEBUG: [PDFToPPT] PDF Opened. Pages: {len(doc)}")
            
            prs = Presentation()
            
            if len(doc) > 0:
                page0 = doc[0]
                prs.slide_width = Pt(page0.rect.width)
                prs.slide_height = Pt(page0.rect.height)

            blank_layout = prs.slide_layouts[6] 

            for i, page in enumerate(doc):
                log_debug(f"DEBUG: [PDFToPPT] Processing Page {i}")
                
                # PURE IMAGE MODE: Render the entire page as a high-quality image
                # This guarantees EXACT visual match to the PDF
                pix = page.get_pixmap(dpi=200)  # High DPI for crisp text
                img_data = pix.tobytes("png")
                img_stream = BytesIO(img_data)
                
                # Create Slide
                slide = prs.slides.add_slide(blank_layout)
                
                # Place the page image as the full slide content
                slide.shapes.add_picture(img_stream, Pt(0), Pt(0), width=prs.slide_width, height=prs.slide_height)

            doc.close()
            prs.save(output_path)
            log_debug("DEBUG: [PDFToPPT] Saved PPT")
            
            # Read output
            with open(output_path, 'rb') as f:
                output_content = f.read()
            
            # Cleanup
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except: pass
            
            response = HttpResponse(
                output_content,
                content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation'
            )
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pptx"'
            return response

        except Exception as e:
            log_debug(f"DEBUG: [PDFToPPT] CRASH: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': f"Conversion failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToHTMLView(PDFToolAPIView):
    """Convert PDF to HTML."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'PDF_TO_HTML')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            html_content = ['<!DOCTYPE html><html><head><meta charset="utf-8"><title>Converted PDF</title></head><body>']
            
            for page in doc:
                page_html = page.get_text('html')
                html_content.append(f'<div class="page" style="page-break-after: always;">{page_html}</div>')
            
            html_content.append('</body></html>')
            doc.close()
            
            full_html = '\n'.join(html_content)
            
            response = HttpResponse(full_html, content_type='text/html')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.html"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToPDFAView(PDFToolAPIView):
    """Convert PDF to PDF/A format."""
    
    def post(self, request):
        allowed, error = check_usage_limit(request, 'PDF_TO_PDFA')
        if not allowed: return error

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import subprocess
            
            # Write to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_in:
                tmp_in.write(file.read())
                input_path = tmp_in.name
            
            output_path = input_path.replace('.pdf', '_pdfa.pdf')
            
            # Convert using Ghostscript
            result = subprocess.run([
                'gs', '-dPDFA=2', '-dBATCH', '-dNOPAUSE',
                '-sColorConversionStrategy=UseDeviceIndependentColor',
                f'-sOutputFile={output_path}',
                '-sDEVICE=pdfwrite',
                '-dPDFACompatibilityPolicy=1',
                input_path
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                os.unlink(input_path)
                return Response({'error': f'Conversion failed: {result.stderr}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Read output
            with open(output_path, 'rb') as f:
                output_content = f.read()
            
            # Cleanup
            os.unlink(input_path)
            os.unlink(output_path)
            
            response = HttpResponse(output_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_pdfa.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ─────────────────────────────────────────────────────────────────────────────
# PDF OPTIMIZATION
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# UTILS
# ─────────────────────────────────────────────────────────────────────────────

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def check_usage_limit(request, feature_code):
    """
    Checks if user has reached limit for feature.
    Supports usage tracking for both Authenticated Users and Guests (via IP).
    Returns (allowed: bool, response: Response | None)
    """
    try:
        from apps.subscriptions.models.subscription import Feature, UserFeatureUsage, UserFeatureOverride, GuestFeatureUsage
        from django.utils import timezone
        
        # Get Feature
        feature = Feature.objects.filter(code=feature_code).first()
        if not feature:
            return True, None # Feature not restricted or unknown

        # 1. GUEST ACCESS
        if not request.user.is_authenticated:
            # Check Premium-Only Restriction for Guests
            if feature.is_premium_default:
                return False, Response(
                    {'error': 'This is a premium feature. Please login or upgrade.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check Host/IP Limit
            ip = get_client_ip(request)
            if not ip:
                 return False, Response({'error': 'Cannot identify client.'}, status=status.HTTP_400_BAD_REQUEST)

            today = timezone.now().date()
            usage, created = GuestFeatureUsage.objects.get_or_create(ip_address=ip, feature=feature, date=today)
            
            limit = feature.free_limit
            
            if limit > 0 and usage.count >= limit:
                 return False, Response(
                     {'error': f'Daily guest limit of {limit} reached. Please sign up for more.'}, 
                     status=status.HTTP_403_FORBIDDEN
                 )
            
            usage.count += 1
            usage.save()
            return True, None

        # 2. LOGGED-IN USER ACCESS
        user = request.user
        
        # Check Override
        override = UserFeatureOverride.objects.filter(user=user, feature=feature).first()
        if override:
            if override.is_enabled:
                return True, None
            else:
                return False, Response({'error': 'Feature disabled for your account'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check Subscription Tier (Premium Bypass)
        is_premium = False
        if hasattr(user, 'subscription') and user.subscription:
             pass
        
        # If user model has subscription_tier (e.g. from property)
        if getattr(user, 'subscription_tier', 'FREE') in ['PRO', 'ENTERPRISE', 'PREMIUM']:
             return True, None # Unlimited for paid

        # If User is Free and Feature is Premium Only
        if feature.is_premium_default:
             return False, Response(
                 {'error': 'This feature requires a premium subscription.'}, 
                 status=status.HTTP_403_FORBIDDEN
             )

        # Check Free User Limits
        today = timezone.now().date()
        usage, created = UserFeatureUsage.objects.get_or_create(user=user, feature=feature, date=today)
        
        limit = feature.free_limit
        if limit > 0:
            if usage.count >= limit:
                return False, Response(
                    {'error': f'Daily limit of {limit} reached. Upgrade for unlimited access.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )

        # Increment
        usage.count += 1
        usage.save()
        return True, None
        
    except Exception as e:
        print(f"Limit Check Error: {e}")
        return True, None # Fail safe open

class MergePDFView(PDFToolAPIView):
    """Merge multiple PDFs into one."""
    
    def post(self, request):
        # Usage Check
        allowed, error_response = check_usage_limit(request.user, 'MERGE_PDF')
        if not allowed:
            return error_response

        files = request.FILES.getlist('files')
        if not files or len(files) < 2:
            return Response({'error': 'At least 2 files required for merge'}, status=status.HTTP_400_BAD_REQUEST)

        
        try:
            import fitz
            merged = fitz.open()
            
            for file in files:
                pdf = fitz.open(stream=file.read(), filetype="pdf")
                merged.insert_pdf(pdf)
                pdf.close()
            
            output = io.BytesIO()
            merged.save(output)
            merged.close()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="merged.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SplitPDFView(PDFToolAPIView):
    """Split PDF into multiple files."""
    
    def post(self, request):
        # Usage Check
        allowed, error_response = check_usage_limit(request, 'SPLIT_PDF')
        if not allowed:
            return error_response

        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz
            import json
            import zipfile
            
            selected_pages = json.loads(request.data.get('selectedPages', '[]'))
            split_mode = request.data.get('splitMode', 'merge') # 'merge' or 'separate'
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            total_pages = len(doc)
            
            # Determine pages to process (1-based from frontend -> 0-based index)
            if selected_pages:
                pages_indices = [p-1 for p in selected_pages if 0 <= p-1 < total_pages]
            else:
                # Fallback: process all pages if none selected (though frontend usually blocks this)
                pages_indices = range(total_pages)
            
            if split_mode == 'merge':
                # Merge selected pages into ONE new PDF
                new_doc = fitz.open()
                for i in pages_indices:
                    new_doc.insert_pdf(doc, from_page=i, to_page=i)
                
                output = io.BytesIO()
                new_doc.save(output)
                new_doc.close()
                output.seek(0)
                
                response = HttpResponse(output.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="split_{file.name}"'
                doc.close()
                return response
                
            elif split_mode == 'separate':
                # Extract selected pages as SEPARATE files in a ZIP
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for i in pages_indices:
                        page_doc = fitz.open()
                        page_doc.insert_pdf(doc, from_page=i, to_page=i)
                        
                        page_buffer = io.BytesIO()
                        page_doc.save(page_buffer)
                        page_doc.close()
                        page_buffer.seek(0)
                        
                        # Use original filename + page number
                        base_name = file.name.rsplit('.', 1)[0]
                        zip_file.writestr(f'{base_name}_page_{i+1}.pdf', page_buffer.read())
                
                doc.close()
                zip_buffer.seek(0)
                
                response = HttpResponse(zip_buffer.read(), content_type='application/zip')
                response['Content-Disposition'] = f'attachment; filename="split_files.zip"'
                return response
            
            else:
                doc.close()
                return Response({'error': 'Invalid split mode'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompressPDFView(PDFToolAPIView):
    """Compress PDF to reduce file size."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from apps.tools.optimizers.compress import compress_pdf
            level = request.data.get('level', 'recommended')
            result = compress_pdf(file, level)
            
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_compressed.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrganizePDFView(PDFToolAPIView):
    """Organize PDF pages (reorder, rotate, delete)."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz
            import json
            
            pages_data = json.loads(request.data.get('pages', '[]'))
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            # Create new document with reorganized pages
            new_doc = fitz.open()
            for page_info in pages_data:
                # Frontend sends 'originalIndex' (0-based), handle both old 'page' (1-based) and new format
                if 'originalIndex' in page_info:
                    page_num = page_info.get('originalIndex', 0)
                else:
                    page_num = page_info.get('page', 1) - 1
                
                rotation = page_info.get('rotation', 0)
                is_blank = page_info.get('isBlank', False)
                
                if is_blank:
                    # Add a blank page (A4 size)
                    new_page = new_doc.new_page(width=595.28, height=841.89)
                elif 0 <= page_num < len(doc):
                    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                    if rotation:
                        new_doc[-1].set_rotation(rotation)
            
            output = io.BytesIO()
            new_doc.save(output)
            new_doc.close()
            doc.close()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="organized.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FlattenPDFView(PDFToolAPIView):
    """Flatten PDF (merge annotations into content)."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            for page in doc:
                # Flatten annotations
                for annot in page.annots():
                    annot.update()
            
            output = io.BytesIO()
            doc.save(output, deflate=True)
            doc.close()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_flattened.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompressImageView(PDFToolAPIView):
    """Compress images."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            from PIL import Image
            
            level = request.data.get('level', 'recommended')
            quality_map = {'low': 30, 'recommended': 60, 'high': 85}
            quality = quality_map.get(level, 60)
            
            img = Image.open(file)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='image/jpeg')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_compressed.jpg"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# PDF SECURITY
# ─────────────────────────────────────────────────────────────────────────────

class ProtectPDFView(PDFToolAPIView):
    """Add password protection to PDF."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.tools.security.protect import protect_pdf
            result = protect_pdf(file, password)
            
            response = HttpResponse(result, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_protected.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnlockPDFView(PDFToolAPIView):
    """Remove password protection from PDF."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import fitz
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            if doc.is_encrypted:
                if not doc.authenticate(password):
                    return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)
            
            output = io.BytesIO()
            doc.save(output)
            doc.close()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_unlocked.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# AI/PREMIUM TOOLS
# ─────────────────────────────────────────────────────────────────────────────

class OCRPDFView(PDFToolAPIView):
    """Perform OCR on scanned PDF to make it searchable. Premium feature."""
    
    def post(self, request):
        # Premium check: require authenticated and premium user
        if not (request.user.is_authenticated and getattr(request.user, "is_premium", False)):
            return Response(
                {'error': 'OCR is a premium feature. Please upgrade your subscription.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        language = request.data.get('language', 'eng')
        deskew = request.data.get('deskew', True)
        output_type = request.data.get('output', 'pdf')  # 'pdf' or 'text'
        
        try:
            from apps.tools.ai.ocr import ocr
            
            # Write to temp file since ocrmypdf needs file path
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_in:
                tmp_in.write(file.read())
                input_path = tmp_in.name
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_out:
                output_path = tmp_out.name
            
            result = ocr(input_path, output_path, language=language, deskew=deskew)
            
            # Clean up input file
            os.unlink(input_path)
            
            if not result.get('success'):
                if os.path.exists(output_path):
                    os.unlink(output_path)
                return Response(
                    {'error': result.get('message', 'OCR failed')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            if output_type == 'text':
                # Extract text from OCR'd PDF
                import fitz
                doc = fitz.open(output_path)
                text = ""
                for page in doc:
                    text += page.get_text()
                doc.close()
                os.unlink(output_path)
                
                return Response({
                    'text': text,
                    'pages_processed': result.get('pages_processed'),
                    'language': language
                })
            else:
                # Return the OCR'd PDF
                with open(output_path, 'rb') as f:
                    pdf_content = f.read()
                os.unlink(output_path)
                
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_ocr.pdf"'
                return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EditPDFView(PDFToolAPIView):
    """Add text, highlights, and shapes to PDF. Premium feature."""
    
    def post(self, request):
        if not getattr(request.user, 'is_premium', False):
            return Response(
                {'error': 'Edit PDF is a premium feature. Please upgrade your subscription.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        annotations = request.data.get('annotations', [])
        
        if not annotations:
            return Response({'error': 'No annotations provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import fitz
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            for annot in annotations:
                annot_type = annot.get('type')
                page_num = annot.get('page', 1) - 1  # Convert to 0-indexed
                
                if page_num < 0 or page_num >= len(doc):
                    continue
                
                page = doc[page_num]
                
                if annot_type == 'text':
                    # Add text annotation
                    x = annot.get('x', 0)
                    y = annot.get('y', 0)
                    content = annot.get('content', '')
                    font_size = annot.get('font_size', 12)
                    color = annot.get('color', '#000000')
                    
                    # Convert hex color to RGB tuple (0-1 range)
                    rgb = tuple(int(color.lstrip('#')[i:i+2], 16) / 255 for i in (0, 2, 4))
                    
                    page.insert_text(
                        fitz.Point(x, y),
                        content,
                        fontsize=font_size,
                        color=rgb
                    )
                
                elif annot_type == 'highlight':
                    rect = annot.get('rect', [0, 0, 100, 20])
                    page.add_highlight_annot(fitz.Rect(rect))
                
                elif annot_type == 'rectangle':
                    rect = annot.get('rect', [0, 0, 100, 100])
                    color = annot.get('color', '#FF0000')
                    rgb = tuple(int(color.lstrip('#')[i:i+2], 16) / 255 for i in (0, 2, 4))
                    
                    shape = page.new_shape()
                    shape.draw_rect(fitz.Rect(rect))
                    shape.finish(color=rgb, width=1)
                    shape.commit()
            
            output = io.BytesIO()
            doc.save(output)
            doc.close()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_edited.pdf"'
            return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RedactPDFView(PDFToolAPIView):
    """Redact sensitive information from PDF. Premium feature."""
    
    def post(self, request):
        if not request.user.is_premium:
            return Response(
                {'error': 'Redact PDF is a premium feature. Please upgrade your subscription.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        redactions = request.data.get('redactions', [])
        
        if not redactions:
            return Response({'error': 'No redactions provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            import fitz
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            for redact in redactions:
                page_num = redact.get('page', 1) - 1  # Convert to 0-indexed
                
                if page_num < 0 or page_num >= len(doc):
                    continue
                
                page = doc[page_num]
                
                if 'rect' in redact:
                    # Redact by coordinates
                    rect = fitz.Rect(redact['rect'])
                    page.add_redact_annot(rect, fill=(0, 0, 0))
                
                elif 'text' in redact:
                    # Redact by finding text
                    text_to_redact = redact['text']
                    text_instances = page.search_for(text_to_redact)
                    for inst in text_instances:
                        page.add_redact_annot(inst, fill=(0, 0, 0))
                
                # Apply redactions to this page
                page.apply_redactions()
            
            output = io.BytesIO()
            doc.save(output, garbage=4, deflate=True)  # Clean up and compress
            doc.close()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}_redacted.pdf"'
            return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

