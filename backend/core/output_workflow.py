"""
Output & Preview Workflow
Handles output storage, versioning, preview generation, and quota finalization.
"""
from django.utils import timezone
from django.conf import settings
import tempfile
import os
import hashlib
import logging

logger = logging.getLogger(__name__)


class OutputError(Exception):
    """Output workflow exception."""
    pass


class OutputService:
    """Handles output file storage and preview generation."""
    
    @classmethod
    def store_output_version(cls, file_asset, output_path: str, output_filename: str = None, metadata: dict = None) -> dict:
        """
        Store processed output as a new version.
        
        Args:
            file_asset: Original file record
            output_path: Local path to output file
            output_filename: Optional custom filename
            metadata: Additional version metadata
            
        Returns:
            dict: {storage_path, size, hash, version, url}
        """
        from core.storage import StorageService
        from core.file_registration import FileRegistrationService
        
        if not os.path.exists(output_path):
            raise OutputError(f"Output file not found: {output_path}")
        
        ext = os.path.splitext(output_path)[1] or '.pdf'
        filename = output_filename or f"output{ext}"
        
        new_version = file_asset.version + 1
        storage_path = f"outputs/{file_asset.id}/v{new_version}/{filename}"
        
        output_hash = cls._calculate_hash(output_path)
        output_size = os.path.getsize(output_path)
        
        with open(output_path, 'rb') as f:
            StorageService.upload(storage_path, f)
        
        FileRegistrationService.create_version(
            file_asset,
            output_path=storage_path,
            output_size=output_size,
            output_hash=output_hash,
            metadata=metadata
        )
        
        url = StorageService.get_signed_url(storage_path)
        
        result = {
            'storage_path': storage_path,
            'size': output_size,
            'hash': output_hash,
            'version': new_version,
            'url': url,
        }
        
        logger.info(f"Output:STORED file={file_asset.id} version={new_version} size={output_size}")
        
        return result
    
    @classmethod
    def generate_preview(cls, file_asset, preview_type: str = 'thumbnail', page: int = 1) -> dict:
        """
        Generate preview image for file.
        
        Args:
            file_asset: File to preview
            preview_type: 'thumbnail' (150x150), 'preview' (600x600), 'full'
            page: Page number for PDFs
            
        Returns:
            dict: {preview_path, url, dimensions}
        """
        from core.storage import StorageService
        
        if file_asset.mime_type != 'application/pdf':
            return {'supported': False}
        
        size_map = {
            'thumbnail': (150, 150),
            'preview': (600, 600),
            'full': (1200, 1200),
        }
        size = size_map.get(preview_type, (600, 600))
        
        try:
            with StorageService.read(file_asset.file.name) as pdf_file:
                preview_image = cls._generate_pdf_preview(pdf_file, page, size)
            
            preview_path = f"previews/{file_asset.id}/{preview_type}_p{page}.jpg"
            
            with open(preview_image, 'rb') as img:
                StorageService.upload(preview_path, img)
            
            os.unlink(preview_image)
            
            url = StorageService.get_signed_url(preview_path)
            
            file_asset.metadata[f'preview_{preview_type}'] = preview_path
            file_asset.save(update_fields=['metadata'])
            
            logger.info(f"Preview:GENERATED file={file_asset.id} type={preview_type}")
            
            return {
                'preview_path': preview_path,
                'url': url,
                'type': preview_type,
                'page': page,
                'dimensions': size,
            }
            
        except Exception as e:
            logger.error(f"Preview:FAILED file={file_asset.id} error={e}")
            return {'error': str(e)}
    
    @staticmethod
    def _generate_pdf_preview(pdf_file, page: int, size: tuple) -> str:
        """Generate preview image from PDF using pdf2image or pikepdf."""
        try:
            from pdf2image import convert_from_bytes
            from PIL import Image
            
            images = convert_from_bytes(
                pdf_file.read(),
                first_page=page,
                last_page=page,
                size=size
            )
            
            if not images:
                raise OutputError("No pages extracted from PDF")
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            images[0].save(temp_file.name, 'JPEG', quality=85)
            
            return temp_file.name
            
        except ImportError:
            logger.warning("pdf2image not installed, previews unavailable")
            raise OutputError("Preview generation requires pdf2image")
    
    @classmethod
    def validate_output(cls, output_path: str, expected_type: str = 'application/pdf') -> bool:
        """Validate output file integrity."""
        if not os.path.exists(output_path):
            return False
        
        if os.path.getsize(output_path) == 0:
            return False
        
        if expected_type == 'application/pdf':
            with open(output_path, 'rb') as f:
                header = f.read(5)
                if header != b'%PDF-':
                    return False
        
        return True
    
    @classmethod
    def validate_preview_parity(cls, file_asset, preview_path: str) -> bool:
        """Check if preview exists and is valid."""
        from core.storage import StorageService
        
        if not StorageService.exists(preview_path):
            return False
        
        size = StorageService.get_size(preview_path)
        return size > 0
    
    @classmethod
    def finalize_quota(cls, user, file_asset):
        """
        Finalize storage quota after processing.
        Ensures user's storage usage is accurately updated.
        """
        from core.user_context import UserContextResolver
        
        context = UserContextResolver.resolve(user)
        
        file_asset.metadata['quota_finalized'] = True
        file_asset.metadata['finalized_at'] = timezone.now().isoformat()
        file_asset.save(update_fields=['metadata'])
        
        logger.info(
            f"Quota:FINALIZED user={user.id} file={file_asset.id} "
            f"usage={context['storage_used']}/{context['storage_limit']}"
        )
    
    @staticmethod
    def _calculate_hash(file_path: str) -> str:
        """Calculate SHA256 hash of file for integrity."""
        sha = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha.update(chunk)
        return sha.hexdigest()


class PreviewGenerator:
    """Batch preview generation service."""
    
    @classmethod
    def generate_all_previews(cls, file_asset) -> dict:
        """Generate all preview sizes for a file."""
        results = {}
        
        for preview_type in ['thumbnail', 'preview']:
            result = OutputService.generate_preview(file_asset, preview_type)
            results[preview_type] = result
        
        return results
    
    @classmethod
    def generate_multipage_preview(cls, file_asset, max_pages: int = 5) -> list:
        """Generate previews for multiple pages."""
        previews = []
        
        page_count = file_asset.page_count or 1
        pages_to_render = min(page_count, max_pages)
        
        for page in range(1, pages_to_render + 1):
            result = OutputService.generate_preview(file_asset, 'preview', page=page)
            previews.append(result)
        
        return previews


def store_output_version(file_asset, output_path: str, **kwargs) -> dict:
    """Convenience function."""
    return OutputService.store_output_version(file_asset, output_path, **kwargs)


def generate_preview(file_asset, **kwargs) -> dict:
    """Convenience function."""
    return OutputService.generate_preview(file_asset, **kwargs)


def validate_preview_parity(file_asset, preview_path: str) -> bool:
    """Convenience function."""
    return OutputService.validate_preview_parity(file_asset, preview_path)


def finalize_quota(user, file_asset):
    """Convenience function."""
    return OutputService.finalize_quota(user, file_asset)
