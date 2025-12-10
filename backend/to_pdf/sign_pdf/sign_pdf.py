"""
Sign PDF - Stamp a signature image onto a PDF page.

Uses PyMuPDF (fitz) to insert an image onto a specified page at given coordinates.
Supports PNG/JPEG signature images and base64-encoded data URIs.
"""

import fitz  # PyMuPDF
import tempfile
import os
import base64
import re
from io import BytesIO
from PIL import Image


def decode_base64_image(data_uri: str) -> bytes:
    """
    Decode a base64 data URI to raw image bytes.
    Supports data:image/png;base64,... and data:image/jpeg;base64,...
    """
    # Remove data URI prefix if present
    if data_uri.startswith('data:'):
        # Extract the base64 part
        match = re.match(r'data:image/\w+;base64,(.+)', data_uri)
        if match:
            base64_data = match.group(1)
        else:
            raise ValueError("Invalid data URI format")
    else:
        base64_data = data_uri
    
    return base64.b64decode(base64_data)


def ensure_png_format(image_bytes: bytes) -> bytes:
    """
    Ensure the image is in PNG format for consistent rendering.
    Converts JPEG or other formats to PNG if needed.
    """
    try:
        img = Image.open(BytesIO(image_bytes))
        # Convert to RGBA if not already (for transparency support)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        output = BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")


def sign_pdf(
    pdf_bytes: bytes,
    signature_bytes: bytes,
    page_number: int = 0,
    x: float = None,
    y: float = None,
    width: float = None,
    height: float = None,
    position: str = "bottom-right"
) -> bytes:
    """
    Stamp a signature image onto a PDF page.
    
    Args:
        pdf_bytes: The PDF file as bytes
        signature_bytes: The signature image as bytes (PNG/JPEG)
        page_number: 0-based page index to place signature
        x: X coordinate in PDF points (optional, uses position if not set)
        y: Y coordinate in PDF points (optional, uses position if not set)
        width: Width of signature in PDF points (optional, auto-calculated)
        height: Height of signature in PDF points (optional, auto-calculated)
        position: Preset position if x/y not specified: 
                  "bottom-right", "bottom-left", "bottom-center",
                  "top-right", "top-left", "top-center", "center"
    
    Returns:
        The signed PDF as bytes
    """
    # Ensure signature is PNG format
    signature_bytes = ensure_png_format(signature_bytes)
    
    # Open PDF
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    # Validate page number
    if page_number < 0 or page_number >= len(doc):
        doc.close()
        raise ValueError(f"Invalid page number: {page_number}. PDF has {len(doc)} pages.")
    
    page = doc[page_number]
    page_rect = page.rect
    page_width = page_rect.width
    page_height = page_rect.height
    
    # Get signature image dimensions
    sig_img = Image.open(BytesIO(signature_bytes))
    sig_width, sig_height = sig_img.size
    
    # Calculate default signature size (approximately 20% of page width)
    default_width = page_width * 0.2
    aspect_ratio = sig_height / sig_width
    default_height = default_width * aspect_ratio
    
    # Use provided dimensions or defaults
    final_width = width if width is not None else default_width
    final_height = height if height is not None else default_height
    
    # Calculate position based on preset or explicit coordinates
    margin = 40  # points margin from edge
    
    if x is not None and y is not None:
        final_x = x
        final_y = y
    else:
        # Calculate based on position preset
        positions = {
            "bottom-right": (page_width - final_width - margin, page_height - final_height - margin),
            "bottom-left": (margin, page_height - final_height - margin),
            "bottom-center": ((page_width - final_width) / 2, page_height - final_height - margin),
            "top-right": (page_width - final_width - margin, margin),
            "top-left": (margin, margin),
            "top-center": ((page_width - final_width) / 2, margin),
            "center": ((page_width - final_width) / 2, (page_height - final_height) / 2),
        }
        
        if position not in positions:
            position = "bottom-right"
        
        final_x, final_y = positions[position]
    
    # Create rectangle for signature placement
    rect = fitz.Rect(final_x, final_y, final_x + final_width, final_y + final_height)
    
    # Save signature to temporary file for insertion
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
        tmp_file.write(signature_bytes)
        tmp_path = tmp_file.name
    
    try:
        # Insert the signature image
        page.insert_image(rect, filename=tmp_path, overlay=True)
        
        # Get the output bytes
        output = doc.write()
        doc.close()
        
        return output
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def sign_pdf_normalized(
    pdf_bytes: bytes,
    signature_bytes: bytes,
    page_number: int = 0,
    nx: float = 0.75,
    ny: float = 0.85,
    nwidth: float = 0.2,
    nheight: float = None
) -> bytes:
    """
    Stamp a signature using normalized coordinates (0.0 to 1.0).
    
    Args:
        pdf_bytes: The PDF file as bytes
        signature_bytes: The signature image as bytes
        page_number: 0-based page index
        nx: Normalized X position (0.0 = left edge, 1.0 = right edge)
        ny: Normalized Y position (0.0 = top edge, 1.0 = bottom edge)
        nwidth: Normalized width (0.2 = 20% of page width)
        nheight: Normalized height (auto-calculated from aspect ratio if None)
    
    Returns:
        The signed PDF as bytes
    """
    # Open PDF to get page dimensions
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    if page_number < 0 or page_number >= len(doc):
        doc.close()
        raise ValueError(f"Invalid page number: {page_number}. PDF has {len(doc)} pages.")
    
    page = doc[page_number]
    page_width = page.rect.width
    page_height = page.rect.height
    doc.close()
    
    # Ensure signature is PNG format to get dimensions
    signature_bytes = ensure_png_format(signature_bytes)
    sig_img = Image.open(BytesIO(signature_bytes))
    sig_width, sig_height = sig_img.size
    aspect_ratio = sig_height / sig_width
    
    # Convert normalized to absolute coordinates
    x = nx * page_width
    y = ny * page_height
    width = nwidth * page_width
    
    if nheight is not None:
        height = nheight * page_height
    else:
        height = width * aspect_ratio
    
    return sign_pdf(
        pdf_bytes=pdf_bytes,
        signature_bytes=signature_bytes,
        page_number=page_number,
        x=x,
        y=y,
        width=width,
        height=height
    )


def get_pdf_info(pdf_bytes: bytes) -> dict:
    """
    Get basic PDF information for the UI.
    
    Returns:
        dict with page_count and page dimensions
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    info = {
        "page_count": len(doc),
        "pages": []
    }
    
    for i, page in enumerate(doc):
        info["pages"].append({
            "number": i,
            "width": page.rect.width,
            "height": page.rect.height
        })
    
    doc.close()
    return info
