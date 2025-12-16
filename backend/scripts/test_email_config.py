import os
import sys
import django
import smtplib
from django.conf import settings
from django.core.mail import send_mail

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_smtp_connection():
    print("\n--- Testing Raw SMTP Connection ---")
    host = os.getenv('EMAIL_HOST')
    port = os.getenv('EMAIL_PORT')
    user = os.getenv('EMAIL_HOST_USER')
    password = os.getenv('EMAIL_HOST_PASSWORD')
    use_tls = os.getenv('EMAIL_USE_TLS') == 'True'

    print(f"Host: {host}:{port}")
    print(f"User: {user}")
    print(f"TLS: {use_tls}")

    try:
        server = smtplib.SMTP(host, port)
        server.set_debuglevel(1)
        if use_tls:
            server.starttls()
        server.login(user, password)
        print("SUCCESS: SMTP Authentication successful!")
        server.quit()
        return True
    except Exception as e:
        print(f"FAILURE: SMTP Connection failed: {e}")
        return False

def test_django_email():
    print("\n--- Testing Django send_mail ---")
    try:
        send_mail(
            'Test Subject',
            'This is a test email from Django.',
            settings.DEFAULT_FROM_EMAIL,
            ['suzume@example.com'], # we will replace this with a real email if possible or just check for errors
            fail_silently=False,
        )
        print("SUCCESS: Django send_mail executed without error (check inbox/console).")
    except Exception as e:
        print(f"FAILURE: Django send_mail failed: {e}")

def test_allauth_email_generation():
    print("\n--- Testing AllAuth Email Generation ---")
    from allauth.account.models import EmailAddress
    from allauth.account.utils import send_email_confirmation
    from apps.accounts.models import User
    from django.contrib.sites.models import Site

    site = Site.objects.get_current()
    print(f"Current Site: {site.domain} ({site.name})")

    user = User.objects.first()
    if not user:
        print("No users found to test.")
        return

    print(f"Testing with user: {user.email}")
    try:
        # Dry run of logic
        email_address = EmailAddress.objects.filter(user=user, email=user.email).first()
        if not email_address:
            print("Creating email address record...")
            email_address = EmailAddress.objects.create(user=user, email=user.email, primary=True, verified=False)
        
        print("Attempting to send confirmation...")
        # We catch the exception inside allauth if any
        send_email_confirmation(None, user, signup=False)
        print("SUCCESS: send_email_confirmation executed.")
    except Exception as e:
        print(f"FAILURE: AllAuth email generation failed: {e}")

if __name__ == '__main__':
    smtp_ok = test_smtp_connection()
    if smtp_ok:
        test_django_email()
        test_allauth_email_generation()
