"""
PDF Compression Tool
Uses PyMuPDF (fitz) and Pillow to downsample and compress images.
"""
import logging
import fitz # PyMuPDF
from PIL import Image
import io
import os

logger = logging.getLogger(__name__)

def compress_file(input_path: str, output_path: str, level: str = 'recommended') -> dict:
    """
    Compress PDF file on disk using PyMuPDF + Pillow Image Resamping.
    
    Args:
        input_path: Path to input PDF
        output_path: Path for compressed PDF
        level: Compression level ('recommended', 'extreme', etc)
    """
    
    original_size = os.path.getsize(input_path)
    
    # Compression Configuration
    if level == 'extreme':
        max_dim = 800
        jpeg_quality = 50
        dpi_target = 72
    elif level == 'recommended':
        max_dim = 1600
        jpeg_quality = 70
        dpi_target = 150
    elif level == 'low':
        max_dim = 2000
        jpeg_quality = 85
        dpi_target = 200
    else: # medium/high
        max_dim = 2000
        jpeg_quality = 80
        dpi_target = 200

    try:
        doc = fitz.open(input_path)
        
        # Track processed images to avoid duplicate work on shared resources
        processed_xrefs = set()
        
        # Iterate over all pages
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images()
            
            for img_info in image_list:
                xref = img_info[0]
                
                if xref in processed_xrefs:
                    continue
                
                processed_xrefs.add(xref)
                
                try:
                    # Extract image
                    # extract_image returns: {'ext': 'jpeg', 'smask': 0, 'width': 100, 'height': 200, 'colorspace': 3, 'image': b'...'}
                    base_img = doc.extract_image(xref)
                    if not base_img: 
                        continue
                        
                    img_bytes = base_img["image"]
                    img_ext = base_img["ext"]
                    
                    # Skip small images (icons, logos)
                    if len(img_bytes) < 2048: # Skip < 2KB
                        continue
                        
                    # Open in Pillow
                    with Image.open(io.BytesIO(img_bytes)) as pil_img:
                        width, height = pil_img.size
                        
                        # Check if needs resizing
                        if width <= max_dim and height <= max_dim:
                            # Dimensions are small enough.
                            # But if it's a huge PNG/TIFF, we might still want to convert to JPEG?
                            # For now, let's only compress if it looks "big" in bytes or dimensions
                            if len(img_bytes) < 500 * 1024: # If < 500KB and dimensions ok, skip
                                continue
                        
                        # Calculate new size
                        ratio = min(max_dim / width, max_dim / height)
                        if ratio < 1.0:
                            new_width = int(width * ratio)
                            new_height = int(height * ratio)
                            pil_img = pil_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                        
                        # Convert to efficient format
                        # If RGBA, we must handle transparency or save as PNG
                        buffer = io.BytesIO()
                        if pil_img.mode in ('RGBA', 'LA') or (pil_img.mode == 'P' and 'transparency' in pil_img.info):
                            # Keep PNG but optimize
                            pil_img.save(buffer, format="PNG", optimize=True)
                        else:
                            # Convert to specific colorspace if needed, default to JPEG
                            if pil_img.mode != 'RGB' and pil_img.mode != 'L':
                                pil_img = pil_img.convert('RGB')
                            pil_img.save(buffer, format="JPEG", quality=jpeg_quality, optimize=True)
                        
                        new_bytes = buffer.getvalue()
                        
                        # Only update if we actually saved space
                        if len(new_bytes) < len(img_bytes):
                             # Replace the image in the PDF
                             # using stream=... automatically updates the xref
                             page.replace_image(xref, stream=new_bytes)
                             
                except Exception as img_err:
                    logger.warning(f"Failed to compress image xref {xref}: {img_err}")
                    continue

        # Save with garbage collection
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()

        compressed_size = os.path.getsize(output_path)
        
        # Fallback: If compressed is somehow bigger (rare), return original
        if compressed_size >= original_size:
             import shutil
             shutil.copy2(input_path, output_path)
             compressed_size = original_size

        ratio = round((1 - compressed_size / original_size) * 100, 2)
        logger.info(f"Compressed PDF (PyMuPDF Advanced): {original_size} -> {compressed_size} ({ratio}% reduction)")
        
        return {
            'success': True,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'reduction_percent': ratio,
        }
        
    except Exception as e:
        logger.error(f"Compression failed: {e}")
        raise e


def compress_pdf(file_obj, level: str = 'recommended') -> bytes:
    """
    Helper to handle In-Memory/Temp uploaded file -> compression -> bytes.
    Used by API Views.
    """
    import tempfile
    
    # Create temp input file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_in:
        for chunk in file_obj.chunks():
            tmp_in.write(chunk)
        input_path = tmp_in.name

    # Create temp output file path
    # We close it immediately
    fd, output_path = tempfile.mkstemp(suffix='.pdf')
    os.close(fd)
    
    try:
        # Perform compression
        compress_file(input_path, output_path, level)
        
        # Read result
        with open(output_path, 'rb') as f:
            compressed_content = f.read()
            
        return compressed_content
        
    except Exception as e:
        raise e
        
    finally:
        # Cleanup
        if os.path.exists(input_path):
            try:
                os.unlink(input_path)
            except: pass
        if os.path.exists(output_path):
            try:
                os.unlink(output_path)
            except: pass
