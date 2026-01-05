"""
Production Settings
"""
from .base import *

DEBUG = False

ALLOWED_HOSTS = [
    'ninja-pdf.onrender.com',
    'ninjapdf.com',
    'www.ninjapdf.com',
    '18pluspdf.com',
    'www.18pluspdf.com',
    '18pluspdf.in',
    'www.18pluspdf.in',
    'octopus-app-4mzsp.ondigitalocean.app',
    '.ondigitalocean.app',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['POSTGRES_DB'],
        'USER': os.environ['POSTGRES_USER'],
        'PASSWORD': os.environ['POSTGRES_PASSWORD'],
        'HOST': os.environ['POSTGRES_HOST'],
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'sslmode': 'require',
        },
    }
}

EMAIL_BACKEND = 'core.email_backend.ZeptoEmailBackend'

# WARNING: CORS_ORIGIN_ALLOW_ALL is set to True. This allows any origin to make requests.
# WARNING: CORS_ORIGIN_ALLOW_ALL is set to True. This allows any origin to make requests.
CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOWED_ORIGINS = [
    "https://octopus-app-4mzsp.ondigitalocean.app",
    "http://localhost:8000",
    "https://18pluspdf.com",
    "https://www.18pluspdf.com",
    "https://18pluspdf.in",
    "https://www.18pluspdf.in",
    "http://localhost:3000",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "https://octopus-app-4mzsp.ondigitalocean.app",
    "http://localhost:8000",
    "https://18pluspdf.com",
    "https://www.18pluspdf.com",
    "https://18pluspdf.in",
    "https://www.18pluspdf.in",
    "http://localhost:3000",
]

CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'true').lower() == 'true'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
