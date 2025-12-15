"""
Storage Service Interface
Unified file storage operations across S3, R2, and Local backends.
"""
from django.core.files.storage import default_storage
from django.conf import settings
import boto3
from botocore.config import Config
import logging

logger = logging.getLogger(__name__)


class StorageService:
    """Unified storage interface for all file operations."""
    
    _s3_client = None
    
    @classmethod
    def get_backend(cls) -> str:
        """Returns current storage backend name."""
        return getattr(settings, 'STORAGE_BACKEND', 'local')
    
    @classmethod
    def get_s3_client(cls):
        """Lazily initialize S3/R2 client."""
        if cls._s3_client is None and cls.get_backend() in ('s3', 'r2'):
            cls._s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
                config=Config(signature_version='s3v4')
            )
        return cls._s3_client
    
    @classmethod
    def upload(cls, path: str, file_obj):
        """
        Upload a file to storage.
        
        Args:
            path: Storage path (e.g., 'files/user_1/document.pdf')
            file_obj: File-like object with read() method
            
        Returns:
            str: The saved path
        """
        saved_path = default_storage.save(path, file_obj)
        logger.info(f"Uploaded: {saved_path}")
        return saved_path
    
    @classmethod
    def read(cls, path: str):
        """
        Open a file for reading.
        
        Args:
            path: Storage path
            
        Returns:
            File-like object
        """
        return default_storage.open(path, 'rb')
    
    @classmethod
    def delete(cls, path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            path: Storage path
            
        Returns:
            bool: True if successful
        """
        try:
            default_storage.delete(path)
            logger.info(f"Deleted: {path}")
            return True
        except Exception as e:
            logger.error(f"Delete failed for {path}: {e}")
            return False
    
    @classmethod
    def exists(cls, path: str) -> bool:
        """Check if a file exists."""
        return default_storage.exists(path)
    
    @classmethod
    def get_size(cls, path: str) -> int:
        """Get file size in bytes."""
        return default_storage.size(path)
    
    @classmethod
    def get_url(cls, path: str) -> str:
        """
        Get a URL for the file.
        For S3/R2 with signed URLs enabled, returns a pre-signed URL.
        """
        return default_storage.url(path)
    
    @classmethod
    def generate_signed_url(cls, path: str, expiration_seconds: int = 3600, operation: str = 'get_object') -> str:
        """
        Generate a signed URL with custom expiration.
        
        Args:
            path: Storage path
            expiration_seconds: URL validity period (default: 1 hour)
            operation: 'get_object' for download, 'put_object' for upload
            
        Returns:
            str: Signed URL
        """
        backend = cls.get_backend()
        
        if backend not in ('s3', 'r2'):
            return default_storage.url(path)
        
        client = cls.get_s3_client()
        if not client:
            return default_storage.url(path)
        
        try:
            url = client.generate_presigned_url(
                operation,
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': path
                },
                ExpiresIn=expiration_seconds
            )
            return url
        except Exception as e:
            logger.error(f"Signed URL generation failed: {e}")
            return default_storage.url(path)
    
    @classmethod
    def generate_upload_url(cls, path: str, content_type: str = 'application/octet-stream', expiration_seconds: int = 3600) -> dict:
        """
        Generate a pre-signed URL for direct client upload.
        
        Returns:
            dict: {url, fields} for POST or {url} for PUT
        """
        backend = cls.get_backend()
        
        if backend not in ('s3', 'r2'):
            return {'error': 'Direct upload not supported on local storage'}
        
        client = cls.get_s3_client()
        
        try:
            response = client.generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=path,
                Fields={'Content-Type': content_type},
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 1, 100 * 1024 * 1024],  # 100MB max
                ],
                ExpiresIn=expiration_seconds
            )
            return response
        except Exception as e:
            logger.error(f"Upload URL generation failed: {e}")
            return {'error': str(e)}
