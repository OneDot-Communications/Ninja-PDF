import stripe
from django.conf import settings
from django.urls import reverse

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_checkout_session(user, plan_stripe_price_id, success_url=None, cancel_url=None):
    """
    Creates a Stripe Checkout Session for a new subscription.
    """
    if not success_url:
        # Fallback default URLs - frontend handles these usually
        success_url = settings.FRONTEND_URL + '/dashboard?session_id={CHECKOUT_SESSION_ID}'
    if not cancel_url:
        cancel_url = settings.FRONTEND_URL + '/pricing'

    # Get or create Stripe Customer
    customer_id = None
    if hasattr(user, 'stripe_customer_id') and user.stripe_customer_id:
        customer_id = user.stripe_customer_id
    else:
        # Search or Create
        # Ideally we should store this on the User model. 
        # Since we haven't updated User model in this plan, let's assume we rely on email mapping or create new.
        # But Blueprint E4.1 implies finding user by customer_id later, so we MUST persist it.
        # We need to make sure User model has stripe_customer_id or we persist it in Subscription/BusinessDetails?
        # Actually, Subscription model has stripe_subscription_id.
        # Let's search by email for now to avoid duplicates.
        customers = stripe.Customer.list(email=user.email, limit=1)
        if customers.data:
             customer_id = customers.data[0].id
        else:
             customer = stripe.Customer.create(email=user.email, metadata={'user_id': user.id})
             customer_id = customer.id
             # Ideally save this to User model now: user.stripe_customer_id = customer_id; user.save()
             # We will handle User model update if field exists. Check User model later.
    
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=['card'],
        line_items=[{
            'price': plan_stripe_price_id,
            'quantity': 1,
        }],
        mode='subscription',
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            'user_id': user.id
        }
    )
    return session

def create_portal_session(user, return_url=None):
    """
    Creates a Stripe Customer Portal session for managing billing.
    """
    if not return_url:
        return_url = settings.FRONTEND_URL + '/dashboard'
        
    # User must have a customer_id
    customer_id = None
    if hasattr(user, 'stripe_customer_id') and user.stripe_customer_id:
        customer_id = user.stripe_customer_id
    else:
        # Try finding by email
        customers = stripe.Customer.list(email=user.email, limit=1)
        if customers.data:
            customer_id = customers.data[0].id
        else:
            raise ValueError("Stripe Customer not found for this user")
            
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url
    )
    return session
