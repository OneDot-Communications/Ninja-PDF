"""
Word to PDF Converter
Pure transformation - no Django, no DB.
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
        
        logger.info(f"Converted Word to PDF: {output_path}")
        
        return {'success': True, 'message': 'Conversion complete'}
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'message': 'Conversion timed out'}
    except Exception as e:
        logger.error(f"Word to PDF failed: {e}")
        return {'success': False, 'message': str(e)}
