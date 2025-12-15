"""
File Validation Service
Enterprise-grade validation for file uploads with comprehensive security checks.
"""
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
import hashlib
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger(__name__)


ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/html',
    'text/plain',
    'text/markdown',
]

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100MB default


class FileValidator:
    """Comprehensive file validation service."""
    
    @staticmethod
    def validate_mime_type(file_obj, allowed_types: list = None) -> str:
        """
        Validate file MIME type using magic bytes.
        
        Args:
            file_obj: File-like object with read() method
            allowed_types: List of allowed MIME types (uses default if None)
            
        Returns:
            str: Detected MIME type
            
        Raises:
            ValidationError: If file type not allowed
        """
        import magic
        
        allowed = allowed_types or ALLOWED_MIME_TYPES
        
        initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
        chunk = file_obj.read(8192)
        
        if hasattr(file_obj, 'seek'):
            file_obj.seek(initial_pos)
        
        detected_type = magic.from_buffer(chunk, mime=True)
        
        if detected_type not in allowed:
            logger.warning(f"Validation:MIME:REJECTED type={detected_type}")
            raise ValidationError(
                f"File type '{detected_type}' is not allowed. "
                f"Supported types: PDF, Word, Excel, PowerPoint, Images"
            )
        
        logger.info(f"Validation:MIME:OK type={detected_type}")
        return detected_type
    
    @staticmethod
    def validate_file_size(file_obj, max_size: int = None) -> int:
        """
        Validate file size against limit.
        
        Args:
            file_obj: File object with size attribute or seek/tell
            max_size: Maximum size in bytes
            
        Returns:
            int: File size in bytes
            
        Raises:
            ValidationError: If file exceeds size limit
        """
        max_bytes = max_size or MAX_FILE_SIZE_BYTES
        
        if hasattr(file_obj, 'size'):
            size = file_obj.size
        else:
            current = file_obj.tell()
            file_obj.seek(0, 2)
            size = file_obj.tell()
            file_obj.seek(current)
        
        if size > max_bytes:
            mb = max_bytes / (1024 * 1024)
            raise ValidationError(f"File size exceeds {mb:.0f}MB limit")
        
        if size == 0:
            raise ValidationError("File is empty")
        
        return size
    
    @staticmethod
    def validate_pdf_integrity(file_obj) -> dict:
        """
        Validate PDF structure and extract metadata.
        
        Returns:
            dict: {valid, page_count, is_encrypted, metadata}
        """
        try:
            import pikepdf
        except ImportError:
            logger.warning("pikepdf not installed, skipping PDF validation")
            return {'valid': True, 'page_count': None, 'is_encrypted': False}
        
        initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
        
        try:
            with pikepdf.open(file_obj) as pdf:
                page_count = len(pdf.pages)
                is_encrypted = pdf.is_encrypted
                
                metadata = {}
                if pdf.docinfo:
                    for key in ['/Title', '/Author', '/Subject', '/Creator', '/Producer']:
                        try:
                            val = pdf.docinfo.get(key)
                            if val:
                                metadata[key.lstrip('/')] = str(val)
                        except Exception:
                            pass
                
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(initial_pos)
                
                logger.info(f"Validation:PDF:OK pages={page_count} encrypted={is_encrypted}")
                
                return {
                    'valid': True,
                    'page_count': page_count,
                    'is_encrypted': is_encrypted,
                    'metadata': metadata
                }
                
        except pikepdf.PasswordError:
            if hasattr(file_obj, 'seek'):
                file_obj.seek(initial_pos)
            return {'valid': True, 'page_count': 0, 'is_encrypted': True}
            
        except pikepdf.PdfError as e:
            if hasattr(file_obj, 'seek'):
                file_obj.seek(initial_pos)
            logger.warning(f"Validation:PDF:FAILED error={e}")
            raise ValidationError(f"Invalid or corrupted PDF file: {e}")
    
    @staticmethod
    def extract_page_count(file_obj) -> int:
        """Extract page count from PDF."""
        result = FileValidator.validate_pdf_integrity(file_obj)
        return result.get('page_count', 0)
    
    @staticmethod
    def detect_encryption(file_obj) -> bool:
        """Check if PDF is password-protected."""
        result = FileValidator.validate_pdf_integrity(file_obj)
        return result.get('is_encrypted', False)
    
    @staticmethod
    def calculate_checksum(file_obj, algorithm: str = 'md5') -> str:
        """
        Calculate file checksum.
        
        Args:
            file_obj: File-like object
            algorithm: 'md5', 'sha1', 'sha256'
            
        Returns:
            str: Hex digest
        """
        hash_func = getattr(hashlib, algorithm)()
        
        initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
        
        for chunk in iter(lambda: file_obj.read(8192), b''):
            hash_func.update(chunk)
        
        if hasattr(file_obj, 'seek'):
            file_obj.seek(initial_pos)
        
        return hash_func.hexdigest()
    
    @staticmethod
    def scan_for_virus(file_obj) -> dict:
        """
        Scan file for viruses using ClamAV.
        
        Returns:
            dict: {clean: bool, threat: str or None}
        """
        debug_mode = getattr(settings, 'DEBUG', False)
        
        try:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
                
                for chunk in iter(lambda: file_obj.read(8192), b''):
                    tmp.write(chunk)
                tmp.flush()
                
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(initial_pos)
                
                result = subprocess.run(
                    ['clamdscan', '--no-summary', tmp.name],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                os.unlink(tmp.name)
                
                if result.returncode == 0:
                    logger.info("Validation:VIRUS:CLEAN")
                    return {'clean': True, 'threat': None}
                elif result.returncode == 1:
                    threat = result.stdout.split(':')[1].strip() if ':' in result.stdout else 'Unknown'
                    logger.warning(f"Validation:VIRUS:FOUND threat={threat}")
                    raise ValidationError(f"Malware detected: {threat}")
                else:
                    logger.error(f"Validation:VIRUS:ERROR code={result.returncode}")
                    if not debug_mode:
                        raise ValidationError("Virus scan failed")
                    return {'clean': True, 'threat': None, 'scan_skipped': True}
                    
        except FileNotFoundError:
            if debug_mode:
                logger.warning("ClamAV not installed, skipping virus scan in dev mode")
                return {'clean': True, 'threat': None, 'scan_skipped': True}
            raise ValidationError("Virus scanner unavailable")
        except subprocess.TimeoutExpired:
            logger.error("Validation:VIRUS:TIMEOUT")
            raise ValidationError("Virus scan timed out")
    
    @classmethod
    def validate_full(cls, file_obj, require_pdf: bool = False, scan_virus: bool = True) -> dict:
        """
        Perform complete file validation suite.
        
        Args:
            file_obj: File-like object
            require_pdf: If True, validates PDF structure
            scan_virus: If True, performs virus scan
            
        Returns:
            dict: Complete validation results
        """
        results = {
            'valid': True,
            'mime_type': None,
            'size_bytes': 0,
            'checksum': None,
            'page_count': None,
            'is_encrypted': False,
            'virus_scanned': False,
        }
        
        results['mime_type'] = cls.validate_mime_type(file_obj)
        results['size_bytes'] = cls.validate_file_size(file_obj)
        results['checksum'] = cls.calculate_checksum(file_obj)
        
        if require_pdf or results['mime_type'] == 'application/pdf':
            pdf_info = cls.validate_pdf_integrity(file_obj)
            results['page_count'] = pdf_info.get('page_count')
            results['is_encrypted'] = pdf_info.get('is_encrypted', False)
            results['pdf_metadata'] = pdf_info.get('metadata', {})
        
        if scan_virus:
            virus_result = cls.scan_for_virus(file_obj)
            results['virus_scanned'] = True
            results['scan_skipped'] = virus_result.get('scan_skipped', False)
        
        logger.info(f"Validation:FULL:OK mime={results['mime_type']} size={results['size_bytes']}")
        
        return results


def validate_file_type(file_obj) -> str:
    """Convenience function for MIME validation."""
    return FileValidator.validate_mime_type(file_obj)


def validate_file_size(file_obj, max_size: int = None) -> int:
    """Convenience function for size validation."""
    return FileValidator.validate_file_size(file_obj, max_size)


def validate_pdf_integrity(file_obj) -> dict:
    """Convenience function for PDF validation."""
    return FileValidator.validate_pdf_integrity(file_obj)


def extract_page_count(file_obj) -> int:
    """Convenience function for page count extraction."""
    return FileValidator.extract_page_count(file_obj)


def detect_encryption(file_obj) -> bool:
    """Convenience function for encryption detection."""
    return FileValidator.detect_encryption(file_obj)


def scan_file_virus(file_obj) -> dict:
    """Convenience function for virus scanning."""
    return FileValidator.scan_for_virus(file_obj)
