"""Virus Scanning Service for File Upload Security"""
import subprocess
import tempfile
import os
import hashlib
import logging
from pathlib import Path
from typing import Optional, Tuple
from django.conf import settings

logger = logging.getLogger(__name__)


class VirusScanResult:
    """Result of a virus scan"""
    def __init__(self, is_clean: bool, threat_name: str = None, error: str = None):
        self.is_clean = is_clean
        self.threat_name = threat_name
        self.error = error
    
    @property
    def is_infected(self):
        return not self.is_clean and self.threat_name is not None
    
    def __str__(self):
        if self.error:
            return f"Scan Error: {self.error}"
        if self.is_infected:
            return f"INFECTED: {self.threat_name}"
        return "CLEAN"


class VirusScanService:
    """
    Virus scanning service using ClamAV.
    Task 78: Configure virus scanning
    
    Supports:
    - ClamAV daemon (clamd) via socket
    - ClamAV command-line (clamscan)
    - File hash checking against known threats
    """
    
    # Known malicious file hashes (sample - would be much larger in production)
    KNOWN_THREATS = {
        # EICAR test file hashes
        '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f': 'EICAR-Test-File',
        '44d88612fea8a8f36de82e1278abb02f': 'EICAR-Test-File-MD5',
    }
    
    def __init__(self):
        self.clamav_socket = getattr(settings, 'CLAMAV_SOCKET', '/var/run/clamav/clamd.ctl')
        self.clamav_host = getattr(settings, 'CLAMAV_HOST', '127.0.0.1')
        self.clamav_port = getattr(settings, 'CLAMAV_PORT', 3310)
        self.use_clamscan = getattr(settings, 'USE_CLAMSCAN_CLI', True)
        self.enabled = getattr(settings, 'VIRUS_SCANNING_ENABLED', True)
    
    def scan_file(self, file_path: str) -> VirusScanResult:
        """
        Scan a file for viruses.
        Returns VirusScanResult with scan outcome.
        """
        if not self.enabled:
            return VirusScanResult(is_clean=True)
        
        if not os.path.exists(file_path):
            return VirusScanResult(is_clean=False, error="File not found")
        
        # First check against known hashes (fast)
        hash_result = self._check_hash(file_path)
        if hash_result.is_infected:
            return hash_result
        
        # Then run ClamAV scan
        try:
            if self.use_clamscan:
                return self._scan_with_clamscan(file_path)
            else:
                return self._scan_with_clamd(file_path)
        except Exception as e:
            logger.error(f"Virus scan failed: {e}")
            # On scan failure, we fail-safe (block the file)
            return VirusScanResult(is_clean=False, error=str(e))
    
    def scan_bytes(self, data: bytes) -> VirusScanResult:
        """Scan bytes data for viruses"""
        if not self.enabled:
            return VirusScanResult(is_clean=True)
        
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        
        try:
            return self.scan_file(tmp_path)
        finally:
            os.unlink(tmp_path)
    
    def _check_hash(self, file_path: str) -> VirusScanResult:
        """Check file hash against known threats"""
        try:
            # Calculate SHA256
            sha256 = hashlib.sha256()
            md5 = hashlib.md5()
            
            with open(file_path, 'rb') as f:
                while chunk := f.read(8192):
                    sha256.update(chunk)
                    md5.update(chunk)
            
            sha256_hash = sha256.hexdigest()
            md5_hash = md5.hexdigest()
            
            if sha256_hash in self.KNOWN_THREATS:
                return VirusScanResult(
                    is_clean=False,
                    threat_name=self.KNOWN_THREATS[sha256_hash]
                )
            
            if md5_hash in self.KNOWN_THREATS:
                return VirusScanResult(
                    is_clean=False,
                    threat_name=self.KNOWN_THREATS[md5_hash]
                )
            
            return VirusScanResult(is_clean=True)
        except Exception as e:
            logger.warning(f"Hash check failed: {e}")
            return VirusScanResult(is_clean=True)  # Continue to full scan
    
    def _scan_with_clamscan(self, file_path: str) -> VirusScanResult:
        """Scan using clamscan command-line tool"""
        try:
            result = subprocess.run(
                ['clamscan', '--no-summary', file_path],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            # Exit codes: 0 = clean, 1 = virus found, 2 = error
            if result.returncode == 0:
                return VirusScanResult(is_clean=True)
            elif result.returncode == 1:
                # Parse threat name from output
                output = result.stdout
                if 'FOUND' in output:
                    threat = output.split(':')[1].strip().replace(' FOUND', '')
                    return VirusScanResult(is_clean=False, threat_name=threat)
                return VirusScanResult(is_clean=False, threat_name='Unknown threat')
            else:
                return VirusScanResult(is_clean=False, error=result.stderr or 'Scan error')
                
        except subprocess.TimeoutExpired:
            return VirusScanResult(is_clean=False, error='Scan timeout')
        except FileNotFoundError:
            logger.warning("clamscan not found - virus scanning disabled")
            return VirusScanResult(is_clean=True)
    
    def _scan_with_clamd(self, file_path: str) -> VirusScanResult:
        """Scan using clamd daemon via socket"""
        try:
            import socket
            
            # Connect to clamd
            if os.path.exists(self.clamav_socket):
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(self.clamav_socket)
            else:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect((self.clamav_host, self.clamav_port))
            
            sock.settimeout(60)
            
            try:
                # Send SCAN command
                sock.send(f"SCAN {file_path}\n".encode())
                response = sock.recv(4096).decode().strip()
                
                if 'OK' in response:
                    return VirusScanResult(is_clean=True)
                elif 'FOUND' in response:
                    threat = response.split(':')[1].strip().replace(' FOUND', '')
                    return VirusScanResult(is_clean=False, threat_name=threat)
                else:
                    return VirusScanResult(is_clean=False, error=response)
            finally:
                sock.close()
                
        except Exception as e:
            logger.warning(f"clamd connection failed: {e}")
            # Fallback to clamscan
            return self._scan_with_clamscan(file_path)
    
    def is_available(self) -> bool:
        """Check if virus scanning is available"""
        if not self.enabled:
            return False
        
        # Try clamscan
        try:
            result = subprocess.run(
                ['clamscan', '--version'],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                return True
        except:
            pass
        
        # Try clamd socket
        try:
            import socket
            if os.path.exists(self.clamav_socket):
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(self.clamav_socket)
                sock.close()
                return True
        except:
            pass
        
        return False


# Singleton instance
virus_scanner = VirusScanService()


def scan_uploaded_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to scan an uploaded file.
    Returns (is_safe, error_message)
    """
    result = virus_scanner.scan_file(file_path)
    
    if result.error:
        return False, f"Scan error: {result.error}"
    
    if result.is_infected:
        return False, f"Malware detected: {result.threat_name}"
    
    return True, None
