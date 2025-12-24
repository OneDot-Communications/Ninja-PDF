import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

@app.task(bind=True)    
def debug_task(self):
    print(f'Request: {self.request!r}')

from celery.schedules import crontab

app.conf.beat_schedule = {
    'daily-quota-reset': {
        'task': 'core.tasks.call_command_task', # We need a wrapper task to call command, OR register command as task.
        # Simpler: Use a shared_task that calls call_command.
        # Or better: We didn't create 'core.tasks' wrapper yet.
        # Let's create a task wrapper in core/tasks.py first or inline logic here?
        # Inline is messy. Let's refer to 'core.tasks.daily_maintenance' which calls the commands.
        'task': 'core.tasks.daily_maintenance',
        'schedule': crontab(minute=0, hour=0), # Midnight
    },
}
