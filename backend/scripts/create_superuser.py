"""
Script to create a superuser and display database table structure.
Run with: python scripts/create_superuser.py
"""
import os
import sys
import django

# Setup Django environment - use Windows path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection
from apps.accounts.models import User, OTP
from allauth.account.models import EmailAddress


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def show_user_model_structure():
    """Display User model fields and their details"""
    print_section("USER MODEL STRUCTURE (users table)")
    
    print("\n📋 Model Fields:")
    print("-" * 50)
    
    for field in User._meta.get_fields():
        field_type = type(field).__name__
        
        if hasattr(field, 'max_length') and field.max_length:
            print(f"  • {field.name:25} | {field_type}({field.max_length})")
        else:
            print(f"  • {field.name:25} | {field_type}")
    
    print("\n📌 User Roles:")
    for role_value, role_label in User.Roles.choices:
        print(f"  • {role_value}: {role_label}")
    
    print("\n💳 Subscription Tiers:")
    for tier_value, tier_label in User.SubscriptionTiers.choices:
        print(f"  • {tier_value}: {tier_label}")
    
    print("\n🔑 Key Settings:")
    print(f"  • USERNAME_FIELD: {User.USERNAME_FIELD}")
    print(f"  • REQUIRED_FIELDS: {User.REQUIRED_FIELDS}")
    print(f"  • DB Table: {User._meta.db_table}")


def show_otp_model_structure():
    """Display OTP model fields"""
    print_section("OTP MODEL STRUCTURE (user_otps table)")
    
    print("\n📋 Model Fields:")
    print("-" * 50)
    
    for field in OTP._meta.get_fields():
        field_type = type(field).__name__
        print(f"  • {field.name:25} | {field_type}")


def show_signup_flow():
    """Display signup serializer fields and process"""
    print_section("SIGNUP FLOW (SignupSerializer)")
    
    print("\n📝 Required Fields:")
    print("  • email (EmailField) - Primary identifier")
    print("  • password1 (CharField) - Password")
    print("  • password2 (CharField) - Password confirmation")
    
    print("\n📝 Optional Fields:")
    print("  • first_name (CharField)")
    print("  • last_name (CharField)")
    print("  • referral_code (CharField)")
    
    print("\n🔄 Signup Process:")
    print("  1. User submits signup form with email + password")
    print("  2. SignupSerializer validates data")
    print("  3. User is created via dj-rest-auth RegisterSerializer")
    print("  4. custom_signup() hook sets first_name, last_name")
    print("  5. If referral_code provided, Referral record created")
    print("  6. OTP sent to email for verification")
    print("  7. User verifies OTP → is_verified = True")


def show_all_users():
    """List all existing users"""
    print_section("EXISTING USERS")
    
    users = User.objects.all()
    
    if not users:
        print("\n  No users found in database.")
        return
    
    print(f"\n  Total Users: {users.count()}")
    print("-" * 70)
    print(f"  {'ID':5} | {'Email':30} | {'Role':12} | {'Verified':8} | {'Active':6}")
    print("-" * 70)
    
    for user in users:
        print(f"  {user.id:<5} | {user.email:30} | {user.role:12} | {'✓' if user.is_verified else '✗':^8} | {'✓' if user.is_active else '✗':^6}")


def create_superuser():
    """Interactive superuser creation"""
    print_section("CREATE SUPERUSER")
    
    print("\n🔐 Create a new Super Admin account:")
    
    email = input("  Email: ").strip()
    if not email:
        print("  ❌ Email is required!")
        return
    
    # Check if user exists
    if User.objects.filter(email=email).exists():
        user = User.objects.get(email=email)
        print(f"\n  ⚠️  User '{email}' already exists!")
        upgrade = input("  Upgrade to Super Admin? (y/n): ").strip().lower()
        
        if upgrade == 'y':
            user.role = User.Roles.SUPER_ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_verified = True
            user.save()
            
            # Also verify in AllAuth
            email_addr, created = EmailAddress.objects.get_or_create(
                user=user, email=email,
                defaults={'verified': True, 'primary': True}
            )
            if not created:
                email_addr.verified = True
                email_addr.save()
            
            print(f"\n  ✅ User '{email}' upgraded to Super Admin!")
        return
    
    first_name = input("  First Name: ").strip()
    last_name = input("  Last Name: ").strip()
    password = input("  Password: ").strip()
    
    if not password:
        print("  ❌ Password is required!")
        return
    
    # Create the superuser
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=User.Roles.SUPER_ADMIN,
        is_staff=True,
        is_superuser=True,
        is_verified=True
    )
    
    # Create EmailAddress for AllAuth
    EmailAddress.objects.create(
        user=user,
        email=email,
        verified=True,
        primary=True
    )
    
    print(f"\n  ✅ Super Admin '{email}' created successfully!")
    print(f"     - Role: {user.role}")
    print(f"     - Staff: {user.is_staff}")
    print(f"     - Superuser: {user.is_superuser}")
    print(f"     - Verified: {user.is_verified}")


def main():
    print("\n" + "🥷" * 20)
    print("   NINJA-PDF USER & DATABASE EXPLORER")
    print("🥷" * 20)
    
    # Show database structure
    show_user_model_structure()
    show_otp_model_structure()
    show_signup_flow()
    show_all_users()
    
    # Ask if user wants to create superuser
    print("\n")
    create = input("Would you like to create a Super Admin? (y/n): ").strip().lower()
    
    if create == 'y':
        create_superuser()
    
    print("\n" + "=" * 60)
    print("  Done! 🎉")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
