import os
import sys
import django
from django.conf import settings
from django.core.mail import send_mail

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_zepto_api():
    print("\n--- Testing ZeptoMail API ---")
    api_url = getattr(settings, 'ZEPTO_API_URL', 'Not Set')
    api_key = getattr(settings, 'ZEPTO_API_KEY', 'Not Set')
    
    print(f"API URL: {api_url}")
    print(f"API Key: {'Set' if api_key else 'Not Set'}")

    if not api_key:
        print("FAILURE: ZEPTO_API_KEY is missing.")
        return

    print("\n--- Sending Test Email ---")
    try:
        send_mail(
            'Test Subject (API)',
            'This is a test email sent via ZeptoMail API backend.',
            settings.DEFAULT_FROM_EMAIL,
            ['chnprojects.2025@gmail.com'], # Using the email from user request
            fail_silently=False,
        )
        print("SUCCESS: Email sent to ZeptoMail API (check logs for response).")
    except Exception as e:
        print(f"FAILURE: Send mail failed: {e}")

if __name__ == '__main__':
    test_zepto_api()
