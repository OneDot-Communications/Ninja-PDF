import os
import django
import sys

# Setup Django environment
sys.path.append('/home/suzume/NINJa/Ninja-PDF/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
 
from apps.accounts.models import User
from allauth.account.models import EmailAddress

def check_verification():
    emails = ['superadmin@gmail.com', 'admin@gmail.com', 'user@gmail.com']
    
    print(f"{'Email':<30} | {'Is Verified (User)':<20} | {'EmailAddress Verified'}")
    print("-" * 75)
    
    for email in emails:
        try:
            user = User.objects.get(email=email)
            user_verified = user.is_verified
            
            try:
                email_address = EmailAddress.objects.get(user=user, email=email)
                allauth_verified = email_address.verified
            except EmailAddress.DoesNotExist:
                allauth_verified = "N/A"
            
            print(f"{email:<30} | {str(user_verified):<20} | {str(allauth_verified)}")
        except User.DoesNotExist:
            print(f"{email:<30} | {'Not Found':<20} | {'-'}")

if __name__ == "__main__":
    check_verification()
