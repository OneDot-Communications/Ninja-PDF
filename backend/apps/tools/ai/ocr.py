"""
OCR Tool
Pure transformation - no Django, no DB.
"""
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)


def ocr(input_path: str, output_path: str, language: str = 'eng', deskew: bool = True, **parameters) -> dict:
    """
    Perform OCR on scanned PDF to make it searchable.
    
    Args:
        input_path: Path to input PDF
        output_path: Path for OCR'd PDF
        language: Tesseract language code (eng, fra, deu, etc.)
        deskew: Whether to correct skew
        
    Returns:
        dict: {success, pages_processed}
    """
    try:
        cmd = ['ocrmypdf']
        
        if deskew:
            cmd.append('--deskew')
        
        cmd.extend(['-l', language])
        cmd.extend(['--skip-text'])
        cmd.extend([input_path, output_path])
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode not in (0, 6):
            raise Exception(f"OCR error: {result.stderr}")
        
        import pikepdf
        with pikepdf.open(output_path) as pdf:
            page_count = len(pdf.pages)
        
        logger.info(f"OCR complete: {page_count} pages")
        
        return {
            'success': True,
            'pages_processed': page_count,
            'language': language,
        }
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'message': 'OCR timed out'}
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return {'success': False, 'message': str(e)}
