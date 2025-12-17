from abc import ABC, abstractmethod
from django.utils import timezone
from infrastructure.storage.service import StorageService
from common.exceptions import FileProcessingError
import tempfile
import hashlib
import os
import logging
from pypdf import PdfReader, PdfWriter, PageObject
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

logger = logging.getLogger(__name__)


class BaseWorker(ABC):
    """
    Stateless, single-responsibility worker base class.
    Implements idempotency, timeout, and retry handling.
    """
    
    name: str = "base"
    timeout_seconds: int = 300
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.job = None
        self.file_asset = None
        self._temp_files = []
    
    def load_job(self):
        """Load job and file asset from database."""
        from apps.jobs.models.job import Job
        
        self.job = Job.objects.select_related('file_asset', 'user').get(id=self.job_id)
        self.file_asset = self.job.file_asset
        return self.job
    
    def is_already_processed(self) -> bool:
        """Idempotency check - prevent double processing."""
        return self.job and self.job.status == 'COMPLETED'
    
    def fetch_input_file(self) -> str:
        """
        Download input file to local temp storage.
        
        Returns:
            str: Local file path
        """
        storage_path = self.file_asset.storage_path
        ext = os.path.splitext(storage_path)[1]
        
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        self._temp_files.append(temp.name)
        
        with StorageService.read(storage_path) as f:
            temp.write(f.read())
        temp.close()
        
        return temp.name
    
    @abstractmethod
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """
        Execute the transformation.
        Must be implemented by subclasses.
        """
        pass
    
    def validate_output(self, output_path: str) -> bool:
        """Validate output file exists and has content."""
        if not os.path.exists(output_path):
            return False
        if os.path.getsize(output_path) == 0:
            return False
        return True
    
    def calculate_output_hash(self, output_path: str) -> str:
        """Calculate SHA256 hash of output file for integrity."""
        sha = hashlib.sha256()
        with open(output_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha.update(chunk)
        return sha.hexdigest()
    
    def upload_output(self, output_path: str) -> dict:
        """
        Upload output file to storage.
        
        Returns:
            dict: {storage_path, url, hash, size}
        """
        from apps.files.models.file_asset import FileVersion
        
        ext = os.path.splitext(output_path)[1] or '.pdf'
        storage_path = f"outputs/{self.file_asset.uuid}/v{self.file_asset.version + 1}{ext}"
        
        output_hash = self.calculate_output_hash(output_path)
        output_size = os.path.getsize(output_path)
        
        with open(output_path, 'rb') as f:
            StorageService.upload(storage_path, f)
        
        FileVersion.objects.create(
            file_asset=self.file_asset,
            version_number=self.file_asset.version + 1,
            storage_path=storage_path,
            size_bytes=output_size,
            sha256_hash=output_hash,
        )
        
        self.file_asset.version += 1
        self.file_asset.metadata['output_hash'] = output_hash
        self.file_asset.metadata['output_size'] = output_size
        self.file_asset.save()
        
        return {
            'storage_path': storage_path,
            'url': StorageService.generate_signed_url(storage_path),
            'hash': output_hash,
            'size': output_size,
        }
    
    def cleanup(self):
        """Remove temporary files."""
        for path in self._temp_files:
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {path}: {e}")

    def create_watermark(self, text):
        """Create a temporary PDF with the watermark text."""
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=letter)
        can.setFont("Helvetica-Bold", 36)
        can.setFillColorRGB(0.5, 0.5, 0.5, 0.5) # Grey, semi-transparent
        
        # Draw diagonal text
        can.saveState()
        can.translate(300, 400)
        can.rotate(45)
        can.drawCentredString(0, 0, text)
        can.restoreState()
        
        can.save()
        packet.seek(0)
        return PdfReader(packet)

    def apply_watermark(self, input_path: str):
        """Apply watermark to the PDF file."""
        try:
            watermark_text = "NINJA PDF FREE"
            watermark_pdf = self.create_watermark(watermark_text)
            watermark_page = watermark_pdf.pages[0]

            reader = PdfReader(input_path)
            writer = PdfWriter()

            for page in reader.pages:
                page.merge_page(watermark_page)
                writer.add_page(page)

            # Write back to same path (or temp) - overriding input_path effectively
            with open(input_path, "wb") as f:
                writer.write(f)
                
        except Exception as e:
            logger.error(f"Failed to apply watermark: {e}")
            # Non-blocking failure? Or fail job? 
            # Ideally strict enforcement means fail if watermark fails.
            raise e

    def execute(self) -> dict:
        """
        Main execution flow.
        
        Returns:
            dict: Result with status and output info
        """
        from apps.files.state_machine.transitions import transition
        from apps.jobs.models.job import JobLog
        
        self.load_job()
        
        if self.is_already_processed():
            return self.job.result
        
        self.job.mark_started()
        transition(self.file_asset, 'PROCESSING')
        
        input_path = None
        output_path = None
        
        try:
            input_path = self.fetch_input_file()
            output_path = input_path + '.output'
            
            self.transform(input_path, output_path, self.job.parameters)
            
            # WATERMARK CHECK
            # If Free tier, apply watermark to the OUTPUT (if it's a PDF)
            # Not all tools output PDF (e.g. PDF to Word), but assuming PDF output for now
            # or check extension.
            # Ideally we check the output format.
            if hasattr(self.job.user, 'subscription_tier') and self.job.user.subscription_tier == 'FREE':
                # Check if output is PDF
                # We can peek signature or check ext. Assume PDF for now as primary output of most tools
                if output_path.endswith('.pdf') or self.file_asset.storage_path.endswith('.pdf'): # Simplistic check
                     self.apply_watermark(output_path)
            
            if not self.validate_output(output_path):
                raise FileProcessingError("Output validation failed")
            
            result = self.upload_output(output_path)
            
            transition(self.file_asset, 'AVAILABLE')
            self.job.mark_completed(result)
            
            JobLog.objects.create(
                job=self.job,
                level='INFO',
                message=f"Completed successfully in {self.job.duration_seconds:.2f}s"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Worker {self.name} failed: {e}", exc_info=True)
            
            transition(self.file_asset, 'FAILED')
            self.job.mark_failed(str(e))
            
            JobLog.objects.create(
                job=self.job,
                level='ERROR',
                message=str(e)
            )
            
            return {'status': 'failed', 'error': str(e)}
            
        finally:
            self.cleanup()


class ConversionWorker(BaseWorker):
    """Worker for file format conversions."""
    name = "conversion"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """Execute file format conversion."""
        conversion_type = parameters.get('type', 'pdf')
        
        if conversion_type in ('word', 'docx'):
            # PDF to Word using pdf2docx
            from pdf2docx import Converter
            cv = Converter(input_path)
            cv.convert(output_path)
            cv.close()
            
        elif conversion_type in ('excel', 'xlsx'):
            # PDF to Excel - extract tables
            import tabula
            import pandas as pd
            dfs = tabula.read_pdf(input_path, pages='all', multiple_tables=True)
            with pd.ExcelWriter(output_path) as writer:
                for i, df in enumerate(dfs):
                    df.to_excel(writer, sheet_name=f'Table_{i+1}', index=False)
                    
        elif conversion_type in ('jpg', 'png', 'image'):
            # PDF to images
            import fitz
            doc = fitz.open(input_path)
            for i, page in enumerate(doc):
                pix = page.get_pixmap(dpi=150)
                img_path = output_path.replace('.output', f'_page_{i+1}.{conversion_type}')
                pix.save(img_path)
            doc.close()
            # For single output, create first page
            if doc.page_count > 0:
                doc = fitz.open(input_path)
                pix = doc[0].get_pixmap(dpi=150)
                pix.save(output_path)
                doc.close()
                
        elif conversion_type == 'html':
            # PDF to HTML
            import fitz
            doc = fitz.open(input_path)
            html_content = []
            for page in doc:
                html_content.append(page.get_text('html'))
            doc.close()
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(html_content))
                
        elif conversion_type == 'pdfa':
            # PDF to PDF/A for archiving
            import subprocess
            result = subprocess.run([
                'gs', '-dPDFA=2', '-dBATCH', '-dNOPAUSE',
                '-sColorConversionStrategy=UseDeviceIndependentColor',
                f'-sOutputFile={output_path}',
                '-sDEVICE=pdfwrite',
                '-dPDFACompatibilityPolicy=1',
                input_path
            ], capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                raise FileProcessingError(f"PDF/A conversion failed: {result.stderr}")
                
        else:
            # Default: copy input to output
            import shutil
            shutil.copy(input_path, output_path)


class CompressionWorker(BaseWorker):
    """Worker for file compression."""
    name = "compression"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """Execute PDF compression."""
        quality = parameters.get('quality', 'medium')
        
        # Quality presets
        quality_settings = {
            'extreme': {'dpi': 72, 'image_quality': 30},
            'high': {'dpi': 100, 'image_quality': 50},
            'medium': {'dpi': 150, 'image_quality': 70},
            'low': {'dpi': 200, 'image_quality': 85},
        }
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        import subprocess
        result = subprocess.run([
            'gs', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4',
            '-dPDFSETTINGS=/ebook',  # Can be /screen, /ebook, /printer, /prepress
            f'-dDownsampleColorImages=true',
            f'-dColorImageResolution={settings["dpi"]}',
            f'-dDownsampleGrayImages=true',
            f'-dGrayImageResolution={settings["dpi"]}',
            f'-dDownsampleMonoImages=true',
            f'-dMonoImageResolution={settings["dpi"]}',
            '-dNOPAUSE', '-dQUIET', '-dBATCH',
            f'-sOutputFile={output_path}',
            input_path
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise FileProcessingError(f"Compression failed: {result.stderr}")


class EditingWorker(BaseWorker):
    """Worker for file editing (merge, split, rotate, etc)."""
    name = "editing"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """Execute PDF editing operations."""
        operation = parameters.get('operation', 'copy')
        
        import fitz
        
        if operation == 'merge':
            # Merge multiple PDFs
            writer = fitz.open()
            files = parameters.get('files', [input_path])
            for f in files:
                doc = fitz.open(f)
                writer.insert_pdf(doc)
                doc.close()
            writer.save(output_path)
            writer.close()
            
        elif operation == 'split':
            # Split PDF by pages
            pages = parameters.get('pages', '1')  # e.g., "1,3-5,8"
            doc = fitz.open(input_path)
            writer = fitz.open()
            
            for range_str in pages.split(','):
                range_str = range_str.strip()
                if '-' in range_str:
                    start, end = range_str.split('-')
                    for p in range(int(start)-1, int(end)):
                        if 0 <= p < len(doc):
                            writer.insert_pdf(doc, from_page=p, to_page=p)
                else:
                    p = int(range_str) - 1
                    if 0 <= p < len(doc):
                        writer.insert_pdf(doc, from_page=p, to_page=p)
            
            writer.save(output_path)
            writer.close()
            doc.close()
            
        elif operation == 'rotate':
            # Rotate pages
            angle = parameters.get('angle', 90)
            pages = parameters.get('pages', 'all')
            doc = fitz.open(input_path)
            
            if pages == 'all':
                page_list = range(len(doc))
            else:
                page_list = [int(p)-1 for p in pages.split(',')]
            
            for p in page_list:
                if 0 <= p < len(doc):
                    doc[p].set_rotation(angle)
            
            doc.save(output_path)
            doc.close()
            
        elif operation == 'delete':
            # Delete specific pages
            pages_to_delete = parameters.get('pages', [])
            doc = fitz.open(input_path)
            
            # Convert to 0-indexed and sort descending
            pages_to_delete = sorted([int(p)-1 for p in pages_to_delete], reverse=True)
            for p in pages_to_delete:
                if 0 <= p < len(doc):
                    doc.delete_page(p)
            
            doc.save(output_path)
            doc.close()
            
        elif operation == 'reorder':
            # Reorder pages
            new_order = parameters.get('order', [])  # e.g., [3, 1, 2]
            doc = fitz.open(input_path)
            writer = fitz.open()
            
            for p in new_order:
                p_idx = int(p) - 1
                if 0 <= p_idx < len(doc):
                    writer.insert_pdf(doc, from_page=p_idx, to_page=p_idx)
            
            writer.save(output_path)
            writer.close()
            doc.close()
            
        else:
            # Default: copy
            import shutil
            shutil.copy(input_path, output_path)


class SecurityWorker(BaseWorker):
    """Worker for security operations (encrypt, decrypt, sign)."""
    name = "security"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """Execute PDF security operations."""
        operation = parameters.get('operation', 'encrypt')
        
        import fitz
        
        if operation == 'encrypt':
            password = parameters.get('password', '')
            owner_password = parameters.get('owner_password', password)
            permissions = parameters.get('permissions', fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY)
            
            doc = fitz.open(input_path)
            doc.save(
                output_path,
                encryption=fitz.PDF_ENCRYPT_AES_256,
                owner_pw=owner_password,
                user_pw=password,
                permissions=permissions
            )
            doc.close()
            
        elif operation == 'decrypt':
            password = parameters.get('password', '')
            doc = fitz.open(input_path)
            
            if doc.is_encrypted:
                if not doc.authenticate(password):
                    raise FileProcessingError("Invalid password")
            
            doc.save(output_path)
            doc.close()
            
        elif operation == 'add_signature':
            # Add visual signature/stamp
            signature_path = parameters.get('signature_path', '')
            position = parameters.get('position', {'page': 0, 'x': 100, 'y': 100, 'width': 200, 'height': 50})
            
            doc = fitz.open(input_path)
            page = doc[position.get('page', 0)]
            
            rect = fitz.Rect(
                position['x'],
                position['y'],
                position['x'] + position['width'],
                position['y'] + position['height']
            )
            
            if signature_path and os.path.exists(signature_path):
                page.insert_image(rect, filename=signature_path)
            else:
                # Text stamp
                stamp_text = parameters.get('stamp_text', 'SIGNED')
                page.insert_text(fitz.Point(position['x'], position['y'] + 20), stamp_text, fontsize=16)
            
            doc.save(output_path)
            doc.close()
            
        else:
            import shutil
            shutil.copy(input_path, output_path)


class AIWorker(BaseWorker):
    """Worker for AI operations (OCR, summarize, etc)."""
    name = "ai"
    timeout_seconds = 600  # AI ops can take longer
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """Execute AI-powered PDF operations."""
        operation = parameters.get('operation', 'ocr')
        
        if operation == 'ocr':
            language = parameters.get('language', 'eng')
            deskew = parameters.get('deskew', True)
            
            import subprocess
            cmd = ['ocrmypdf', '--skip-text']
            
            if deskew:
                cmd.append('--deskew')
            
            cmd.extend(['-l', language])
            cmd.extend([input_path, output_path])
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=self.timeout_seconds)
            
            # Return codes: 0=success, 6=already has text but created output
            if result.returncode not in (0, 6):
                raise FileProcessingError(f"OCR failed: {result.stderr}")
                
        elif operation == 'extract_text':
            # Extract text from PDF
            import fitz
            doc = fitz.open(input_path)
            text = []
            for page in doc:
                text.append(page.get_text())
            doc.close()
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(text))
                
        elif operation == 'extract_images':
            # Extract all images from PDF
            import fitz
            import zipfile
            
            doc = fitz.open(input_path)
            with zipfile.ZipFile(output_path, 'w') as zf:
                for page_num, page in enumerate(doc):
                    images = page.get_images()
                    for img_idx, img in enumerate(images):
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]
                        zf.writestr(f"page{page_num+1}_img{img_idx+1}.{image_ext}", image_bytes)
            doc.close()
            
        else:
            import shutil
            shutil.copy(input_path, output_path)


class RepairWorker(BaseWorker):
    """Worker for file repair operations."""
    name = "repair"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """Execute PDF repair operations."""
        repair_type = parameters.get('type', 'basic')
        
        if repair_type == 'ghostscript':
            # Use Ghostscript to repair/rewrite PDF
            import subprocess
            result = subprocess.run([
                'gs', '-o', output_path, '-sDEVICE=pdfwrite',
                '-dPDFSETTINGS=/prepress',
                input_path
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise FileProcessingError(f"Repair failed: {result.stderr}")
                
        elif repair_type == 'pikepdf':
            # Use pikepdf to repair
            import pikepdf
            try:
                pdf = pikepdf.open(input_path)
                pdf.save(output_path)
                pdf.close()
            except pikepdf.PdfError as e:
                # Try permissive open
                pdf = pikepdf.open(input_path, allow_overwriting_input=True)
                pdf.save(output_path)
                pdf.close()
                
        else:
            # Basic repair using PyMuPDF
            import fitz
            doc = fitz.open(input_path)
            doc.save(output_path, garbage=4, deflate=True, clean=True)
            doc.close()

