
import requests
import sys

try:
    response = requests.get('http://localhost:8000/api/auth/user/')
    print(f"Status Code: {response.status_code}")
    # We expect 401 Unauthorized (because we provide no token) or 200 (if allowed any), but NOT 404.
    # If 404, it means URL logic is still wrong.
    if response.status_code == 404:
        print("FAIL: Still 404")
        sys.exit(1)
    else:
        print("SUCCESS: Endpoint exists (even if 401/403)")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
