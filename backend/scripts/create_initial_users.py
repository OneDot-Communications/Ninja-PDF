import os
import django
import sys

# Setup Django environment
sys.path.append('/home/suzume/NINJa/Ninja-PDF/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from django.contrib.auth import get_user_model

def create_users():
    User = get_user_model()
    
    users_data = [
        {
            'email': 'superadmin@gmail.com',
            'password': 'superadmin',
            'role': User.Roles.SUPER_ADMIN,
            'is_staff': True,
            'is_superuser': True
        },
        {
            'email': 'admin@gmail.com',
            'password': 'admin',
            'role': User.Roles.ADMIN,
            'is_staff': True,
            'is_superuser': False
        },
        {
            'email': 'user@gmail.com',
            'password': 'user',
            'role': User.Roles.USER,
            'is_staff': False,
            'is_superuser': False
        }
    ]

    for data in users_data:
        email = data['email']
        password = data['password']
        role = data['role']
        is_staff = data['is_staff']
        is_superuser = data['is_superuser']

        if User.objects.filter(email=email).exists():
            print(f"User {email} already exists. Skipping.")
            user = User.objects.get(email=email)
            # Update role/stats just in case
            user.role = role
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.save()
            print(f"Updated {email} role to {role}")
        else:
            print(f"Creating user {email}...")
            # Use create_superuser for superuser to ensure all flags are set correctly by default managers if needed
            if is_superuser:
                user = User.objects.create_superuser(email=email, password=password)
            else:
                user = User.objects.create_user(email=email, password=password)
            
            # Explicitly set other fields
            user.role = role
            user.is_staff = is_staff
            # Save again to ensure our overrides stick
            user.save()
            print(f"User {email} created successfully with role {role}")

if __name__ == "__main__":
    create_users()
