"""
File Registration Service
Handles file identity, ownership, versioning, and metadata persistence.
"""
from django.utils import timezone
from django.db import transaction
import uuid
import hashlib
import logging

logger = logging.getLogger(__name__)


class FileRegistrationService:
    """Enterprise-grade file registration and identity management."""
    
    @staticmethod
    def generate_file_id() -> str:
        """Generate globally unique file identifier."""
        return str(uuid.uuid4())
    
    @staticmethod
    def generate_storage_path(user, file_id: str, filename: str, prefix: str = 'files') -> str:
        """
        Generate organized storage path.
        
        Format: {prefix}/{user_id}/{file_id}/{filename}
        Guest:  {prefix}/guest/{file_id}/{filename}
        """
        user_folder = str(user.id) if user and user.is_authenticated else 'guest'
        safe_filename = filename.replace('/', '_').replace('\\', '_')
        return f"{prefix}/{user_folder}/{file_id}/{safe_filename}"
    
    @classmethod
    @transaction.atomic
    def register_file(cls, file_obj, user, storage_path: str = None, metadata: dict = None):
        """
        Register a new file in the system.
        
        Args:
            file_obj: Uploaded file object
            user: User or None for guest
            storage_path: Pre-determined storage path
            metadata: Additional metadata dict
            
        Returns:
            UserFile: Registered file instance
        """
        from apps.files.models.user_file import UserFile
        from core.validators import FileValidator
        
        file_id = cls.generate_file_id()
        
        validation = FileValidator.validate_full(
            file_obj,
            require_pdf=(getattr(file_obj, 'content_type', '') == 'application/pdf'),
            scan_virus=True
        )
        
        if not storage_path:
            storage_path = cls.generate_storage_path(user, file_id, file_obj.name)
        
        from core.storage import StorageService
        saved_path = StorageService.upload(storage_path, file_obj)
        
        file_record = UserFile.objects.create(
            user=user if user and user.is_authenticated else None,
            name=file_obj.name,
            original_name=file_obj.name,
            file=saved_path,
            size_bytes=validation['size_bytes'],
            mime_type=validation['mime_type'],
            md5_hash=validation['checksum'],
            page_count=validation.get('page_count'),
            is_encrypted=validation.get('is_encrypted', False),
            version=1,
            status='AVAILABLE',
            metadata={
                'file_id': file_id,
                'uploaded_at': timezone.now().isoformat(),
                'original_checksum': validation['checksum'],
                'pdf_metadata': validation.get('pdf_metadata', {}),
                **(metadata or {})
            }
        )
        
        from core.file_state_machine import log_file_transition
        try:
            log_file_transition(file_record, 'AVAILABLE', actor_type='SYSTEM')
        except Exception:
            pass
        
        logger.info(
            f"FileRegistration:CREATED id={file_record.id} "
            f"user={user.id if user else 'guest'} "
            f"size={validation['size_bytes']}"
        )
        
        return file_record
    
    @classmethod
    def increment_version(cls, file_record) -> int:
        """Increment file version counter atomically."""
        from django.db import models
        from apps.files.models.user_file import UserFile
        
        UserFile.objects.filter(id=file_record.id).update(
            version=models.F('version') + 1
        )
        file_record.refresh_from_db()
        
        logger.info(f"FileRegistration:VERSION file={file_record.id} version={file_record.version}")
        
        return file_record.version
    
    @classmethod
    def create_version(cls, file_record, output_path: str, output_size: int, output_hash: str, metadata: dict = None):
        """
        Create a new version entry for processed output.
        
        Args:
            file_record: Original file instance
            output_path: Storage path of new version
            output_size: Size in bytes
            output_hash: MD5 hash
            metadata: Additional version metadata
            
        Returns:
            dict: Version details
        """
        new_version = cls.increment_version(file_record)
        
        version_data = {
            'version': new_version,
            'storage_path': output_path,
            'size_bytes': output_size,
            'hash': output_hash,
            'created_at': timezone.now().isoformat(),
            **(metadata or {})
        }
        
        versions = file_record.metadata.get('versions', [])
        versions.append(version_data)
        file_record.metadata['versions'] = versions
        file_record.metadata['current_version'] = new_version
        file_record.save(update_fields=['metadata'])
        
        return version_data
    
    @classmethod
    def get_version_path(cls, file_record, version: int = None) -> str:
        """Get storage path for a specific version."""
        if version is None:
            return file_record.file.name if file_record.file else None
        
        versions = file_record.metadata.get('versions', [])
        for v in versions:
            if v.get('version') == version:
                return v.get('storage_path')
        
        return None
    
    @classmethod
    def bind_ownership(cls, file_record, user):
        """
        Transfer file ownership to a user.
        Used when guest converts to registered user.
        """
        old_user = file_record.user_id
        file_record.user = user
        file_record.save(update_fields=['user'])
        
        logger.info(f"FileRegistration:OWNERSHIP file={file_record.id} from={old_user} to={user.id}")
    
    @classmethod
    def update_metadata(cls, file_record, key: str, value):
        """Update single metadata field."""
        file_record.metadata[key] = value
        file_record.save(update_fields=['metadata'])
    
    @classmethod
    def check_duplicate(cls, user, checksum: str):
        """
        Check if file already exists based on checksum.
        
        Returns:
            UserFile or None
        """
        from apps.files.models.user_file import UserFile
        
        return UserFile.objects.filter(
            user=user,
            md5_hash=checksum,
            status='AVAILABLE'
        ).first()


def generate_file_id() -> str:
    """Convenience function."""
    return FileRegistrationService.generate_file_id()


def register_file(file_obj, user, **kwargs):
    """Convenience function."""
    return FileRegistrationService.register_file(file_obj, user, **kwargs)


def increment_file_version(file_record) -> int:
    """Convenience function."""
    return FileRegistrationService.increment_version(file_record)
