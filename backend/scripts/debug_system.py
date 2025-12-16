import os
import sys
import django
from datetime import timedelta

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from apps.accounts.models.session import UserSession
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def check_storage():
    print("\n--- CHECKING STORAGE CONFIGURATION ---")
    print(f"STORAGE_BACKEND env var: {os.getenv('STORAGE_BACKEND')}")
    print(f"Default Storage Class: {default_storage.__class__.__name__}")
    
    try:
        # Try saving a test file
        path = default_storage.save('test_debug.txt', ContentFile(b'Hello World'))
        url = default_storage.url(path)
        print(f"SUCCESS: Saved test file to: {path}")
        print(f"URL: {url}")
        
        # Clean up if possible (S3 usually supports delete)
        try:
            default_storage.delete(path)
            print("SUCCESS: Deleted test file")
        except Exception as e:
            print(f"WARNING: Could not delete test file: {e}")
            
    except Exception as e:
        print(f"FAIL: Storage check failed: {e}")

def check_token_logic():
    print("\n--- CHECKING TOKEN GENERATION LOGIC ---")
    user = User.objects.first()
    if not user:
        print("FAIL: No users found in DB to test with.")
        return

    print(f"Testing with user: {user.email}")

    # Simulate Login Logic
    try:
        session = UserSession.objects.create(
            user=user,
            ip_address='127.0.0.1',
            user_agent='DebugScript',
            device_fingerprint='debug-fingerprint'
        )
        print(f"Created Session ID: {session.id}")

        refresh = RefreshToken.for_user(user)
        refresh['session_id'] = str(session.id)
        access = refresh.access_token
        access['session_id'] = str(session.id)

        print(f"Generated Access Token: {str(access)[:20]}...")
        
        # Verify Payload
        payload = access.payload
        if 'session_id' in payload:
            print(f"SUCCESS: session_id found in token payload: {payload['session_id']}")
        else:
            print(f"FAIL: session_id MISSING from token payload. Payload keys: {payload.keys()}")
            
    except Exception as e:
        print(f"FAIL: Token logic error: {e}")

if __name__ == "__main__":
    check_storage()
    check_token_logic()
