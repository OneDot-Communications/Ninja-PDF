import random
from django.utils import timezone
from datetime import timedelta
from .models import OTP, User
import logging

# Fix import path: 'email' module collision resolved by renaming to 'emails'
from emails.services import send_otp_email

logger = logging.getLogger(__name__)

def generate_otp(user: User):
    code = f"{random.randint(100000, 999999)}"
    expires_at = timezone.now() + timedelta(minutes=10) # 10 min expiry
    OTP.objects.create(user=user, code=code, expires_at=expires_at)
    
    # Send OTP via Email Service. Email failures (SMTP errors, creds, etc.)
    # should not abort user creation — log and continue so API doesn't 500.
    try:
        sent = send_otp_email(user.email, code)
        if not sent:
            logger.warning(f"OTP created for {user.email} but sending failed (see logs)")
    except Exception as e:
        # Extra safety: in case send_otp_email raises (shouldn't after change), catch it
        logger.exception(f"Unexpected error while sending OTP to {user.email}: {e}")
        sent = False

    return sent

def verify_otp_code(user: User, code: str) -> bool:
    try:
        otp_record = OTP.objects.filter(
            user=user, 
            code=code, 
            is_used=False,
            expires_at__gt=timezone.now()
        ).latest('created_at')
        
        otp_record.is_used = True
        otp_record.save()
        return True
    except OTP.DoesNotExist:
        return False
