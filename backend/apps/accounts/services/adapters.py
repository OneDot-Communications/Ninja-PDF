from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
import os

class CustomAccountAdapter(DefaultAccountAdapter):

    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=False)
        # Add any custom user saving logic here
        if commit:
            user.save()
        return user

    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        Constructs the email confirmation (verification) URL.
        The key is appended to the frontend verification route.
        """
        frontend_url = os.getenv('FRONTEND_HOST', 'http://127.0.0.1:3000')
        return f"{frontend_url}/auth/verify-email/{emailconfirmation.key}"

    def send_mail(self, template_prefix, email, context):
        """
        Override send_mail to prevent SMTP errors from crashing the auth flow.
        """
        try:
            super().send_mail(template_prefix, email, context)
        except Exception as e:
            # Log the error but continue the auth flow
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send email to {email}: {str(e)}")
            # In development/debug, we might want to print it
            if settings.DEBUG:
                print(f"ERROR: Email sending failed: {e}")

