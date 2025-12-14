import os 
import django
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from authentication.models import User
from core.models import PlatformBranding
from billing.models import Plan, Subscription

def setup_full():
    print("--- Starting Full Backend Setup ---")
    
    # 1. Branding
    print("-> Configuring Branding...")
    branding = PlatformBranding.load()
    branding.platform_name = "18+ PDF"
    branding.hero_title = "All your PDF headache in one place."
    branding.hero_subtitle = "Simple, super, and totally free!"
    branding.save()
    print("   Branding Set: 18+ PDF")

    # 2. Users
    print("-> Configuring Users...")
    
    # Admin
    admin_email = "admin@admin.com"
    admin_pass = "admin123" # Simple password for testing as requested
    user, created = User.objects.get_or_create(email=admin_email)
    user.first_name = "Divith"
    user.last_name = "Super"
    user.set_password(admin_pass)
    user.role = "SUPER_ADMIN"
    user.is_superuser = True
    user.is_staff = True
    user.is_verified = True
    user.save()
    print(f"   Admin: {admin_email} / {admin_pass} (SUPER_ADMIN)")
    
    from allauth.account.models import EmailAddress

    # User
    user_email = "user@user.com"
    user_pass = "user123"
    u2, created2 = User.objects.get_or_create(email=user_email)
    u2.first_name = "Divith" 
    u2.last_name = "User"
    u2.set_password(user_pass)
    u2.role = "USER"
    u2.is_verified = True
    u2.save()

    # Ensure EmailAddress is verified for Allauth
    email_obj, _ = EmailAddress.objects.get_or_create(user=u2, email=user_email)
    email_obj.verified = True
    email_obj.primary = True
    email_obj.save()

    # Ensure Admin EmailAddress is verified
    admin_email_obj, _ = EmailAddress.objects.get_or_create(user=user, email=admin_email)
    admin_email_obj.verified = True
    admin_email_obj.primary = True
    admin_email_obj.save()
    
    # Ensure User has Free Plan
    free_plan, _ = Plan.objects.get_or_create(slug="free", defaults={
        "name": "Free", "price": 0, "currency": "INR", "interval": "MONTHLY"
    })

    pro_plan, _ = Plan.objects.get_or_create(slug="pro", defaults={
        "name": "Pro", "price": 499, "currency": "INR", "interval": "MONTHLY"
    })
    
    from django.utils import timezone
    from datetime import timedelta
    
    sub, _ = Subscription.objects.get_or_create(user=u2, defaults={
        'plan': free_plan,
        'status': 'ACTIVE',
        'current_period_end': timezone.now() + timedelta(days=30)
    })
    # If it existed, ensure fields are set
    if not _:
        sub.plan = free_plan
        sub.status = 'ACTIVE'
        sub.current_period_end = timezone.now() + timedelta(days=30)
        sub.save()
    print(f"   User:  {user_email} / {user_pass} (USER - Free Plan)")

    print("--- Setup Complete ---")

if __name__ == '__main__':
    setup_full()
