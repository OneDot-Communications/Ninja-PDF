"""
File Upload Service
Handles file upload, validation, and registration.
"""
from django.utils import timezone
from datetime import timedelta
import hashlib
import logging

from infrastructure.storage.service import StorageService
from common.constants import ALLOWED_MIME_TYPES, STORAGE_QUOTAS_BYTES, UserTier
from common.exceptions import ValidationError, QuotaExceededError, StorageError

logger = logging.getLogger(__name__)


class UploadService:
    """Handles file upload workflow."""
    
    @staticmethod
    def validate_mime_type(file_obj) -> str:
        """
        Validate file MIME type using magic bytes.
        
        Returns:
            str: Detected MIME type
            
        Raises:
            ValidationError: If file type not allowed
        """
        import magic
        
        initial_pos = file_obj.tell()
        chunk = file_obj.read(2048)
        file_obj.seek(initial_pos)
        
        mime_type = magic.from_buffer(chunk, mime=True)
        
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValidationError(
                message=f"File type '{mime_type}' is not supported.",
                code='unsupported_file_type',
                details={'detected_type': mime_type, 'allowed_types': ALLOWED_MIME_TYPES}
            )
        
        return mime_type
    
    @staticmethod
    def validate_file_size(file_obj, user) -> None:
        """
        Validate file size against user quota.
        
        Raises:
            QuotaExceededError: If file would exceed quota
        """
        from apps.accounts.services.user_service import UserService
        
        file_size = file_obj.size
        context = UserService.get_context(user)
        
        quota_limit = context['storage_limit']
        current_usage = context['storage_used']
        
        if quota_limit != -1 and (current_usage + file_size) > quota_limit:
            raise QuotaExceededError(
                message="This file would exceed your storage quota.",
                details={
                    'file_size': file_size,
                    'current_usage': current_usage,
                    'quota_limit': quota_limit,
                    'remaining': quota_limit - current_usage,
                }
            )
    
    @staticmethod
    def validate_pdf_integrity(file_obj) -> dict:
        """
        Validate PDF structure and extract metadata.
        
        Returns:
            dict: {page_count, is_encrypted}
        """
        import pikepdf
        
        initial_pos = file_obj.tell()
        
        try:
            with pikepdf.open(file_obj) as pdf:
                page_count = len(pdf.pages)
                is_encrypted = pdf.is_encrypted
            
            file_obj.seek(initial_pos)
            return {'page_count': page_count, 'is_encrypted': is_encrypted}
            
        except pikepdf.PasswordError:
            file_obj.seek(initial_pos)
            return {'page_count': 0, 'is_encrypted': True}
        except pikepdf.PdfError as e:
            file_obj.seek(initial_pos)
            raise ValidationError(
                message=f"Invalid PDF file: {e}",
                code='pdf_validation_failed'
            )
    
    @staticmethod
    def calculate_checksum(file_obj) -> str:
        """Calculate SHA256 checksum of file."""
        initial_pos = file_obj.tell()

        sha = hashlib.sha256()
        for chunk in iter(lambda: file_obj.read(8192), b''):
            sha.update(chunk)

        file_obj.seek(initial_pos)
        return sha.hexdigest()
    
    @classmethod
    def process_upload(cls, file_obj, user, expires_hours: int = None) -> 'FileAsset':
        """
        Process a complete file upload.
        
        Steps:
        1. Validate MIME type
        2. Validate file size
        3. Calculate checksum
        4. Extract metadata (for PDFs)
        5. Upload to storage
        6. Create FileAsset record
        
        Returns:
            FileAsset: The created file record
        """
        from apps.files.models.file_asset import FileAsset
        
        # Step 1: Validate MIME
        mime_type = cls.validate_mime_type(file_obj)
        
        # Step 2: Validate size
        if user:
            cls.validate_file_size(file_obj, user)
        
        # Step 3: Checksum
        checksum = cls.calculate_checksum(file_obj)
        
        # Step 4: PDF metadata
        page_count = None
        is_encrypted = False
        if mime_type == 'application/pdf':
            pdf_info = cls.validate_pdf_integrity(file_obj)
            page_count = pdf_info['page_count']
            is_encrypted = pdf_info['is_encrypted']
        
        # Create FileAsset
        file_asset = FileAsset.objects.create(
            user=user,
            name=file_obj.name,
            original_name=file_obj.name,
            size_bytes=file_obj.size,
            mime_type=mime_type,
            md5_hash=checksum,
            page_count=page_count,
            is_encrypted=is_encrypted,
            status=FileAsset.Status.UPLOADING,
            expires_at=timezone.now() + timedelta(hours=expires_hours) if expires_hours else None,
        )
        
        # Step 5: Upload to storage
        storage_path = f"files/{user.id if user else 'guest'}/{file_asset.uuid}/{file_obj.name}"
        
        try:
            saved_path = StorageService.upload(storage_path, file_obj)
            file_asset.storage_path = saved_path
            file_asset.status = FileAsset.Status.AVAILABLE
            file_asset.save()
            
            logger.info(f"Upload complete: {file_asset.uuid}")
            
        except Exception as e:
            file_asset.status = FileAsset.Status.FAILED
            file_asset.metadata['error'] = str(e)
            file_asset.save()
            raise StorageError(message=str(e))
        
        return file_asset
