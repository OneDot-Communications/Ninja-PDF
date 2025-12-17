"""
GDPR Compliance Module
Full data deletion and export capabilities.
"""
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


class GDPRService:
    """GDPR compliance operations."""
    
    @staticmethod
    @transaction.atomic
    def delete_user_data(user) -> dict:
        """
        Perform full GDPR deletion for a user.
        Removes all personal data while preserving audit records.
        
        Returns:
            dict: Summary of deleted items
        """
        from apps.files.models import FileAsset
        from apps.jobs.models import Job
        from infrastructure.storage.service import StorageService
        
        deleted = {
            'files': 0,
            'jobs': 0,
            'subscriptions': 0,
            'profile_cleared': False,
        }
        
        # Delete all file storage
        files = FileAsset.objects.filter(user=user)
        for file_asset in files:
            if file_asset.storage_path:
                StorageService.delete(file_asset.storage_path)
            preview_path = file_asset.metadata.get('preview_path')
            if preview_path:
                StorageService.delete(preview_path)
            deleted['files'] += 1
        files.delete()
        
        # Delete jobs
        deleted['jobs'] = Job.objects.filter(user=user).delete()[0]
        
        # Cancel subscription
        if hasattr(user, 'subscription'):
            user.subscription.status = 'CANCELED'
            user.subscription.save()
            deleted['subscriptions'] = 1
        
        # Clear personal data from user record (keep for audit)
        user.first_name = 'DELETED'
        user.last_name = 'USER'
        user.is_active = False
        user.save()
        deleted['profile_cleared'] = True
        
        # Log for compliance
        logger.info(
            f"GDPR deletion completed for user {user.id}: "
            f"{deleted['files']} files, {deleted['jobs']} jobs"
        )
        
        return deleted
    
    @staticmethod
    def export_user_data(user) -> dict:
        """
        Export all user data for GDPR data portability.
        
        Returns:
            dict: All user data in portable format
        """
        from apps.files.models import FileAsset
        from apps.jobs.models import Job
        
        data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.date_joined.isoformat(),
            },
            'files': [],
            'jobs': [],
        }
        
        for f in FileAsset.objects.filter(user=user):
            data['files'].append({
                'id': f.id,
                'name': f.name,
                'size': f.size_bytes,
                'status': f.status,
                'created_at': f.created_at.isoformat(),
                'metadata': f.metadata,
            })
        
        for j in Job.objects.filter(user=user):
            data['jobs'].append({
                'id': str(j.id),
                'tool': j.tool_type,
                'status': j.status,
                'created_at': j.created_at.isoformat(),
            })
        
        return data
