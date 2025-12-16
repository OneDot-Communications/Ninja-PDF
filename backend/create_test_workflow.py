import os
import django
import sys

# Setup Django environment
sys.path.append(r'c:\Users\dhaks\Desktop\Ninjapdf\Ninja-PDF\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.workflows.models.workflow import Workflow
from django.contrib.auth import get_user_model

User = get_user_model()

def create_workflow():
    try:
        # Get the user 'dhakshin' or the first superuser
        user = User.objects.filter(email__icontains='dhakshin').first() or User.objects.filter(is_superuser=True).first()
        
        if not user:
            print("No user found. Please create a user first.")
            return

        print(f"Creating workflow for user: {user.email}")

        # Create a sample workflow
        wf = Workflow.objects.create(
            user=user,
            name="Demo Workflow (Auto-Generated)",
            description="A test workflow created to verify dashboard visibility.",
            definition={
                "steps": ["Watermark", "Rotate 90°", "Compress PDF"]
            }
        )
        
        print(f"Successfully created workflow: {wf.name} (ID: {wf.id})")
        print(f"Steps: {wf.definition['steps']}")

    except Exception as e:
        print(f"Error creating workflow: {e}")

if __name__ == '__main__':
    create_workflow()
