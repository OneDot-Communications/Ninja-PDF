"""
Settings Package Initializer
Selects the appropriate settings module based on DJANGO_ENV environment variable.
"""
import os

env = os.getenv('DJANGO_ENV', 'development')

if env == 'production':
    from .production import *
elif env == 'testing':
    from .testing import *
else:
    from .development import *
