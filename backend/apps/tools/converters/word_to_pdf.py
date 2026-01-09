"""
Word to PDF Converter
Pure transformation - no Django, no DB.
Uses Gotenberg (LibreOffice-based) for best results.
"""
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)


def convert(input_path: str, output_path: str, **parameters) -> dict:
    """
    Convert Word document to PDF.
    
    Args:
        input_path: Path to input .docx file
        output_path: Path where PDF will be saved
        
    Returns:
        dict: {success, pages, message}
    """
    try:
        # Try Gotenberg first (best quality)
        try:
            from apps.tools.converters.gotenberg_converter import GotenbergConverter
            
            with open(input_path, 'rb') as f:
                content = f.read()
            
            filename = os.path.basename(input_path)
            pdf_bytes = GotenbergConverter.convert_to_pdf(content, filename)
            
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            
            logger.info(f"Converted Word to PDF via Gotenberg: {output_path}")
            return {'success': True, 'message': 'Conversion complete (Gotenberg)'}
            
        except Exception as gotenberg_error:
            logger.warning(f"Gotenberg conversion failed, trying LibreOffice: {gotenberg_error}")
        
        # Fallback to local LibreOffice
        output_dir = os.path.dirname(output_path)
        
        result = subprocess.run(
            ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', output_dir, input_path],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            raise Exception(f"LibreOffice error: {result.stderr}")
        
        temp_output = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + '.pdf')
        if temp_output != output_path:
            os.rename(temp_output, output_path)
        
        logger.info(f"Converted Word to PDF via LibreOffice: {output_path}")
        
        return {'success': True, 'message': 'Conversion complete (LibreOffice)'}
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'message': 'Conversion timed out'}
    except Exception as e:
        logger.error(f"Word to PDF failed: {e}")
        return {'success': False, 'message': str(e)}


def convert_word_to_pdf(file) -> bytes:
    """
    Convert Word document to PDF (API wrapper).
    Uses Gotenberg as primary converter, with fallbacks.
    
    Args:
        file: Django UploadedFile or file-like object
    
    Returns:
        PDF bytes
    """
    try:
        content = file.read()
        
        # Determine format from filename
        filename = getattr(file, 'name', 'input.docx')
        ext = filename.rsplit('.', 1)[-1].lower()
        if ext not in ('docx', 'doc', 'odt', 'rtf'):
            ext = 'docx'
        
        # Try Gotenberg first (best quality, recommended)
        try:
            from apps.tools.converters.gotenberg_converter import GotenbergConverter
            return GotenbergConverter.convert_to_pdf(content, filename)
        except Exception as gotenberg_error:
            logger.warning(f"Gotenberg conversion failed: {gotenberg_error}")
        
        # Fallback to local LibreOffice
        try:
            from apps.tools.converters.office_converter import LibreOfficeConverter
            return LibreOfficeConverter.convert_to_pdf(content, ext)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            # LibreOffice not available, use Python fallback
            logger.warning(f"LibreOffice conversion failed, using Python fallback: {e}")
            from apps.tools.converters.python_office_converter import convert_word_to_pdf_python
            file.seek(0)  # Reset file pointer
            return convert_word_to_pdf_python(file)
            
    except Exception as e:
        logger.error(f"Word to PDF conversion failed: {e}")
        raise
