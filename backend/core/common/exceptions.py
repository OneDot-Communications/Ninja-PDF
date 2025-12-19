"""
Custom Exceptions
Application-specific exception classes.
"""


class NinjaPDFException(Exception):
    """Base exception for all application errors."""
    default_message = "An error occurred."
    default_code = "error"
    
    def __init__(self, message=None, code=None, details=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self):
        return {
            'error': self.code,
            'message': self.message,
            'details': self.details,
        }


class ValidationError(NinjaPDFException):
    """Input validation failed."""
    default_message = "Validation failed."
    default_code = "validation_error"


class QuotaExceededError(NinjaPDFException):
    """User quota exceeded."""
    default_message = "Quota exceeded. Please upgrade your plan."
    default_code = "quota_exceeded"


class StorageError(NinjaPDFException):
    """Storage operation failed."""
    default_message = "Storage operation failed."
    default_code = "storage_error"


class FileProcessingError(NinjaPDFException):
    """File processing failed."""
    default_message = "File processing failed."
    default_code = "processing_error"


class AuthorizationError(NinjaPDFException):
    """User not authorized for this action."""
    default_message = "You are not authorized to perform this action."
    default_code = "authorization_error"


class PaymentError(NinjaPDFException):
    """Payment processing failed."""
    default_message = "Payment processing failed."
    default_code = "payment_error"


class RateLimitError(NinjaPDFException):
    """Rate limit exceeded."""
    default_message = "Too many requests. Please try again later."
    default_code = "rate_limit_exceeded"


class ExternalServiceError(NinjaPDFException):
    """External service call failed."""
    default_message = "External service unavailable."
    default_code = "external_service_error"
