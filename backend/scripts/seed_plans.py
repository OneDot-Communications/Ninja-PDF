
import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from billing.models import Plan

plans = [
    {
        'name': 'Free',
        'slug': 'free',
        'price': 0.00,
        'interval': 'MONTHLY',
        'features': {
            'pdf_conversion': True,
            'ocr': False,
            'max_file_size': '10MB',
            'support': 'Community'
        }
    },
    {
        'name': 'Pro',
        'slug': 'pro',
        'price': 9.99,
        'interval': 'MONTHLY',
        'features': {
            'pdf_conversion': True,
            'ocr': True,
            'max_file_size': '100MB',
            'support': 'Email',
            'unlimited_storage': True
        }
    },
    {
        'name': 'Enterprise',
        'slug': 'enterprise',
        'price': 49.99,
        'interval': 'YEARLY',
        'features': {
            'pdf_conversion': True,
            'ocr': True,
            'max_file_size': '2GB',
            'support': '24/7 Dedicated',
            'sso': True,
            'api_access': True
        }
    }
]

for p_data in plans:
    plan, created = Plan.objects.get_or_create(slug=p_data['slug'], defaults=p_data)
    if created:
        print(f"Created plan: {plan.name}")
    else:
        print(f"Plan already exists: {plan.name}")
