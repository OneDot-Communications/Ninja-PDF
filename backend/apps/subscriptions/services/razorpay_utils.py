
import razorpay
from django.conf import settings

# Initialize Razorpay Client
# Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are in settings.py or env
# For now, we will use placeholders or env vars.
# If verification fails due to missing keys, we might need to mock or ask user.
# But "Real Payment" necessitates real keys or Test Mode keys.
# We will assume they are present in settings.

def get_razorpay_client():
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_placeholder')
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', 'secret_placeholder')
    return razorpay.Client(auth=(key_id, key_secret))

def create_order(amount, currency='INR', receipt=None, notes=None):
    """
    Amount expected in standard unit (e.g., 10.00). 
    Razorpay expects paisa/cents for INR/USD (multiply by 100).
    """
    client = get_razorpay_client()
    data = {
        "amount": int(amount * 100), # Convert to subunit
        "currency": currency,
        "receipt": receipt,
        "notes": notes or {}
    }
    return client.order.create(data=data)

def verify_payment_signature(params_dict):
    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature(params_dict)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
