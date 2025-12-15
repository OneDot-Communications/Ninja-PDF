# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

# Validate environment on startup 
try:
    from .constants import validate_required_env_vars
    validate_required_env_vars()
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"Config validation skipped: {e}")

__all__ = ('celery_app',)
default_app_config = 'core.apps.CoreConfig'
default_app_config = 'core.apps.CoreConfig'
