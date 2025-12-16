import os
import django
import sys

# Setup Django environment
sys.path.append('/home/suzume/NINJa/Ninja-PDF/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from allauth.account.models import EmailAddress

def verify_users():
    emails = ['superadmin@gmail.com', 'admin@gmail.com', 'user@gmail.com']
    
    for email in emails:
        try:
            user = User.objects.get(email=email)
            # Ensure User model is verified
            user.is_verified = True
            user.save()
            
            # Ensure AllAuth EmailAddress exists and is verified
            email_address, created = EmailAddress.objects.get_or_create(
                user=user, 
                email=email,
                defaults={'verified': True, 'primary': True}
            )
            
            if not created and not email_address.verified:
                email_address.verified = True
                email_address.save()
                
            print(f"Verified {email} (User + AllAuth)")
            
        except User.DoesNotExist:
            print(f"User {email} not found")

if __name__ == "__main__":
    verify_users()
