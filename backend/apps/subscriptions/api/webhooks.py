import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Subscription, Plan, Invoice, Payment
from apps.accounts.api.models import User
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.headers.get('Stripe-Signature')
    event = None
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return HttpResponse(status=400)
    
    # Handle events
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        handle_checkout_session(session)
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        handle_invoice_payment_succeeded(invoice)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_deleted(subscription)
        
    return HttpResponse(status=200)

def handle_checkout_session(session):
    client_reference_id = session.get('client_reference_id') 
    # Or check metadata
    user_id = session.get('metadata', {}).get('user_id')
    stripe_customer_id = session.get('customer')
    stripe_subscription_id = session.get('subscription')
    
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            
            # Update user's stripe customer id if missing
            if stripe_customer_id and not getattr(user, 'stripe_customer_id', None):
                # We assume User model handles this field or we rely on logic (it is missing in User model currently)
                # But we can try to save it if the field exists, or log it
                pass
            
            # Create/Update Subscription
            sub, created = Subscription.objects.get_or_create(user=user)
            sub.stripe_subscription_id = stripe_subscription_id
            sub.status = 'ACTIVE'
            
            # Determine Plan? 
            # We need to map Price ID to Plan.
            # Ideally we pass plan_id in metadata or look up by logic.
            # For now, let's assume default or lookup via Stripe API if needed.
            # Simplified: Just mark active. Real impl needs Plan lookup.
            
            sub.save()
            
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found for checkout session")

def handle_invoice_payment_succeeded(invoice):
    stripe_subscription_id = invoice.get('subscription')
    stripe_customer_id = invoice.get('customer')
    
    try:
        # Find subscription by stripe_id
        sub = Subscription.objects.filter(stripe_subscription_id=stripe_subscription_id).first()
        if not sub:
            # Fallback: Find by user via customer?
            # Requires User mapping.
            pass
            
        if sub:
            # Extend validity
            # If monthly, add month.
            # Ideally check invoice period_end
            period_end = invoice.get('lines', {}).get('data', [{}])[0].get('period', {}).get('end')
            if period_end:
                from datetime import datetime
                sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
            else:
                 sub.status = 'ACTIVE' # Just ensure active
            sub.save()
            
            # Create local Invoice record
            Invoice.objects.create(
                user=sub.user,
                number=invoice.get('number'),
                amount_due=invoice.get('amount_due') / 100.0,
                amount_paid=invoice.get('amount_paid') / 100.0,
                currency=invoice.get('currency'),
                status='PAID',
                pdf_file=None, # or store link
                hosted_invoice_url=invoice.get('hosted_invoice_url')
            )
            
    except Exception as e:
        logger.error(f"Error handling invoice payment: {e}")

def handle_subscription_deleted(subscription):
    stripe_subscription_id = subscription.get('id')
    try:
        sub = Subscription.objects.get(stripe_subscription_id=stripe_subscription_id)
        sub.status = 'CANCELED'
        sub.save()
        # Trigger Downgrade logic (Task E5.1)
    except Subscription.DoesNotExist:
        pass
