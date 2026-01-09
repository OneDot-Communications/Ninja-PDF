"""
Gotenberg Document Converter
Uses Gotenberg (LibreOffice-based) service for reliable Office-to-PDF conversion.
This is the recommended approach for Excel, Word, and PowerPoint conversions.
"""
import os
import logging
import requests
from typing import Optional
from io import BytesIO

logger = logging.getLogger(__name__)

# Gotenberg URL from environment, fallback to localhost for local development
GOTENBERG_URL = os.environ.get('GOTENBERG_URL', 'http://localhost:3001')


class GotenbergConverter:
    """
    Document converter using Gotenberg service.
    Gotenberg wraps LibreOffice for reliable document conversion.
    
    Supported formats:
    - Word: .doc, .docx, .odt, .rtf
    - Excel: .xls, .xlsx, .ods
    - PowerPoint: .ppt, .pptx, .odp
    - Other: .txt, .html, .csv
    - URL: Any public webpage
    """
    
    TIMEOUT_SECONDS = 120  # 2 minutes timeout
    
    # Gotenberg endpoints
    LIBREOFFICE_ENDPOINT = "/forms/libreoffice/convert"
    CHROMIUM_URL_ENDPOINT = "/forms/chromium/convert/url"
    CHROMIUM_HTML_ENDPOINT = "/forms/chromium/convert/html"
    
    # Supported MIME types mapping
    SUPPORTED_EXTENSIONS = {
        # Word documents
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'odt': 'application/vnd.oasis.opendocument.text',
        'rtf': 'application/rtf',
        # Excel spreadsheets
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ods': 'application/vnd.oasis.opendocument.spreadsheet',
        'csv': 'text/csv',
        # PowerPoint presentations
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'odp': 'application/vnd.oasis.opendocument.presentation',
        # Other
        'txt': 'text/plain',
        'html': 'text/html',
    }
    
    @classmethod
    def is_available(cls) -> bool:
        """Check if Gotenberg service is available."""
        try:
            response = requests.get(
                f"{GOTENBERG_URL}/health",
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Gotenberg health check failed: {e}")
            return False
    
    @classmethod
    def convert_to_pdf(
        cls,
        input_bytes: bytes,
        filename: str,
        content_type: Optional[str] = None,
        landscape: bool = False,
        page_ranges: Optional[str] = None
    ) -> bytes:
        """
        Convert a document to PDF using Gotenberg.
        
        Args:
            input_bytes: Document content as bytes
            filename: Original filename (used to determine format)
            content_type: MIME type of the document (optional)
            landscape: Whether to use landscape orientation
            page_ranges: Page ranges to convert (e.g., "1-3,5")
        
        Returns:
            PDF content as bytes
        
        Raises:
            Exception: If conversion fails
        """
        # Determine content type from extension if not provided
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if not content_type and ext in cls.SUPPORTED_EXTENSIONS:
            content_type = cls.SUPPORTED_EXTENSIONS[ext]
        
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Prepare the multipart form data - Gotenberg expects just the file
        files = {
            'files': (filename, input_bytes, content_type)
        }
        
        # Make request to Gotenberg - minimal parameters for best accuracy
        url = f"{GOTENBERG_URL}{cls.LIBREOFFICE_ENDPOINT}"
        
        try:
            logger.info(f"Converting {filename} to PDF via Gotenberg at {url}")
            
            response = requests.post(
                url,
                files=files,
                timeout=cls.TIMEOUT_SECONDS
            )
            
            if response.status_code != 200:
                error_msg = response.text[:500] if response.text else "Unknown error"
                logger.error(f"Gotenberg conversion failed: {response.status_code} - {error_msg}")
                raise Exception(f"Gotenberg conversion failed: {error_msg}")
            
            pdf_bytes = response.content
            
            if len(pdf_bytes) < 100:
                raise Exception("Converted PDF is too small, conversion may have failed")
            
            logger.info(f"Successfully converted {filename} to PDF ({len(pdf_bytes)} bytes)")
            return pdf_bytes
            
        except requests.exceptions.Timeout:
            logger.error(f"Gotenberg conversion timed out for {filename}")
            raise Exception("Document conversion timed out")
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Cannot connect to Gotenberg: {e}")
            raise Exception("Cannot connect to document conversion service")
        except Exception as e:
            logger.error(f"Gotenberg conversion error: {e}")
            raise

    @classmethod
    def convert_url_to_pdf(
        cls,
        url: str,
        page_size: str = "A4",
        landscape: bool = False,
        margin_top: str = "10mm",
        margin_bottom: str = "10mm",
        margin_left: str = "10mm",
        margin_right: str = "10mm",
        print_background: bool = True,
        wait_delay: str = "2s",
        emulate_media: str = "screen"
    ) -> bytes:
        """
        Convert a URL/webpage to PDF using Gotenberg's Chromium engine.
        
        Args:
            url: The webpage URL to convert
            page_size: Paper size (A4, Letter, Legal, etc.)
            landscape: Whether to use landscape orientation
            margin_top: Top margin (e.g., "10mm", "1in")
            margin_bottom: Bottom margin
            margin_left: Left margin  
            margin_right: Right margin
            print_background: Whether to print background graphics
            wait_delay: Time to wait before conversion (e.g., "2s")
            emulate_media: Media type to emulate ("screen" or "print")
        
        Returns:
            PDF content as bytes
        
        Raises:
            Exception: If conversion fails
        """
        endpoint = f"{GOTENBERG_URL}{cls.CHROMIUM_URL_ENDPOINT}"
        
        # Paper size dimensions (width x height in inches)
        paper_sizes = {
            "A4": ("8.27in", "11.7in"),
            "Letter": ("8.5in", "11in"),
            "Legal": ("8.5in", "14in"),
            "A3": ("11.7in", "16.54in"),
            "A5": ("5.83in", "8.27in"),
        }
        
        paper_width, paper_height = paper_sizes.get(page_size, paper_sizes["A4"])
        
        # Swap dimensions for landscape
        if landscape:
            paper_width, paper_height = paper_height, paper_width
        
        # Build form data as multipart (Gotenberg requires multipart/form-data)
        # Using files parameter with None as file content to send as multipart
        files = {
            "url": (None, url),
            "paperWidth": (None, paper_width),
            "paperHeight": (None, paper_height),
            "marginTop": (None, margin_top),
            "marginBottom": (None, margin_bottom),
            "marginLeft": (None, margin_left),
            "marginRight": (None, margin_right),
            "printBackground": (None, str(print_background).lower()),
            "waitDelay": (None, wait_delay),
            "emulateMediaType": (None, emulate_media),
        }
        
        try:
            logger.info(f"Converting URL to PDF via Gotenberg: {url}")
            
            response = requests.post(
                endpoint,
                files=files,
                timeout=cls.TIMEOUT_SECONDS
            )
            
            if response.status_code != 200:
                error_msg = response.text[:500] if response.text else "Unknown error"
                logger.error(f"Gotenberg URL conversion failed: {response.status_code} - {error_msg}")
                raise Exception(f"Failed to convert URL: {error_msg}")
            
            pdf_bytes = response.content
            
            if len(pdf_bytes) < 100:
                raise Exception("Converted PDF is too small, conversion may have failed")
            
            logger.info(f"Successfully converted URL to PDF ({len(pdf_bytes)} bytes)")
            return pdf_bytes
            
        except requests.exceptions.Timeout:
            logger.error(f"Gotenberg URL conversion timed out for {url}")
            raise Exception("URL conversion timed out. The webpage may be too complex or slow to load.")
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Cannot connect to Gotenberg: {e}")
            raise Exception("Cannot connect to document conversion service")
        except Exception as e:
            logger.error(f"Gotenberg URL conversion error: {e}")
            raise


def convert_office_to_pdf_gotenberg(file) -> bytes:
    """
    Convert Office document (Word, Excel, PowerPoint) to PDF using Gotenberg.
    
    This is the primary converter for Office documents.
    
    Args:
        file: Django UploadedFile or file-like object with .name attribute
    
    Returns:
        PDF bytes
    
    Raises:
        Exception: If conversion fails
    """
    try:
        content = file.read()
        filename = getattr(file, 'name', 'document.docx')
        
        return GotenbergConverter.convert_to_pdf(
            input_bytes=content,
            filename=filename
        )
    except Exception as e:
        logger.error(f"Office to PDF conversion failed: {e}")
        raise


def convert_word_to_pdf_gotenberg(file) -> bytes:
    """Convert Word document to PDF using Gotenberg."""
    return convert_office_to_pdf_gotenberg(file)


def convert_excel_to_pdf_gotenberg(file) -> bytes:
    """Convert Excel spreadsheet to PDF using Gotenberg."""
    return convert_office_to_pdf_gotenberg(file)


def convert_powerpoint_to_pdf_gotenberg(file) -> bytes:
    """Convert PowerPoint presentation to PDF using Gotenberg."""
    return convert_office_to_pdf_gotenberg(file)


def convert_url_to_pdf_gotenberg(
    url: str,
    page_size: str = "A4",
    orientation: str = "portrait",
    margins: str = "normal",
    print_background: bool = True,
    emulate_media: str = "screen"
) -> bytes:
    """
    Convert a webpage URL to PDF using Gotenberg's Chromium engine.
    
    Args:
        url: The webpage URL to convert
        page_size: Paper size (A4, Letter, Legal, A3, A5)
        orientation: "portrait" or "landscape"
        margins: "none", "minimal", "normal", or "wide"
        print_background: Whether to include background graphics
        emulate_media: "screen" or "print"
    
    Returns:
        PDF bytes
    """
    # Map margin presets to actual values
    margin_map = {
        "none": "0mm",
        "minimal": "5mm",
        "normal": "10mm",
        "wide": "20mm"
    }
    margin_value = margin_map.get(margins.lower(), "10mm")
    
    return GotenbergConverter.convert_url_to_pdf(
        url=url,
        page_size=page_size,
        landscape=(orientation.lower() == "landscape"),
        margin_top=margin_value,
        margin_bottom=margin_value,
        margin_left=margin_value,
        margin_right=margin_value,
        print_background=print_background,
        emulate_media=emulate_media
    )
