"""
Common Constants
Shared enumerations and configuration values across the application.
"""
from enum import Enum


class FileStatus(str, Enum):
    """File lifecycle states."""
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
    """Job execution states."""
    PENDING = 'PENDING'
    QUEUED = 'QUEUED'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    DEAD_LETTER = 'DEAD_LETTER'


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


STORAGE_QUOTAS_BYTES = {
    UserTier.GUEST: 0,
    UserTier.FREE: 100 * 1024 * 1024,      # 100 MB
    UserTier.PREMIUM: 1024 * 1024 * 1024,   # 1 GB
    UserTier.TEAM: 10 * 1024 * 1024 * 1024, # 10 GB
    UserTier.ADMIN: -1,                      # Unlimited
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


ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'text/html',
    'text/markdown',
    'text/plain',
]
