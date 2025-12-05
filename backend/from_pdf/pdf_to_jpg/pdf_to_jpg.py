# pdf_to_jpg.py
"""
PDF to JPG conversion module.
Handles conversion of PDF pages to high-quality JPG images using PyMuPDF (fitz).
"""

import io
import fitz  # PyMuPDF
from PIL import Image


def get_pdf_page_count(pdf_file):
    """
    Get the total number of pages in a PDF file.

    Args:
        pdf_file: File path or file-like object

    Returns:
        int: Number of pages
    """
    doc = None
    try:
        if hasattr(pdf_file, 'read'):
            # File-like object
            pdf_file.seek(0)
            stream = pdf_file.read()
            pdf_file.seek(0)  # Reset position
            doc = fitz.open(stream=stream, filetype="pdf")
        else:
            # File path
            doc = fitz.open(pdf_file)

        return doc.page_count
    except Exception as e:
        print(f"Error getting page count: {e}")
        return 0
    finally:
        if doc:
            doc.close()


def parse_page_range(page_range, total_pages):
    """
    Parse page range string and return list of page indices.

    Args:
        page_range: String like "1,3,5" or "all"
        total_pages: Total number of pages in PDF

    Returns:
        List of page indices (0-based)
    """
    if not page_range or page_range.strip().lower() == "all":
        return list(range(total_pages))

    pages = set()
    page_numbers = page_range.split(",")

    for page_num in page_numbers:
        try:
            page = int(page_num.strip())
            # Convert to 0-based index
            if 1 <= page <= total_pages:
                pages.add(page - 1)
        except ValueError:
            continue

    return sorted(list(pages))


def get_quality_settings(quality_level):
    """
    Get DPI and JPEG quality settings based on quality level.

    Args:
        quality_level: "low", "medium", "high", "ultra"

    Returns:
        tuple: (dpi, jpeg_quality)
    """
    quality_map = {
        "low": (72, 60),
        "medium": (150, 75),
        "high": (300, 85),
        "ultra": (600, 95)
    }

    return quality_map.get(quality_level.lower(), (150, 75))


def convert_pdf_to_jpg(pdf_file, options=None):
    """
    Convert PDF pages to JPG images.

    Args:
        pdf_file: Path to the PDF file or file-like object (BytesIO)
        options: Dictionary of conversion options:
            - page_range (str): Comma-separated page numbers (e.g., "1,3,5")
            - quality (str): Quality level ("low", "medium", "high", "ultra")

    Returns:
        List of tuples: [(filename, image_bytes), ...]
    """
    if options is None:
        options = {}

    page_range = options.get('page_range', 'all')
    quality_level = options.get('quality', 'medium')

    # Get quality settings
    dpi, jpeg_quality = get_quality_settings(quality_level)

    doc = None
    try:
        # Open PDF
        if hasattr(pdf_file, 'read'):
            pdf_file.seek(0)
            stream = pdf_file.read()
            pdf_file.seek(0)  # Reset for potential future reads
            doc = fitz.open(stream=stream, filetype="pdf")
        else:
            doc = fitz.open(pdf_file)
        
        total_pages = doc.page_count

        # Parse page range
        pages_to_convert = parse_page_range(page_range, total_pages)

        if not pages_to_convert:
            raise ValueError("No valid pages to convert")

        converted_images = []

        # For each selected page, render actual PDF content
        for page_index in pages_to_convert:
            try:
                # Generate filename (page numbers are 1-based for user)
                filename = f"page_{page_index + 1}.jpg"

                # Load page
                page = doc.load_page(page_index)
                
                # Render page to pixmap (image)
                # matrix=fitz.Matrix(zoom, zoom) can be used for scaling, but dpi is better controlled via zoom
                # 72 dpi is default scale=1. So zoom = dpi / 72
                zoom = dpi / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False) # alpha=False for JPG (no transparency)

                # Get image bytes
                # tobytes() supports jpg since v1.14.0
                image_bytes = pix.tobytes("jpg", jpg_quality=jpeg_quality)

                converted_images.append((filename, image_bytes))

            except Exception as e:
                # Log error but continue with other pages
                print(f"Error converting page {page_index + 1}: {str(e)}")
                continue

        if not converted_images:
            raise Exception("Failed to convert any pages")

        return converted_images

    finally:
        if doc:
            doc.close()
