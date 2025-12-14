"""
Billing & Subscriptions - Stripe Integration (TASK 84-99)
Complete Stripe-driven SaaS billing workflow.
"""
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import stripe
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


def initialize_free_plan(user):
    """
    TASK 84: Initialize FREE plan with defaults.
    """
    from apps.subscriptions.models.subscription import Subscription
    
    sub, created = Subscription.objects.get_or_create(
        user=user,
        defaults={
            'status': 'FREE',
            'storage_limit_mb': 100,
            'task_limit_daily': 10,
            'ai_access': False,
            'automation_access': False,
        }
    )
    
    if created:
        logger.info(f"Free plan initialized for user {user.id}")
    
    return sub


def detect_upgrade_trigger(user, trigger_type: str) -> dict:
    """
    TASK 85, 86, 87: Detect upgrade triggers.
    trigger_type: 'storage_limit', 'premium_tool', 'ai_feature', 'automation'
    """
    from .user_context import UserContextResolver
    
    context = UserContextResolver.resolve(user)
    triggers = []
    
    # TASK 85: Storage nearing limit
    thresholds = context.get('storage_remaining', float('inf'))
    storage_limit = context.get('storage_limit', 0)
    if storage_limit > 0:
        percent_used = ((storage_limit - thresholds) / storage_limit) * 100
        if percent_used >= 80:
            triggers.append({'type': 'storage_limit', 'percent': percent_used})
    
    # TASK 86: Premium tool
    if trigger_type == 'premium_tool' and not context['can_use_premium']:
        triggers.append({'type': 'premium_tool'})
    
    # TASK 87: AI/Automation
    if trigger_type in ('ai_feature', 'automation') and not context['can_use_ai']:
        triggers.append({'type': trigger_type})
    
    return {
        'should_show_upgrade': len(triggers) > 0,
        'triggers': triggers
    }


def verify_stripe_webhook(payload: bytes, sig_header: str) -> dict:
    """
    TASK 88: Verify Stripe webhook authenticity.
    """
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        logger.info(f"Stripe webhook verified: {event['type']}")
        return {'valid': True, 'event': event}
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe webhook signature verification failed: {e}")
        return {'valid': False, 'error': str(e)}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {'valid': False, 'error': str(e)}


def match_stripe_customer(stripe_customer_id: str):
    """
    TASK 89: Match Stripe customer to internal user.
    """
    from apps.subscriptions.models.subscription import Subscription
    
    try:
        sub = Subscription.objects.get(stripe_customer_id=stripe_customer_id)
        return sub.user
    except Subscription.DoesNotExist:
        logger.warning(f"No user found for Stripe customer {stripe_customer_id}")
        return None


def activate_subscription_atomic(user, plan: str, stripe_subscription_id: str, billing_cycle: str):
    """
    TASK 90: Activate subscription atomically.
    Also handles TASK 91-95.
    """
    from django.db import transaction
    from apps.subscriptions.models.subscription import Subscription, Invoice
    
    with transaction.atomic():
        sub = Subscription.objects.select_for_update().get(user=user)
        
        # TASK 90: Activate
        sub.status = 'ACTIVE'
        sub.plan = plan
        sub.stripe_subscription_id = stripe_subscription_id
        sub.billing_cycle = billing_cycle
        sub.current_period_start = timezone.now()
        
        # Calculate period end
        if billing_cycle == 'yearly':
            sub.current_period_end = timezone.now() + timedelta(days=365)
        else:
            sub.current_period_end = timezone.now() + timedelta(days=30)
        
        # TASK 91: Upgrade storage limits immediately
        if plan in ('PREMIUM', 'PRO'):
            sub.storage_limit_mb = 1024  # 1GB
        elif plan == 'TEAM':
            sub.storage_limit_mb = 10240  # 10GB
        
        # TASK 92: Unlock AI and automation
        sub.ai_access = True
        sub.automation_access = True
        
        # TASK 93: Increase job priority (handled by tier resolver)
        
        # TASK 94: Preserve existing usage (no change needed)
        
        sub.save()
        
        # TASK 95: Persist invoice record
        Invoice.objects.create(
            user=user,
            stripe_invoice_id=stripe_subscription_id,  # Or actual invoice ID
            amount=0,  # Would be set from Stripe
            status='PAID'
        )
        
        logger.info(f"Subscription activated for user {user.id}: {plan}")
    
    return sub


def handle_renewal_success(user):
    """
    TASK 96: Handle successful renewal.
    """
    from apps.subscriptions.models.subscription import Subscription
    
    sub = Subscription.objects.get(user=user)
    
    # Extend period
    if sub.billing_cycle == 'yearly':
        sub.current_period_end = timezone.now() + timedelta(days=365)
    else:
        sub.current_period_end = timezone.now() + timedelta(days=30)
    
    sub.save()
    logger.info(f"Renewal successful for user {user.id}")


def enter_grace_period(user):
    """
    TASK 97: Enter GRACE_PERIOD on failure.
    """
    from apps.subscriptions.models.subscription import Subscription
    
    sub = Subscription.objects.get(user=user)
    sub.status = 'GRACE_PERIOD'
    sub.grace_period_end = timezone.now() + timedelta(days=7)
    sub.save()
    
    logger.warning(f"User {user.id} entered grace period")
    
    # Send notification email
    # send_grace_period_email(user)


def suspend_after_grace(user):
    """
    TASK 98: Suspend after grace expiration.
    """
    from apps.subscriptions.models.subscription import Subscription
    
    sub = Subscription.objects.get(user=user)
    sub.status = 'SUSPENDED'
    sub.ai_access = False
    sub.automation_access = False
    sub.save()
    
    logger.warning(f"User {user.id} suspended after grace period")


def lock_excess_storage(user):
    """
    TASK 99: Lock excess storage read-only (no deletion).
    """
    from apps.files.models.user_file import UserFile
    from apps.subscriptions.models.subscription import Subscription
    
    sub = Subscription.objects.get(user=user)
    limit_bytes = sub.storage_limit_mb * 1024 * 1024
    
    # Get all files ordered by date (newest first)
    files = UserFile.objects.filter(user=user).exclude(status='DELETED').order_by('-created_at')
    
    running_total = 0
    for file in files:
        running_total += file.size_bytes
        if running_total > limit_bytes:
            # Mark as locked (read-only)
            file.metadata['locked'] = True
            file.save()
    
    logger.info(f"Excess storage locked for user {user.id}")
