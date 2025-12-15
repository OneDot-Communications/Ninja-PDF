"""
Base Worker Class
All workers inherit from this base implementation.
"""
from abc import ABC, abstractmethod
from django.utils import timezone
from infrastructure.storage.service import StorageService
from common.exceptions import FileProcessingError
import tempfile
import hashlib
import os
import logging

logger = logging.getLogger(__name__)


class BaseWorker(ABC):
    """
    Stateless, single-responsibility worker base class.
    Implements idempotency, timeout, and retry handling.
    """
    
    name: str = "base"
    timeout_seconds: int = 300
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.job = None
        self.file_asset = None
        self._temp_files = []
    
    def load_job(self):
        """Load job and file asset from database."""
        from apps.jobs.models.job import Job
        
        self.job = Job.objects.select_related('file_asset').get(id=self.job_id)
        self.file_asset = self.job.file_asset
        return self.job
    
    def is_already_processed(self) -> bool:
        """Idempotency check - prevent double processing."""
        return self.job and self.job.status == 'COMPLETED'
    
    def fetch_input_file(self) -> str:
        """
        Download input file to local temp storage.
        
        Returns:
            str: Local file path
        """
        storage_path = self.file_asset.storage_path
        ext = os.path.splitext(storage_path)[1]
        
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        self._temp_files.append(temp.name)
        
        with StorageService.read(storage_path) as f:
            temp.write(f.read())
        temp.close()
        
        return temp.name
    
    @abstractmethod
    def transform(self, input_path: str, output_path: str, parameters: dict) -> None:
        """
        Execute the transformation.
        Must be implemented by subclasses.
        """
        pass
    
    def validate_output(self, output_path: str) -> bool:
        """Validate output file exists and has content."""
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
    
    def upload_output(self, output_path: str) -> dict:
        """
        Upload output file to storage.
        
        Returns:
            dict: {storage_path, url, hash, size}
        """
        from apps.files.models.file_asset import FileVersion
        
        ext = os.path.splitext(output_path)[1] or '.pdf'
        storage_path = f"outputs/{self.file_asset.uuid}/v{self.file_asset.version + 1}{ext}"
        
        output_hash = self.calculate_output_hash(output_path)
        output_size = os.path.getsize(output_path)
        
        with open(output_path, 'rb') as f:
            StorageService.upload(storage_path, f)
        
        FileVersion.objects.create(
            file_asset=self.file_asset,
            version_number=self.file_asset.version + 1,
            storage_path=storage_path,
            size_bytes=output_size,
            sha256_hash=output_hash,
        )
        
        self.file_asset.version += 1
        self.file_asset.metadata['output_hash'] = output_hash
        self.file_asset.metadata['output_size'] = output_size
        self.file_asset.save()
        
        return {
            'storage_path': storage_path,
            'url': StorageService.generate_signed_url(storage_path),
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
                logger.warning(f"Failed to cleanup temp file {path}: {e}")
    
    def execute(self) -> dict:
        """
        Main execution flow.
        
        Returns:
            dict: Result with status and output info
        """
        from apps.files.state_machine.transitions import transition
        from apps.jobs.models.job import JobLog
        
        self.load_job()
        
        if self.is_already_processed():
            return self.job.result
        
        self.job.mark_started()
        transition(self.file_asset, 'PROCESSING')
        
        input_path = None
        output_path = None
        
        try:
            input_path = self.fetch_input_file()
            output_path = input_path + '.output'
            
            self.transform(input_path, output_path, self.job.parameters)
            
            if not self.validate_output(output_path):
                raise FileProcessingError("Output validation failed")
            
            result = self.upload_output(output_path)
            
            transition(self.file_asset, 'AVAILABLE')
            self.job.mark_completed(result)
            
            JobLog.objects.create(
                job=self.job,
                level='INFO',
                message=f"Completed successfully in {self.job.duration_seconds:.2f}s"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Worker {self.name} failed: {e}", exc_info=True)
            
            transition(self.file_asset, 'FAILED')
            self.job.mark_failed(str(e))
            
            JobLog.objects.create(
                job=self.job,
                level='ERROR',
                message=str(e)
            )
            
            return {'status': 'failed', 'error': str(e)}
            
        finally:
            self.cleanup()


class ConversionWorker(BaseWorker):
    """Worker for file format conversions."""
    name = "conversion"


class CompressionWorker(BaseWorker):
    """Worker for file compression."""
    name = "compression"


class EditingWorker(BaseWorker):
    """Worker for file editing (merge, split, etc)."""
    name = "editing"


class SecurityWorker(BaseWorker):
    """Worker for security operations (encrypt, decrypt)."""
    name = "security"


class AIWorker(BaseWorker):
    """Worker for AI operations (OCR, summarize)."""
    name = "ai"


class RepairWorker(BaseWorker):
    """Worker for file repair operations."""
    name = "repair"
