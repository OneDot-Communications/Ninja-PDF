"""
PDF Compression Tool
Pure transformation - no Django, no DB.
"""
import subprocess
import logging

logger = logging.getLogger(__name__)


QUALITY_PRESETS = {
    'low': '/ebook',
    'medium': '/printer',
    'high': '/prepress',
}


def compress(input_path: str, output_path: str, level: str = 'medium', **parameters) -> dict:
    """
    Compress PDF to reduce file size.
    
    Args:
        input_path: Path to input PDF
        output_path: Path for compressed PDF
        level: Compression level ('low', 'medium', 'high')
        
    Returns:
        dict: {success, original_size, compressed_size, ratio}
    """
    import os
    
    quality = QUALITY_PRESETS.get(level, '/ebook')
    original_size = os.path.getsize(input_path)
    
    try:
        result = subprocess.run([
            'gs', '-sDEVICE=pdfwrite',
            f'-dPDFSETTINGS={quality}',
            '-dNOPAUSE', '-dQUIET', '-dBATCH',
            f'-sOutputFile={output_path}',
            input_path
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise Exception(f"Ghostscript error: {result.stderr}")
        
        compressed_size = os.path.getsize(output_path)
        ratio = round((1 - compressed_size / original_size) * 100, 2)
        
        logger.info(f"Compressed PDF: {original_size} -> {compressed_size} ({ratio}% reduction)")
        
        return {
            'success': True,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'reduction_percent': ratio,
        }
        
    except subprocess.TimeoutExpired:
        return {'success': False, 'message': 'Compression timed out'}
    except Exception as e:
        logger.error(f"Compression failed: {e}")
        return {'success': False, 'message': str(e)}
