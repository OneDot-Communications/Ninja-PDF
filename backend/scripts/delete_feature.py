import os
import django
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.subscriptions.models.subscription import Feature

def delete_feature():
    code_to_delete = 'EDIT_PDF_AI'
    try:
        feature = Feature.objects.get(code=code_to_delete)
        name = feature.name
        feature.delete()
        print(f"Successfully deleted feature: {name} ({code_to_delete})")
    except Feature.DoesNotExist:
        print(f"Feature with code {code_to_delete} does not exist.")

if __name__ == '__main__':
    delete_feature()
