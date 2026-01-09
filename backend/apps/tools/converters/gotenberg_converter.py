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
    """
    
    TIMEOUT_SECONDS = 120  # 2 minutes timeout
    
    # Gotenberg LibreOffice conversion endpoint
    LIBREOFFICE_ENDPOINT = "/forms/libreoffice/convert"
    
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
