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
