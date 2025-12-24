from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
import os


class CustomAccountAdapter(DefaultAccountAdapter):

    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=False)
        if commit:
            user.save()
        return user

    def send_confirmation_mail(self, request, emailconfirmation, signup):
        """
        Override to use our custom EmailVerificationToken instead of allauth's.
        """
        from apps.accounts.models import EmailVerificationToken
        from core.services.email_service import EmailService
        
        # Create our custom token
        token = EmailVerificationToken.create_for_user(emailconfirmation.email_address.user)
        
        # Build verification URL
        frontend_url = os.getenv('FRONTEND_HOST', 'http://127.0.0.1:3000')
        verification_url = f"{frontend_url}/auth/verify-email/{token.token}"
        
        # Send email
        EmailService.send_verification_email(
            emailconfirmation.email_address.user,
            verification_url
        )

    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        Fallback URL generation (may not be called if send_confirmation_mail is overridden).
        """
        from apps.accounts.models import EmailVerificationToken
        token = EmailVerificationToken.create_for_user(emailconfirmation.email_address.user)
        frontend_url = os.getenv('FRONTEND_HOST', 'http://127.0.0.1:3000')
        return f"{frontend_url}/auth/verify-email/{token.token}"

    def send_mail(self, template_prefix, email, context):
        """
        Override send_mail to prevent SMTP errors from crashing the auth flow.
        """
        try:
            super().send_mail(template_prefix, email, context)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send email to {email}: {str(e)}")
            if settings.DEBUG:
                print(f"ERROR: Email sending failed: {e}")
