import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.subscriptions.models.subscription import Feature

# Feature Codes and Free Limits (Daily)
features = [
    {'code': 'WORD_TO_PDF', 'name': 'Word to PDF', 'free_limit': 10},
    {'code': 'EXCEL_TO_PDF', 'name': 'Excel to PDF', 'free_limit': 10},
    {'code': 'PPT_TO_PDF', 'name': 'PowerPoint to PDF', 'free_limit': 10},
    {'code': 'JPG_TO_PDF', 'name': 'JPG to PDF', 'free_limit': 20},
    {'code': 'HTML_TO_PDF', 'name': 'HTML to PDF', 'free_limit': 5},
    {'code': 'MD_TO_PDF', 'name': 'Markdown to PDF', 'free_limit': 5},
    
    # Security Tools
    {'code': 'PROTECT_PDF', 'name': 'Protect PDF', 'free_limit': 5},
    {'code': 'UNLOCK_PDF', 'name': 'Unlock PDF', 'free_limit': 5},
    {'code': 'SIGN_PDF', 'name': 'Sign PDF', 'free_limit': 5},
    {'code': 'WATERMARK_PDF', 'name': 'Watermark PDF', 'free_limit': 5},
    
    # Optimization
    {'code': 'COMPRESS_PDF', 'name': 'Compress PDF', 'free_limit': 5},
    {'code': 'MERGE_PDF', 'name': 'Merge PDF', 'free_limit': 5},
    {'code': 'SPLIT_PDF', 'name': 'Split PDF', 'free_limit': 5},
    
    # Premium Only (0 limit, premium_default=True)
    {'code': 'EDIT_PDF_AI', 'name': 'AI Edit PDF', 'free_limit': 0, 'is_premium_default': True},
    {'code': 'OCR_PDF', 'name': 'OCR PDF', 'free_limit': 0, 'is_premium_default': True},
]

for f_data in features:
    is_premium = f_data.pop('is_premium_default', False)
    feature, created = Feature.objects.get_or_create(code=f_data['code'], defaults={
        'name': f_data['name'],
        'description': f"Access to {f_data['name']}",
        'free_limit': f_data['free_limit'],
        'is_premium_default': is_premium
    })
    
    # Update limit if exists (optional, but good for sync)
    if not created:
        feature.free_limit = f_data['free_limit']
        feature.is_premium_default = is_premium
        feature.save()
        print(f"Updated feature: {feature.name}")
    else:
        print(f"Created feature: {feature.name}")
