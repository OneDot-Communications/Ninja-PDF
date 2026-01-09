"""
Office Document Converters
Use Gotenberg (LibreOffice-based) for reliable document conversion of Excel, PowerPoint, and other formats.
Fallback to local LibreOffice if Gotenberg is unavailable.
"""
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)


class LibreOfficeConverter:
    """
    Universal document converter using LibreOffice headless mode.
    Supports: .xlsx, .xls, .pptx, .ppt, .doc, .docx, .odt, .ods, .odp, .html, .rtf
    """
    
    TIMEOUT_SECONDS = 180  # 3 minutes
    
    @classmethod
    def convert_to_pdf(cls, input_bytes: bytes, input_format: str, output_path: str = None) -> bytes:
        """
        Convert a document to PDF using LibreOffice.
        
        Args:
            input_bytes: Document content as bytes
            input_format: File extension (e.g., 'xlsx', 'pptx')
            output_path: Optional specific output path
        
        Returns:
            PDF content as bytes
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write input file
            input_file = os.path.join(tmpdir, f'input.{input_format}')
            with open(input_file, 'wb') as f:
                f.write(input_bytes)
            
            # Run LibreOffice
            result = subprocess.run(
                [
                    'libreoffice',
                    '--headless',
                    '--invisible',
                    '--nologo',
                    '--nofirststartwizard',
                    '--convert-to', 'pdf',
                    '--outdir', tmpdir,
                    input_file
                ],
                capture_output=True,
                text=True,
                timeout=cls.TIMEOUT_SECONDS
            )
            
            if result.returncode != 0:
                raise Exception(f"LibreOffice conversion failed: {result.stderr}")
            
            # Read output
            output_file = os.path.join(tmpdir, 'input.pdf')
            if not os.path.exists(output_file):
                raise Exception("PDF output not generated")
            
            with open(output_file, 'rb') as f:
                return f.read()


def convert_excel_to_pdf(file) -> bytes:
    """
    Convert Excel spreadsheet to PDF.
    Uses Gotenberg as primary converter, with fallbacks.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        content = file.read()
        
        # Determine format from filename
        filename = getattr(file, 'name', 'input.xlsx')
        ext = filename.rsplit('.', 1)[-1].lower()
        if ext not in ('xlsx', 'xls', 'ods'):
            ext = 'xlsx'
        
        # Try Gotenberg first (best quality, recommended)
        try:
            from apps.tools.converters.gotenberg_converter import GotenbergConverter
            return GotenbergConverter.convert_to_pdf(
                input_bytes=content,
                filename=filename,
                landscape=True  # Excel looks better in landscape
            )
        except Exception as gotenberg_error:
            logger.warning(f"Gotenberg conversion failed for Excel: {gotenberg_error}")
        
        # Fallback to local LibreOffice
        try:
            return LibreOfficeConverter.convert_to_pdf(content, ext)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            # LibreOffice not available or timeout, use Python fallback
            logger.warning(f"LibreOffice conversion failed, using Python fallback: {e}")
            try:
                from apps.tools.converters.python_office_converter import convert_excel_to_pdf_python
                file.seek(0)  # Reset file pointer
                return convert_excel_to_pdf_python(file)
            except Exception as fallback_error:
                logger.error(f"Python fallback also failed: {fallback_error}")
                raise Exception(f"Excel conversion failed: {fallback_error}")
    except Exception as e:
        logger.error(f"Excel to PDF failed: {e}")
        raise


def convert_powerpoint_to_pdf(file) -> bytes:
    """
    Convert PowerPoint presentation to PDF.
    Uses Gotenberg as primary converter, with fallbacks.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        content = file.read()
        
        # Determine format from filename
        filename = getattr(file, 'name', 'input.pptx')
        ext = filename.rsplit('.', 1)[-1].lower()
        if ext not in ('pptx', 'ppt', 'odp'):
            ext = 'pptx'
        
        # Try Gotenberg first (best quality, recommended)
        try:
            from apps.tools.converters.gotenberg_converter import GotenbergConverter
            return GotenbergConverter.convert_to_pdf(
                input_bytes=content,
                filename=filename,
                landscape=True  # Presentations are typically landscape
            )
        except Exception as gotenberg_error:
            logger.warning(f"Gotenberg conversion failed for PowerPoint: {gotenberg_error}")
        
        # Fallback to local LibreOffice
        try:
            return LibreOfficeConverter.convert_to_pdf(content, ext)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"LibreOffice not available, using image-based converter: {e}")
            # Use the image-based converter as last resort
            try:
                from apps.tools.converters.pptx_converter import convert_powerpoint_to_pdf_best
                file.seek(0)
                return convert_powerpoint_to_pdf_best(file)
            except Exception as fallback_error:
                logger.error(f"Image-based converter failed: {fallback_error}")
                raise Exception(f"PowerPoint conversion failed: {fallback_error}")
    except Exception as e:
        logger.error(f"PowerPoint to PDF failed: {e}")
        raise Exception(f"PowerPoint conversion failed: {str(e)}")


def convert_html_to_pdf(file) -> bytes:
    """
    Convert HTML to PDF using WeasyPrint for better rendering.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        from weasyprint import HTML, CSS
        
        content = file.read()
        if isinstance(content, bytes):
            html_content = content.decode('utf-8')
        else:
            html_content = content
        
        # Create PDF from HTML
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf()
        
        return pdf_bytes
    except ImportError:
        # Fallback to LibreOffice if WeasyPrint not available
        logger.warning("WeasyPrint not available, using LibreOffice for HTML to PDF")
        content = file.read() if hasattr(file, 'read') else file
        if isinstance(content, str):
            content = content.encode('utf-8')
        return LibreOfficeConverter.convert_to_pdf(content, 'html')
    except Exception as e:
        logger.error(f"HTML to PDF failed: {e}")
        raise


def convert_markdown_to_pdf(file) -> bytes:
    """
    Convert Markdown to PDF via HTML intermediate.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        import markdown
        from weasyprint import HTML, CSS
        
        content = file.read()
        if isinstance(content, bytes):
            md_content = content.decode('utf-8')
        else:
            md_content = content
        
        # Convert Markdown to HTML
        html_content = markdown.markdown(
            md_content,
            extensions=['tables', 'fenced_code', 'codehilite']
        )
        
        # Wrap in basic HTML structure with styling
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 0 20px;
                }}
                h1, h2, h3 {{ color: #333; }}
                code {{ 
                    background: #f4f4f4; 
                    padding: 2px 6px; 
                    border-radius: 3px;
                }}
                pre {{ 
                    background: #f4f4f4; 
                    padding: 16px; 
                    overflow-x: auto;
                    border-radius: 6px;
                }}
                table {{ 
                    border-collapse: collapse; 
                    width: 100%;
                    margin: 20px 0;
                }}
                th, td {{ 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left;
                }}
                th {{ background: #f4f4f4; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        # Create PDF
        html = HTML(string=full_html)
        pdf_bytes = html.write_pdf()
        
        return pdf_bytes
    except ImportError as e:
        raise Exception(f"Required library not available: {e}")
    except Exception as e:
        logger.error(f"Markdown to PDF failed: {e}")
        raise
