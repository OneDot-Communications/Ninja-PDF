"""Trial Period Service - Handles trial subscription logic"""
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from apps.subscriptions.models import Subscription, Plan


class TrialService:
    """
    Service for managing subscription trial periods.
    Implements Tasks for trial period configuration and management.
    """
    
    DEFAULT_TRIAL_DAYS = 14
    
    @classmethod
    def start_trial(cls, user, plan: Plan, duration_days: int = None) -> Subscription:
        """
        Start a trial period for a user on a specific plan.
        
        Args:
            user: The user to start trial for
            plan: The plan to trial
            duration_days: Optional custom trial duration (defaults to plan setting or 14 days)
        
        Returns:
            The created/updated Subscription
        """
        if duration_days is None:
            # Check if plan has custom trial duration
            duration_days = getattr(plan, 'trial_days', cls.DEFAULT_TRIAL_DAYS)
        
        now = timezone.now()
        trial_end = now + timedelta(days=duration_days)
        
        # Get or create subscription
        subscription, created = Subscription.objects.get_or_create(
            user=user,
            defaults={
                'plan': plan,
                'status': Subscription.Status.TRIAL,
                'is_trial': True,
                'trial_started_at': now,
                'trial_ends_at': trial_end,
                'current_period_end': trial_end,
            }
        )
        
        if not created:
            # Update existing subscription
            if subscription.status not in [Subscription.Status.ACTIVE, Subscription.Status.TRIAL]:
                subscription.plan = plan
                subscription.status = Subscription.Status.TRIAL
                subscription.is_trial = True
                subscription.trial_started_at = now
                subscription.trial_ends_at = trial_end
                subscription.current_period_end = trial_end
                subscription.save()
            else:
                raise ValueError("User already has an active subscription or is in a trial")
        
        # Update user tier to reflect trial plan access
        tier_map = {
            'pro': 'PRO',
            'premium': 'PREMIUM',
            'enterprise': 'ENTERPRISE',
        }
        plan_slug_lower = plan.slug.lower()
        if plan_slug_lower in tier_map:
            user.subscription_tier = tier_map[plan_slug_lower]
            user.save(update_fields=['subscription_tier'])
        
        # Send trial started email
        cls._send_trial_started_email(user, plan, duration_days)
        
        return subscription
    
    @classmethod
    def check_trial_status(cls, subscription: Subscription) -> dict:
        """
        Check the current status of a trial.
        
        Returns:
            dict with trial info: is_active, days_remaining, ends_at, is_expired
        """
        if not subscription.is_trial:
            return {
                'is_active': False,
                'days_remaining': 0,
                'ends_at': None,
                'is_expired': False,
            }
        
        now = timezone.now()
        is_expired = subscription.trial_ends_at and now > subscription.trial_ends_at
        days_remaining = 0
        
        if subscription.trial_ends_at and not is_expired:
            delta = subscription.trial_ends_at - now
            days_remaining = max(0, delta.days)
        
        return {
            'is_active': subscription.status == Subscription.Status.TRIAL and not is_expired,
            'days_remaining': days_remaining,
            'ends_at': subscription.trial_ends_at,
            'is_expired': is_expired,
        }
    
    @classmethod
    def convert_trial_to_paid(cls, subscription: Subscription, payment_id: str = None) -> Subscription:
        """
        Convert a trial subscription to a paid subscription.
        
        Args:
            subscription: The trial subscription to convert
            payment_id: Optional payment ID to associate
        
        Returns:
            The updated subscription
        """
        if not subscription.is_trial:
            raise ValueError("Subscription is not a trial")
        
        now = timezone.now()
        
        # Calculate new period based on plan interval
        if subscription.plan and subscription.plan.interval == 'YEARLY':
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)
        
        subscription.status = Subscription.Status.ACTIVE
        subscription.is_trial = False
        subscription.trial_converted = True
        subscription.current_period_start = now
        subscription.current_period_end = period_end
        
        if payment_id:
            subscription.stripe_subscription_id = payment_id
        
        subscription.save()
        
        # Send conversion confirmation email
        cls._send_trial_converted_email(subscription.user, subscription.plan)
        
        return subscription
    
    @classmethod
    def expire_trial(cls, subscription: Subscription) -> Subscription:
        """
        Expire a trial subscription (called by scheduled task or when trial ends).
        
        Returns:
            The updated subscription
        """
        if not subscription.is_trial:
            return subscription
        
        subscription.status = Subscription.Status.FREE
        subscription.is_trial = False
        subscription.plan = None
        subscription.save()
        
        # Reset user tier to FREE
        subscription.user.subscription_tier = 'FREE'
        subscription.user.save(update_fields=['subscription_tier'])
        
        # Send trial expired email
        cls._send_trial_expired_email(subscription.user)
        
        return subscription
    
    @classmethod
    def extend_trial(cls, subscription: Subscription, additional_days: int) -> Subscription:
        """
        Extend a trial period by additional days.
        
        Args:
            subscription: The trial subscription
            additional_days: Number of days to add
        
        Returns:
            The updated subscription
        """
        if not subscription.is_trial:
            raise ValueError("Subscription is not a trial")
        
        if subscription.trial_ends_at:
            subscription.trial_ends_at += timedelta(days=additional_days)
            subscription.current_period_end = subscription.trial_ends_at
            subscription.save(update_fields=['trial_ends_at', 'current_period_end'])
        
        return subscription
    
    @classmethod
    def get_expiring_trials(cls, days_ahead: int = 3):
        """
        Get trials that are expiring within the next N days.
        
        Args:
            days_ahead: Number of days to look ahead
        
        Returns:
            QuerySet of subscriptions
        """
        now = timezone.now()
        cutoff = now + timedelta(days=days_ahead)
        
        return Subscription.objects.filter(
            is_trial=True,
            status=Subscription.Status.TRIAL,
            trial_ends_at__gte=now,
            trial_ends_at__lte=cutoff,
        ).select_related('user', 'plan')
    
    @classmethod
    def get_expired_trials(cls):
        """
        Get trials that have expired but not yet processed.
        
        Returns:
            QuerySet of subscriptions
        """
        now = timezone.now()
        
        return Subscription.objects.filter(
            is_trial=True,
            status=Subscription.Status.TRIAL,
            trial_ends_at__lt=now,
        ).select_related('user', 'plan')
    
    # Email helpers
    @classmethod
    def _send_trial_started_email(cls, user, plan, duration_days):
        """Send email when trial starts"""
        try:
            from django.core.mail import send_mail
            
            send_mail(
                subject=f'Your {duration_days}-Day Free Trial Has Started!',
                message=f"""Hello {user.first_name or user.email},

Welcome to your free trial of {plan.name}!

You now have access to all premium features for the next {duration_days} days. Here's what you can do:

✓ Unlimited PDF processing
✓ OCR text extraction
✓ Batch processing
✓ Priority processing queue
✓ No watermarks

Your trial ends on: {(timezone.now() + timedelta(days=duration_days)).strftime('%B %d, %Y')}

Enjoy exploring all the features!

— The NinjaPDF Team
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
    
    @classmethod
    def _send_trial_converted_email(cls, user, plan):
        """Send email when trial converts to paid"""
        try:
            from django.core.mail import send_mail
            
            send_mail(
                subject=f'Welcome to {plan.name} - Subscription Activated!',
                message=f"""Hello {user.first_name or user.email},

Thank you for subscribing to {plan.name}!

Your subscription is now active and you have full access to all premium features.

Thank you for choosing NinjaPDF!

— The NinjaPDF Team
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
    
    @classmethod
    def _send_trial_expired_email(cls, user):
        """Send email when trial expires"""
        try:
            from django.core.mail import send_mail
            
            send_mail(
                subject='Your Trial Has Ended',
                message=f"""Hello {user.first_name or user.email},

Your free trial has ended. You've been moved to our Free plan.

Don't worry! You can still use NinjaPDF with our free tier features. If you'd like to unlock premium features again, you can upgrade anytime.

We hope you enjoyed the trial!

— The NinjaPDF Team
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
    
    @classmethod
    def send_trial_expiring_reminder(cls, subscription: Subscription, days_remaining: int):
        """Send reminder email when trial is about to expire"""
        try:
            from django.core.mail import send_mail
            
            user = subscription.user
            plan = subscription.plan
            
            send_mail(
                subject=f'Your Trial Ends in {days_remaining} Day{"s" if days_remaining != 1 else ""}!',
                message=f"""Hello {user.first_name or user.email},

Your free trial of {plan.name if plan else "Premium"} ends in {days_remaining} day{"s" if days_remaining != 1 else ""}.

To keep access to premium features, please upgrade your subscription before your trial ends.

Upgrade now to continue enjoying:
✓ Unlimited PDF processing
✓ OCR and advanced tools
✓ No watermarks
✓ Priority support

— The NinjaPDF Team
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
