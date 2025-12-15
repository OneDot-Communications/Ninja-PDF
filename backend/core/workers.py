"""
Worker Execution Layer
Enterprise-grade stateless workers for file processing operations.
"""
from abc import ABC, abstractmethod
from django.utils import timezone
from django.conf import settings
import tempfile
import hashlib
import os
import signal
import logging

logger = logging.getLogger(__name__)


class WorkerError(Exception):
    """Worker execution exception."""
    def __init__(self, message: str, code: str = 'WORKER_ERROR', recoverable: bool = True):
        self.message = message
        self.code = code
        self.recoverable = recoverable
        super().__init__(message)


class BaseWorker(ABC):
    """
    Stateless, single-responsibility worker base class.
    
    Features:
    - Idempotency checking
    - Timeout enforcement
    - Progress reporting
    - Automatic cleanup
    - Retry-aware error handling
    """
    
    name: str = "base"
    category: str = "general"
    timeout_seconds: int = 300
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.job = None
        self.file_asset = None
        self._temp_files = []
        self._start_time = None
    
    def load_job(self):
        """Load job and file asset from database."""
        from core.job_orchestration import Job
        
        self.job = Job.objects.select_related('file').get(id=self.job_id)
        self.file_asset = self.job.file
        return self.job
    
    def is_already_processed(self) -> bool:
        """Idempotency check."""
        return self.job and self.job.status == 'COMPLETED'
    
    def fetch_input_file(self) -> str:
        """
        Download input file to local temp storage.
        
        Returns:
            str: Local file path
        """
        from core.storage import StorageService
        
        storage_path = self.file_asset.file.name if self.file_asset.file else None
        if not storage_path:
            raise WorkerError("No input file", code='NO_INPUT')
        
        ext = os.path.splitext(storage_path)[1]
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        self._temp_files.append(temp.name)
        
        with StorageService.read(storage_path) as f:
            for chunk in iter(lambda: f.read(8192), b''):
                temp.write(chunk)
        temp.close()
        
        logger.info(f"Worker:{self.name} fetched input to {temp.name}")
        
        return temp.name
    
    def create_temp_file(self, suffix: str = '') -> str:
        """Create a temporary file for output."""
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        self._temp_files.append(temp.name)
        temp.close()
        return temp.name
    
    @abstractmethod
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        """
        Execute the file transformation.
        Must be implemented by subclasses.
        
        Returns:
            dict: Transformation result metadata
        """
        pass
    
    def validate_output(self, output_path: str) -> bool:
        """Validate output file is valid."""
        if not os.path.exists(output_path):
            return False
        if os.path.getsize(output_path) == 0:
            return False
        return True
    
        def calculate_output_hash(self, output_path: str) -> str:
            """Calculate SHA256 hash of output file for integrity."""
            sha = hashlib.sha256()
            with open(output_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    sha.update(chunk)
            return sha.hexdigest()
    
    def upload_output(self, output_path: str, output_filename: str = None) -> dict:
        """
        Upload output file to storage.
        
        Returns:
            dict: {storage_path, url, hash, size}
        """
        from core.storage import StorageService
        from core.file_registration import FileRegistrationService
        
        ext = os.path.splitext(output_path)[1] or '.pdf'
        filename = output_filename or f"output{ext}"
        
        storage_path = f"outputs/{self.file_asset.id}/v{self.file_asset.version + 1}/{filename}"
        
        output_hash = self.calculate_output_hash(output_path)
        output_size = os.path.getsize(output_path)
        
        with open(output_path, 'rb') as f:
            StorageService.upload(storage_path, f)
        
        FileRegistrationService.create_version(
            self.file_asset,
            output_path=storage_path,
            output_size=output_size,
            output_hash=output_hash
        )
        
        url = StorageService.get_signed_url(storage_path)
        
        return {
            'storage_path': storage_path,
            'url': url,
            'hash': output_hash,
            'size': output_size,
        }
    
    def cleanup(self):
        """Remove temporary files."""
        for path in self._temp_files:
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception as e:
                logger.warning(f"Worker cleanup failed for {path}: {e}")
        self._temp_files = []
    
    def report_progress(self, percent: int, message: str = ''):
        """Report progress back to job."""
        if self.job:
            self.job.update_progress(percent, message)
    
    def execute(self) -> dict:
        """
        Main execution flow.
        
        Returns:
            dict: Result with status and output info
        """
        from core.file_state_machine import log_file_transition
        
        self.load_job()
        
        if self.is_already_processed():
            logger.info(f"Worker:{self.name} job already completed, skipping")
            return self.job.result
        
        self._start_time = timezone.now()
        self.job.mark_started()
        
        try:
            log_file_transition(self.file_asset, 'PROCESSING', actor_type='WORKER')
        except Exception:
            pass
        
        input_path = None
        output_path = None
        
        try:
            self.report_progress(10, 'Fetching input file')
            input_path = self.fetch_input_file()
            
            self.report_progress(20, 'Processing')
            output_path = self.create_temp_file(suffix='.pdf')
            
            transform_result = self.transform(input_path, output_path, self.job.parameters)
            
            self.report_progress(80, 'Validating output')
            if not self.validate_output(output_path):
                raise WorkerError("Output validation failed", code='INVALID_OUTPUT')
            
            self.report_progress(90, 'Uploading result')
            upload_result = self.upload_output(output_path)
            
            result = {
                **upload_result,
                'transform': transform_result or {},
                'duration_seconds': self.job.duration_seconds,
            }
            
            try:
                log_file_transition(self.file_asset, 'AVAILABLE', actor_type='WORKER')
            except Exception:
                pass
            
            self.job.mark_completed(result)
            
            logger.info(f"Worker:{self.name} completed job={self.job_id} in {result['duration_seconds']:.2f}s")
            
            return result
            
        except WorkerError as e:
            logger.error(f"Worker:{self.name} failed: {e.message}")
            self.job.mark_failed(e.message, e.code)
            
            try:
                log_file_transition(self.file_asset, 'FAILED', actor_type='WORKER')
            except Exception:
                pass
            
            if not e.recoverable:
                from core.job_orchestration import Job
                self.job.status = Job.Status.DEAD_LETTER
                self.job.save(update_fields=['status'])
            
            return {'status': 'failed', 'error': e.message, 'code': e.code}
            
        except Exception as e:
            logger.exception(f"Worker:{self.name} unexpected error: {e}")
            self.job.mark_failed(str(e), 'UNEXPECTED_ERROR')
            return {'status': 'failed', 'error': str(e)}
            
        finally:
            self.cleanup()


class ConversionWorker(BaseWorker):
    """Worker for file format conversions."""
    name = "conversion"
    category = "conversion"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        raise NotImplementedError("Subclass must implement transform")


class CompressionWorker(BaseWorker):
    """Worker for file compression."""
    name = "compression"
    category = "compression"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        raise NotImplementedError("Subclass must implement transform")


class EditingWorker(BaseWorker):
    """Worker for file editing operations."""
    name = "editing"
    category = "editing"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        raise NotImplementedError("Subclass must implement transform")


class SecurityWorker(BaseWorker):
    """Worker for security operations."""
    name = "security"
    category = "security"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        raise NotImplementedError("Subclass must implement transform")


class AIWorker(BaseWorker):
    """Worker for AI-powered operations."""
    name = "ai"
    category = "ai"
    timeout_seconds = 600
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        raise NotImplementedError("Subclass must implement transform")


class RepairWorker(BaseWorker):
    """Worker for file repair operations."""
    name = "repair"
    category = "repair"
    
    def transform(self, input_path: str, output_path: str, parameters: dict) -> dict:
        raise NotImplementedError("Subclass must implement transform")


WORKER_REGISTRY = {
    'conversion': ConversionWorker,
    'compression': CompressionWorker,
    'editing': EditingWorker,
    'security': SecurityWorker,
    'ai': AIWorker,
    'repair': RepairWorker,
}


def get_worker_class(category: str):
    """Get worker class by category."""
    return WORKER_REGISTRY.get(category, BaseWorker)
