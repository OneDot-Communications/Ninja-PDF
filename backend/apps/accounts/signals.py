from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from allauth.account.signals import password_changed
# Note: allauth emits 'password_changed'. Django also has a password_changed signal but allauth handles the flow.
# Let's import Django's signal just in case, or catch both? 
# Dj-rest-auth uses allauth's PasswordChangeView which uses allauth adapter which sends signal.
# Let's use allauth's signal.

User = get_user_model()

@receiver(password_changed)
def notify_password_change(sender, request, user, **kwargs):
    """
    Send email notification when password is changed.
    """
    try:
        send_mail(
            subject='Security Alert: Password Changed',
            message=f"Hello {user.email},\n\nYour password for 18+ PDF was successfully changed.\n\nIf you did not execute this change, please contact support immediately.\n\n18+ PDF Security Team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True
        )
    except Exception as e:
        print(f"Failed to send password change email: {e}")
