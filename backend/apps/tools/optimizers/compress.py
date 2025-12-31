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
    Compress PDF to reduce file size with maximum compression.
    
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
    
    # Enhanced compression settings
    gs_options = [
        'gs', '-sDEVICE=pdfwrite',
        f'-dPDFSETTINGS={quality}',
        '-dNOPAUSE', '-dQUIET', '-dBATCH',
        '-dCompatibilityLevel=1.4',
        '-dCompressFonts=true',
        '-dSubsetFonts=true',
        '-dCompressPages=true',
        '-dOptimize=true',
        '-dEmbedAllFonts=false',
        '-dDownsampleColorImages=true',
        '-dDownsampleGrayImages=true',
        '-dDownsampleMonoImages=true',
        '-dColorImageResolution=150',
        '-dGrayImageResolution=150',
        '-dMonoImageResolution=150',
        f'-sOutputFile={output_path}',
        input_path
    ]
    
    # For extreme compression, use more aggressive settings
    if level == 'low' or level == 'extreme':
        gs_options[3] = '-dCompatibilityLevel=1.3'
        gs_options[13] = '-dColorImageResolution=72'
        gs_options[14] = '-dGrayImageResolution=72'
        gs_options[15] = '-dMonoImageResolution=72'
    
    try:
        result = subprocess.run(gs_options, capture_output=True, text=True, timeout=300)
        
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
