import json
import logging
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from apps.subscriptions.models.subscription import Payment, Subscription, Plan
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
    api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)

    if not api_key:
        logger.error("Stripe Secret Key not set")
        return HttpResponse(status=500)

    stripe.api_key = api_key

    event = None

    try:
        if endpoint_secret:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        else:
            # Fallback for local testing without strict signature check if secret is missing
            # NOT RECOMMENDED for production
            event = json.loads(payload)
    except ValueError as e:
        # Invalid payload
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return HttpResponse(status=400)

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        handle_checkout_session(session)
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        # handle_invoice_payment(invoice) # Implement if subscription renewals via Stripe

    return HttpResponse(status=200)

def handle_checkout_session(session):
    session_id = session.get('id')
    amount_total = session.get('amount_total')
    currency = session.get('currency')
    customer_email = session.get('customer_details', {}).get('email')
    
    logger.info(f"Webhook: Checkout Session Completed: {session_id}")

    # 1. Update Payment Record
    try:
        payment = Payment.objects.get(razorpay_order_id=session_id)
        payment.status = 'SUCCESS'
        payment.razorpay_payment_id = session.get('payment_intent')
        payment.save()
        
        user = payment.user
    except Payment.DoesNotExist:
        logger.warning(f"Payment not found for session {session_id}. Searching by email.")
        try:
            User = get_user_model()
            user = User.objects.get(email=customer_email)
            # Create payment record? 
            # Ideally we rely on the one created in create_order, but if not found...
            return
        except Exception:
            logger.error(f"User not found for email {customer_email}")
            return

    # 2. Update Subscription & User Tier
    # (Logic shared with verify_payment view)
    
    sub, created = Subscription.objects.get_or_create(
        user=user,
        defaults={
            'current_period_end': timezone.now() + timedelta(days=30),
            'plan': payment.plan,
            'status': 'ACTIVE',
            'stripe_subscription_id': session.get('subscription')
        }
    )
    
    if not created:
        sub.plan = payment.plan
        sub.status = 'ACTIVE'
        sub.stripe_subscription_id = session.get('subscription')
        sub.current_period_end = timezone.now() + timedelta(days=30)
        sub.save()

    # Sync User Tier
    if payment.plan:
        plan_slug = payment.plan.slug.upper()
        if plan_slug in ['PRO', 'ENTERPRISE', 'PREMIUM']:
             user.subscription_tier = plan_slug
             user.save()

    logger.info(f"Webhook: Subscription processed for user {user.email}")
