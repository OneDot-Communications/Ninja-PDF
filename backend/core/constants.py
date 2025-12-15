"""
System Constants
Global enumerations and configuration values.
"""
from enum import Enum


class FileStatus(str, Enum):
    """File lifecycle states (12-state machine)."""
    CREATED = 'CREATED'
    UPLOADING = 'UPLOADING'
    VALIDATED = 'VALIDATED'
    TEMP_STORED = 'TEMP_STORED'
    METADATA_REGISTERED = 'METADATA_REGISTERED'
    QUEUED = 'QUEUED'
    PROCESSING = 'PROCESSING'
    OUTPUT_GENERATED = 'OUTPUT_GENERATED'
    PREVIEW_GENERATED = 'PREVIEW_GENERATED'
    STORED_FINAL = 'STORED_FINAL'
    AVAILABLE = 'AVAILABLE'
    EXPIRED = 'EXPIRED'
    DELETED = 'DELETED'
    FAILED = 'FAILED'


class JobStatus(str, Enum):
    """Job lifecycle states."""
    PENDING = 'PENDING'
    QUEUED = 'QUEUED'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    DEAD_LETTER = 'DEAD_LETTER'
    CANCELED = 'CANCELED'


class SubscriptionStatus(str, Enum):
    """Subscription lifecycle states."""
    FREE = 'FREE'
    PENDING_PAYMENT = 'PENDING_PAYMENT'
    ACTIVE = 'ACTIVE'
    GRACE_PERIOD = 'GRACE_PERIOD'
    SUSPENDED = 'SUSPENDED'
    CANCELED = 'CANCELED'


class UserTier(str, Enum):
    """User account tiers."""
    GUEST = 'GUEST'
    FREE = 'FREE'
    PREMIUM = 'PREMIUM'
    TEAM = 'TEAM'
    ADMIN = 'ADMIN'


class ToolCategory(str, Enum):
    """Tool categories."""
    CONVERSION = 'conversion'
    COMPRESSION = 'compression'
    EDITING = 'editing'
    SECURITY = 'security'
    AI = 'ai'
    REPAIR = 'repair'


STORAGE_QUOTAS = {
    UserTier.GUEST: 0,
    UserTier.FREE: 100 * 1024 * 1024,         # 100 MB
    UserTier.PREMIUM: 1024 * 1024 * 1024,      # 1 GB
    UserTier.TEAM: 10 * 1024 * 1024 * 1024,    # 10 GB
    UserTier.ADMIN: -1,                         # Unlimited
}


RATE_LIMITS = {
    UserTier.GUEST: {'requests_per_minute': 5, 'jobs_per_hour': 10},
    UserTier.FREE: {'requests_per_minute': 20, 'jobs_per_hour': 50},
    UserTier.PREMIUM: {'requests_per_minute': 60, 'jobs_per_hour': 500},
    UserTier.TEAM: {'requests_per_minute': 120, 'jobs_per_hour': 1000},
    UserTier.ADMIN: {'requests_per_minute': -1, 'jobs_per_hour': -1},
}


AI_QUOTAS_MONTHLY = {
    UserTier.GUEST: 0,
    UserTier.FREE: 0,
    UserTier.PREMIUM: 100,
    UserTier.TEAM: 500,
    UserTier.ADMIN: -1,
}


AUTOMATION_CAPS = {
    UserTier.GUEST: 0,
    UserTier.FREE: 0,
    UserTier.PREMIUM: 5,
    UserTier.TEAM: 50,
    UserTier.ADMIN: -1,
}


MAX_FILE_SIZES = {
    UserTier.GUEST: 10 * 1024 * 1024,
    UserTier.FREE: 50 * 1024 * 1024,
    UserTier.PREMIUM: 100 * 1024 * 1024,
    UserTier.TEAM: 200 * 1024 * 1024,
    UserTier.ADMIN: 500 * 1024 * 1024,
}


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


JOB_PRIORITIES = {
    UserTier.GUEST: -10,
    UserTier.FREE: 0,
    UserTier.PREMIUM: 50,
    UserTier.TEAM: 50,
    UserTier.ADMIN: 100,
}


QUEUE_NAMES = {
    UserTier.GUEST: 'default',
    UserTier.FREE: 'default',
    UserTier.PREMIUM: 'high_priority',
    UserTier.TEAM: 'high_priority',
    UserTier.ADMIN: 'high_priority',
}


FILE_EXPIRATION_HOURS = {
    UserTier.GUEST: 1,
    UserTier.FREE: 24 * 30,      # 30 days
    UserTier.PREMIUM: 24 * 365,  # 1 year
    UserTier.TEAM: 24 * 365,     # 1 year
    UserTier.ADMIN: -1,          # Never
}


# Environment Configuration Validator
import os
import sys
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def validate_required_env_vars():
    """Validate required environment variables on startup."""
    # Ensure .env is loaded early (this function runs before settings may load it)
    try:
        load_dotenv()
    except Exception:
        # If dotenv isn't available or fails, continue and rely on process env
        pass

    # Accept DJANGO_SECRET_KEY as an alias for SECRET_KEY (common in our settings)
    if not os.getenv('SECRET_KEY') and os.getenv('DJANGO_SECRET_KEY'):
        os.environ['SECRET_KEY'] = os.getenv('DJANGO_SECRET_KEY')

    required = ['SECRET_KEY']
    
    storage_backend = os.getenv('STORAGE_BACKEND', 'local').lower()
    if storage_backend in ('s3', 'r2'):
        required.extend([
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_STORAGE_BUCKET_NAME',
        ])
        if storage_backend == 'r2':
            required.append('AWS_S3_ENDPOINT_URL')
    
    if os.getenv('DJANGO_ENV', 'development') == 'production':
        required.extend([
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'DATABASE_URL',
            'REDIS_URL',
        ])
    
    missing = [var for var in required if not os.getenv(var)]
    
    if missing:
        msg = f"Missing required environment variables: {', '.join(missing)}"
        logger.critical(msg)
        if os.getenv('DJANGO_ENV', 'development') == 'production':
            sys.exit(1)
