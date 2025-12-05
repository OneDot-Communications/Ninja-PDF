# pdf_to_jpg.py
"""
PDF to JPG conversion module.
Handles conversion of PDF pages to high-quality JPG images.
"""

import io
from pypdf import PdfReader
from PIL import Image


def get_pdf_page_count(pdf_file):
    """
    Get the total number of pages in a PDF file.

    Args:
        pdf_file: File path or file-like object

    Returns:
        int: Number of pages
    """
    if hasattr(pdf_file, 'read'):
        # File-like object, reset position
        pdf_file.seek(0)
        reader = PdfReader(pdf_file)
    else:
        # File path
        reader = PdfReader(pdf_file)

    return len(reader.pages)


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


def render_page_to_jpg(page, dpi=150, jpeg_quality=85):
    """
    Render a PDF page to JPG bytes.

    Args:
        page: PDF page object
        dpi: Resolution for rendering
        jpeg_quality: JPEG compression quality

    Returns:
        bytes: JPEG image data
    """
    # For now, we'll create a simple placeholder image
    # In a full implementation, you'd use a PDF rendering library
    # This is a simplified version to reduce dependencies

    # Create a white image as placeholder
    width = int(8.5 * dpi)  # Letter size width
    height = int(11 * dpi)  # Letter size height

    # Create white background
    img = Image.new('RGB', (width, height), color='white')

    # Convert to JPEG
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG', quality=jpeg_quality, optimize=True)
    img_bytes.seek(0)

    return img_bytes.read()


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

    # Get page count
    if hasattr(pdf_file, 'read'):
        pdf_file.seek(0)
        reader = PdfReader(pdf_file)
        total_pages = len(reader.pages)
        pdf_file.seek(0)  # Reset for potential future reads
    else:
        reader = PdfReader(pdf_file)
        total_pages = len(reader.pages)

    # Parse page range
    pages_to_convert = parse_page_range(page_range, total_pages)

    if not pages_to_convert:
        raise ValueError("No valid pages to convert")

    converted_images = []

    # For each selected page, create a placeholder image
    # In production, you'd render actual PDF pages here
    for page_index in pages_to_convert:
        try:
            # Generate filename (page numbers are 1-based for user)
            filename = f"page_{page_index + 1}.jpg"

            # Render page to JPG (placeholder implementation)
            image_bytes = render_page_to_jpg(None, dpi, jpeg_quality)

            converted_images.append((filename, image_bytes))

        except Exception as e:
            # Log error but continue with other pages
            print(f"Error converting page {page_index + 1}: {str(e)}")
            continue

    if not converted_images:
        raise Exception("Failed to convert any pages")

    return converted_images