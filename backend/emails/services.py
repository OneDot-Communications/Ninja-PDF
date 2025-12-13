import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp_code: str):
    """
    Sends an OTP verification email using the configured SMTP backend.
    """
    try:
        subject = "Verify Your Account - Ninja PDF"
        html_content = render_to_string('emails/otp_email.html', {
            'otp_code': otp_code,
            'username': to_email
        })
        text_content = strip_tags(html_content) # Fallback for plain text clients
        
        email = EmailMultiAlternatives(
            subject,
            text_content,
            settings.DEFAULT_FROM_EMAIL,
            [to_email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        logger.info(f"OTP sent successfully to {to_email}")
        return True
    except Exception as e:
        # Don't bubble SMTP issues out to the API layer; log and return failure
        logger.error(f"CRITICAL: Failed to send OTP to {to_email}: {str(e)}")
        return False
