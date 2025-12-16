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
    permission_classes = [permissions.AllowAny]  # Guest users allowed for basic tools

    def get_file_from_request(self, request):
        """Extract uploaded file from request."""
        if 'file' not in request.FILES:
            return None, Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        return request.FILES['file'], None


# ─────────────────────────────────────────────────────────────────────────────
# CONVERSION TO PDF
# ─────────────────────────────────────────────────────────────────────────────

class WordToPDFView(PDFToolAPIView):
    """Convert Word documents to PDF."""
    
    def post(self, request):
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
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            # Placeholder - implement actual conversion
            return Response({'error': 'Excel to PDF not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PowerpointToPDFView(PDFToolAPIView):
    """Convert PowerPoint presentations to PDF."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'PowerPoint to PDF not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JPGToPDFView(PDFToolAPIView):
    """Convert JPG images to PDF."""
    
    def post(self, request):
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
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'HTML to PDF not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarkdownToPDFView(PDFToolAPIView):
    """Convert Markdown to PDF."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import markdown
            from xhtml2pdf import pisa
            
            # Read markdown content
            md_content = file.read().decode('utf-8')
            
            # Convert to HTML
            html_content = markdown.markdown(md_content)
            
            # Add basic styling
            full_html = f"""
            <html>
                <head>
                    <style>
                        body {{ font-family: sans-serif; padding: 20px; }}
                        pre {{ background: #f4f4f4; padding: 10px; border-radius: 5px; }}
                        code {{ font-family: monospace; }}
                        blockquote {{ border-left: 4px solid #ccc; padding-left: 10px; color: #666; }}
                        table {{ border-collapse: collapse; width: 100%; }}
                        th, td {{ border: 1px solid #ddd; padding: 8px; }}
                        th {{ background-color: #f2f2f2; }}
                        img {{ max-width: 100%; }}
                    </style>
                </head>
                <body>
                    {html_content}
                </body>
            </html>
            """
            
            output = io.BytesIO()
            pisa_status = pisa.CreatePDF(io.BytesIO(full_html.encode('utf-8')), dest=output)
            
            if pisa_status.err:
                return Response({'error': 'PDF generation failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# CONVERSION FROM PDF
# ─────────────────────────────────────────────────────────────────────────────

class PDFToJPGView(PDFToolAPIView):
    """Convert PDF to JPG images."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            # Convert first page to image
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            
            output = io.BytesIO()
            output.write(pix.tobytes("jpeg"))
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='image/jpeg')
            response['Content-Disposition'] = f'attachment; filename="{file.name.rsplit(".", 1)[0]}.jpg"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToWordView(PDFToolAPIView):
    """Convert PDF to Word document."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'PDF to Word not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToExcelView(PDFToolAPIView):
    """Convert PDF to Excel."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'PDF to Excel not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToPowerpointView(PDFToolAPIView):
    """Convert PDF to PowerPoint."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'PDF to PowerPoint not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToHTMLView(PDFToolAPIView):
    """Convert PDF to HTML."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'PDF to HTML not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFToPDFAView(PDFToolAPIView):
    """Convert PDF to PDF/A format."""
    
    def post(self, request):
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            return Response({'error': 'PDF to PDF/A not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# PDF OPTIMIZATION
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# UTILS
# ─────────────────────────────────────────────────────────────────────────────

def check_usage_limit(user, feature_code):
    """
    Checks if user has reached limit for feature.
    Returns (allowed: bool, response: Response | None)
    """
    if not user.is_authenticated:
        return True, None # Guests allowed for now? Or block? Assuming yes.
        
    try:
        from apps.subscriptions.models.subscription import Feature, UserFeatureUsage, UserFeatureOverride
        from django.utils import timezone
        
        # Get Feature
        feature = Feature.objects.filter(code=feature_code).first()
        if not feature:
            return True, None # Feature not restricted or unknown
            
        # Check Override
        override = UserFeatureOverride.objects.filter(user=user, feature=feature).first()
        if override:
            if override.is_enabled:
                return True, None
            else:
                return False, Response({'error': 'Feature disabled for your account'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check Plan Limits (Simplification: Pro = 1000, Free = limit)
        # Ideally Plan has limits.
        # Assuming Subscription Tier check:
        if user.subscription_tier in ['PRO', 'ENTERPRISE', 'PREMIUM']:
             return True, None # Unlimited for paid
             
        # Check Daily Usage
        today = timezone.now().date()
        usage, created = UserFeatureUsage.objects.get_or_create(user=user, feature=feature, date=today)
        
        limit = feature.free_limit
        if limit > 0:
            # Check for 80% Usage Alert
            threshold_80 = int(limit * 0.8)
            if usage.count == threshold_80 and threshold_80 > 0:
                 from core.services.email_service import EmailService
                 EmailService.send_usage_alert_80(user, feature.name)

            if usage.count >= limit:
                # Limit Reached
                from core.services.email_service import EmailService
                # Only email once per day per feature to avoid spam
                if usage.count == limit:
                     EmailService.send_limit_reached(user, feature.name)
                
                return False, Response({'error': f'Daily limit of {limit} reached for {feature.name}. Upgrade for unlimited.'}, status=status.HTTP_403_FORBIDDEN)

            
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
        file, error = self.get_file_from_request(request)
        if error:
            return error
        
        try:
            import fitz
            import json
            import zipfile
            
            selected_pages = json.loads(request.data.get('selectedPages', '[]'))
            split_mode = request.data.get('splitMode', 'extract')
            
            doc = fitz.open(stream=file.read(), filetype="pdf")
            
            if split_mode == 'extract' and selected_pages:
                # Extract selected pages
                new_doc = fitz.open()
                for page_num in selected_pages:
                    if 0 <= page_num - 1 < len(doc):
                        new_doc.insert_pdf(doc, from_page=page_num-1, to_page=page_num-1)
                
                output = io.BytesIO()
                new_doc.save(output)
                new_doc.close()
                output.seek(0)
                
                response = HttpResponse(output.read(), content_type='application/pdf')
                response['Content-Disposition'] = 'attachment; filename="split.pdf"'
                return response
            else:
                # Split all pages into ZIP
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for i in range(len(doc)):
                        page_doc = fitz.open()
                        page_doc.insert_pdf(doc, from_page=i, to_page=i)
                        page_buffer = io.BytesIO()
                        page_doc.save(page_buffer)
                        page_doc.close()
                        page_buffer.seek(0)
                        zip_file.writestr(f'page_{i+1}.pdf', page_buffer.read())
                
                doc.close()
                zip_buffer.seek(0)
                
                response = HttpResponse(zip_buffer.read(), content_type='application/zip')
                response['Content-Disposition'] = 'attachment; filename="split_pages.zip"'
                return response
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
                page_num = page_info.get('page', 1) - 1
                rotation = page_info.get('rotation', 0)
                
                if 0 <= page_num < len(doc):
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
