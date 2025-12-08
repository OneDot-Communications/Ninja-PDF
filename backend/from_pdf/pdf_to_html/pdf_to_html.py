# pdf_to_html.py
"""
PDF to HTML conversion module.
Converts PDF pages to images and embeds them in a single HTML file with base64 encoding.
This ensures easy sharing without requiring ZIP files or external image files.
"""

import os
import base64
import io
import fitz  # PyMuPDF
from PIL import Image


def parse_page_range(page_range, total_pages):
    """
    Parse page range string and return list of 1-based page numbers.
    
    Args:
        page_range: String like "1,3-5,8" or "all"
        total_pages: Total number of pages in PDF
    
    Returns:
        list: List of page numbers (1-based)
    """
    if not page_range or page_range.lower() == 'all':
        return list(range(1, total_pages + 1))
    
    pages = set()
    parts = page_range.split(',')
    
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start, end = map(int, part.split('-'))
                start = max(1, start)
                end = min(total_pages, end)
                for i in range(start, end + 1):
                    pages.add(i)
            except ValueError:
                continue
        else:
            try:
                page = int(part)
                if 1 <= page <= total_pages:
                    pages.add(page)
            except ValueError:
                continue
    
    return sorted(list(pages))


def pdf_page_to_base64_image(pdf_doc, page_num, dpi=150):
    """
    Convert a PDF page to base64-encoded PNG image.
    
    Args:
        pdf_doc: PyMuPDF document object
        page_num: Page number (1-based)
        dpi: DPI for rendering (higher = better quality but larger file)
    
    Returns:
        str: Base64-encoded PNG image data URI
    """
    page = pdf_doc[page_num - 1]  # Convert to 0-based
    
    # Calculate zoom factor for desired DPI
    zoom = dpi / 72.0  # PDF default is 72 DPI
    mat = fitz.Matrix(zoom, zoom)
    
    # Render page to pixmap
    pix = page.get_pixmap(matrix=mat, alpha=False)
    
    # Convert to PNG bytes
    img_bytes = pix.tobytes("png")
    
    # Encode to base64
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    
    return f"data:image/png;base64,{img_base64}"


def generate_html_with_embedded_images(pages_data, pdf_filename, format_option='html-single'):
    """
    Generate a single HTML file with all PDF pages embedded as base64 images.
    
    Args:
        pages_data: List of tuples (page_num, base64_image_data)
        pdf_filename: Original PDF filename for the title
        format_option: 'html-single', 'html-responsive', etc.
    
    Returns:
        str: Complete HTML document as string
    """
    is_responsive = 'responsive' in format_option.lower()
    
    # Build HTML
    html_parts = []
    html_parts.append('<!DOCTYPE html>')
    html_parts.append('<html lang="en">')
    html_parts.append('<head>')
    html_parts.append('    <meta charset="UTF-8">')
    html_parts.append('    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
    html_parts.append(f'    <title>{os.path.splitext(pdf_filename)[0]}</title>')
    html_parts.append('    <style>')
    html_parts.append('        * {')
    html_parts.append('            margin: 0;')
    html_parts.append('            padding: 0;')
    html_parts.append('            box-sizing: border-box;')
    html_parts.append('        }')
    html_parts.append('        body {')
    html_parts.append('            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;')
    html_parts.append('            background: #ffffff;')
    html_parts.append('            line-height: 1.6;')
    html_parts.append('        }')
    html_parts.append('        .page {')
    html_parts.append('            position: relative;')
    html_parts.append('            margin: 0 auto;')
    html_parts.append('            background: white;')
    html_parts.append('            box-shadow: 0 0 10px rgba(0,0,0,0.1);')
    html_parts.append('            page-break-after: always;')
    html_parts.append('            overflow: hidden;')
    if is_responsive:
        html_parts.append('            width: 100%;')
        html_parts.append('            max-width: 800px;')
        html_parts.append('            margin-bottom: 20px;')
    else:
        html_parts.append('            width: 800px;')
        html_parts.append('            margin-bottom: 30px;')
    html_parts.append('        }')
    html_parts.append('        .page:last-child {')
    html_parts.append('            page-break-after: avoid;')
    html_parts.append('        }')
    html_parts.append('        .page img {')
    html_parts.append('            width: 100%;')
    html_parts.append('            height: auto;')
    html_parts.append('            display: block;')
    html_parts.append('            border: none;')
    html_parts.append('        }')
    html_parts.append('        @media print {')
    html_parts.append('            body {')
    html_parts.append('                background: white;')
    html_parts.append('            }')
    html_parts.append('            .page {')
    html_parts.append('                box-shadow: none;')
    html_parts.append('                margin: 0;')
    html_parts.append('                width: 100%;')
    html_parts.append('                max-width: none;')
    html_parts.append('                page-break-after: always;')
    html_parts.append('            }')
    html_parts.append('            .page:last-child {')
    html_parts.append('                page-break-after: avoid;')
    html_parts.append('            }')
    html_parts.append('        }')
    html_parts.append('        @media (max-width: 820px) {')
    html_parts.append('            .page {')
    html_parts.append('                width: 100%;')
    html_parts.append('                margin-bottom: 15px;')
    html_parts.append('            }')
    html_parts.append('        }')
    html_parts.append('    </style>')
    html_parts.append('</head>')
    html_parts.append('<body>')
    
    # Add each page without any labels or titles
    for page_num, img_data in pages_data:
        html_parts.append('    <div class="page">')
        html_parts.append(f'        <img src="{img_data}" alt="Page {page_num}">')
        html_parts.append('    </div>')
    
    html_parts.append('</body>')
    html_parts.append('</html>')
    
    return '\n'.join(html_parts)


def convert_pdf_to_html(pdf_file, options=None):
    """
    Convert PDF file to a single HTML file with embedded images.
    
    Args:
        pdf_file: Django UploadedFile or file-like object
        options: Dictionary of conversion options
            - page_range: "1-5, 8" or "all" (default: "all")
            - format: "html-single", "html-responsive" (default: "html-single")
            - dpi: Image quality in DPI (default: 150)
    
    Returns:
        list: [(filename, html_bytes)] - Always returns a single-item list with one HTML file
    """
    if options is None:
        options = {}
    
    # Get options
    page_range = options.get('page_range', 'all')
    format_option = options.get('format', 'html-single')
    dpi = int(options.get('dpi', 150))
    
    # Open PDF
    if hasattr(pdf_file, 'read'):
        pdf_file.seek(0)
        pdf_bytes = pdf_file.read()
        pdf_file.seek(0)
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    else:
        pdf_doc = fitz.open(pdf_file)
    
    try:
        total_pages = pdf_doc.page_count
        
        # Parse page range
        pages_to_convert = parse_page_range(page_range, total_pages)
        
        if not pages_to_convert:
            raise ValueError("No valid pages selected")
        
        # Convert each page to base64 image
        pages_data = []
        for page_num in pages_to_convert:
            img_data = pdf_page_to_base64_image(pdf_doc, page_num, dpi=dpi)
            pages_data.append((page_num, img_data))
        
        # Get original filename
        original_name = getattr(pdf_file, 'name', 'document.pdf')
        
        # Generate single HTML file with all pages
        html_content = generate_html_with_embedded_images(
            pages_data, 
            original_name, 
            format_option
        )
        
        # Generate filename
        filename = os.path.splitext(original_name)[0] + '.html'
        
        # Convert to bytes
        html_bytes = html_content.encode('utf-8')
        
        # Always return as single-item list for consistency with API
        return [(filename, html_bytes)]
    
    finally:
        pdf_doc.close()