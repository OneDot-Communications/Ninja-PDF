"""
Virus Scanning Service

Integrates with ClamAV for file scanning.
Requires ClamAV daemon running on the server.

Installation:
    sudo apt-get install clamav clamav-daemon
    sudo systemctl start clamav-daemon
    pip install pyclamd

Alternative: Use clamd socket or network connection.
"""
import io
import logging
from typing import Tuple, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class VirusScanResult:
    """Result of a virus scan"""
    def __init__(self, is_clean: bool, message: str = '', threat_name: str = ''):
        self.is_clean = is_clean
        self.message = message
        self.threat_name = threat_name
    
    def __str__(self):
        if self.is_clean:
            return "CLEAN"
        return f"INFECTED: {self.threat_name}"


class VirusScannerService:
    """
    Virus scanning service using ClamAV.
    
    Supports:
    - File path scanning
    - In-memory (bytes) scanning
    - Batch scanning
    """
    
    def __init__(self):
        self.scanner = None
        self.enabled = getattr(settings, 'VIRUS_SCANNING_ENABLED', False)
        self.clam_host = getattr(settings, 'CLAM_HOST', 'localhost')
        self.clam_port = getattr(settings, 'CLAM_PORT', 3310)
        self.clam_socket = getattr(settings, 'CLAM_SOCKET', None)  # e.g., '/var/run/clamav/clamd.ctl'
        
        if self.enabled:
            self._connect()
    
    def _connect(self):
        """Connect to ClamAV daemon"""
        try:
            import pyclamd
            
            if self.clam_socket:
                self.scanner = pyclamd.ClamdUnixSocket(filename=self.clam_socket)
            else:
                self.scanner = pyclamd.ClamdNetworkSocket(
                    host=self.clam_host,
                    port=self.clam_port
                )
            
            # Test connection
            if not self.scanner.ping():
                logger.error("ClamAV daemon not responding")
                self.scanner = None
        except ImportError:
            logger.warning("pyclamd not installed. Virus scanning disabled.")
            self.scanner = None
        except Exception as e:
            logger.error(f"Failed to connect to ClamAV: {e}")
            self.scanner = None
    
    def is_available(self) -> bool:
        """Check if virus scanning is available"""
        if not self.enabled or not self.scanner:
            return False
        try:
            return self.scanner.ping()
        except Exception:
            return False
    
    def scan_file(self, file_path: str) -> VirusScanResult:
        """
        Scan a file by path.
        
        Args:
            file_path: Absolute path to the file
        
        Returns:
            VirusScanResult with scan outcome
        """
        if not self.is_available():
            logger.warning("Virus scanning not available, skipping scan")
            return VirusScanResult(is_clean=True, message="Scanning unavailable - skipped")
        
        try:
            result = self.scanner.scan_file(file_path)
            
            if result is None:
                return VirusScanResult(is_clean=True, message="No threats detected")
            
            # Result format: {'/path/to/file': ('FOUND', 'Threat.Name')}
            if file_path in result:
                status, threat_name = result[file_path]
                if status == 'FOUND':
                    logger.warning(f"Virus detected in {file_path}: {threat_name}")
                    return VirusScanResult(
                        is_clean=False,
                        message=f"Threat detected: {threat_name}",
                        threat_name=threat_name
                    )
            
            return VirusScanResult(is_clean=True, message="No threats detected")
            
        except Exception as e:
            logger.error(f"Error scanning file {file_path}: {e}")
            # Fail open - allow file but log the error
            return VirusScanResult(is_clean=True, message=f"Scan error: {str(e)}")
    
    def scan_bytes(self, file_bytes: bytes) -> VirusScanResult:
        """
        Scan file content in memory.
        
        Args:
            file_bytes: File content as bytes
        
        Returns:
            VirusScanResult with scan outcome
        """
        if not self.is_available():
            logger.warning("Virus scanning not available, skipping scan")
            return VirusScanResult(is_clean=True, message="Scanning unavailable - skipped")
        
        try:
            result = self.scanner.scan_stream(io.BytesIO(file_bytes))
            
            if result is None:
                return VirusScanResult(is_clean=True, message="No threats detected")
            
            # Result format: {'stream': ('FOUND', 'Threat.Name')}
            if 'stream' in result:
                status, threat_name = result['stream']
                if status == 'FOUND':
                    logger.warning(f"Virus detected in stream: {threat_name}")
                    return VirusScanResult(
                        is_clean=False,
                        message=f"Threat detected: {threat_name}",
                        threat_name=threat_name
                    )
            
            return VirusScanResult(is_clean=True, message="No threats detected")
            
        except Exception as e:
            logger.error(f"Error scanning stream: {e}")
            return VirusScanResult(is_clean=True, message=f"Scan error: {str(e)}")
    
    def scan_django_file(self, uploaded_file) -> VirusScanResult:
        """
        Scan a Django UploadedFile.
        
        Args:
            uploaded_file: Django UploadedFile or similar
        
        Returns:
            VirusScanResult with scan outcome
        """
        # Read file content
        uploaded_file.seek(0)
        content = uploaded_file.read()
        uploaded_file.seek(0)  # Reset for further processing
        
        return self.scan_bytes(content)
    
    def get_version(self) -> Optional[str]:
        """Get ClamAV version"""
        if not self.is_available():
            return None
        try:
            return self.scanner.version()
        except Exception:
            return None


# Singleton instance
_scanner_instance = None


def get_scanner() -> VirusScannerService:
    """Get the singleton virus scanner instance"""
    global _scanner_instance
    if _scanner_instance is None:
        _scanner_instance = VirusScannerService()
    return _scanner_instance


def scan_uploaded_file(uploaded_file) -> Tuple[bool, str]:
    """
    Convenience function to scan an uploaded file.
    
    Args:
        uploaded_file: Django UploadedFile
    
    Returns:
        Tuple of (is_clean, message)
    """
    scanner = get_scanner()
    result = scanner.scan_django_file(uploaded_file)
    return result.is_clean, result.message
