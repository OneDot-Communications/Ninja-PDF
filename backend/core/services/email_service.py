from django.conf import settings
from django.core.mail import send_mail
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """
    Centralized service for sending emails with a "Best Friend" tone.
    """
    
    @staticmethod
    def _send(to_email, subject, message):
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=True
            )
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

    @staticmethod
    def send_verification_email(user, verification_url):
        """Send email verification link to new user."""
        subject = "Verify your email for 18+ PDF"
        message = f"""
Hey {user.first_name or 'there'}!

Welcome to 18+ PDF! 🎉

Just one quick step to get started - please verify your email by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't sign up for 18+ PDF, you can safely ignore this email.

Cheers,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    # 🚀 GROWTH & ONBOARDING
    
    @staticmethod
    def send_welcome_drip_day3(user):
        subject = "Hey! 3 PDF hacks I wish I knew sooner 🤯"
        message = f"""
Hey {user.first_name or 'Friend'},

It’s been a few days since you joined, and I wanted to check in!

I noticed a lot of people miss these 3 cool things you can do with 18+ PDF:
1. Merge unlimited files (seriously, go wild).
2. Sign docs from your phone (lifesaver when you're out).
3. Encryption? Yeah, we got that. Keep your secrets safe. 🔒

Go try one today! 

Catch you later,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_first_action_celebration(user, action_name):
        subject = f"You did it! First {action_name} complete! 🎉"
        message = f"""
Yessss! {user.first_name or 'Buddy'},

I just saw you completed your first {action_name}. That was smooth, right?

Now that you're a pro, why not try signing a document or organizing some messy pages?

Keep crushing it!
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_incomplete_profile_nudge(user):
        subject = "Knock knock! Your profile is feeling lonely 👻"
        message = f"""
Hey {user.first_name or 'there'},

Your invoices are looking a bit blank. If you add your company details, we can make them look super professional for you.

Takes like 10 seconds. Do it here: {settings.FRONTEND_HOST}/settings/profile

Cheers,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)
    
    @staticmethod
    def send_referral_reminder(user, invites_left):
        subject = f"You've got {invites_left} golden tickets left! 🎫"
        message = f"""
Hey {user.first_name or 'Friend'},

You still have {invites_left} invites to share! 
Remember, every friend who joins gets you closer to Premium perks.

Don't let them go to waste! Share the love.

Best,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    # ✍️ SIGNATURES
    
    @staticmethod
    def send_document_viewed(sender, document_name, recipient_email):
        subject = f"Guess who just opened '{document_name}'? 👀"
        message = f"""
Hey {sender.first_name or 'there'},

Just a heads up: {recipient_email} just opened your document '{document_name}'.

Hopefully, a signature is coming right up! I'll let you know when it's done.

Fingers crossed,
The 18+ PDF Team
"""
        EmailService._send(sender.email, subject, message)

    @staticmethod
    def send_signature_expiration_warning(recipient_email, document_name, hours_left=24):
        subject = f"Tick tock... '{document_name}' is vanishing soon! ⏳"
        message = f"""
Hey!

Just a friendly nudge. You have {hours_left} hours left to sign '{document_name}'.
After that, the link expires and it gets awkward asking for a new one. 😅

Sign it here fast: {settings.FRONTEND_HOST}/signatures/inbox

Go go go!
The 18+ PDF Team
"""
        EmailService._send(recipient_email, subject, message)

    @staticmethod
    def send_request_expired_notice(sender, document_name, recipient_email):
        subject = f"Uhh oh. '{document_name}' expired 🐢"
        message = f"""
Hey {sender.first_name or 'there'},

Bad news. The request for '{document_name}' sent to {recipient_email} has expired. 
They didn't sign it in time.

You can create a new request if you still need it signed.

Better luck next time!
The 18+ PDF Team
"""
        EmailService._send(sender.email, subject, message)

    # 💳 BILLING
    
    @staticmethod
    def send_payment_failed(user):
        subject = "Oops! We couldn't process your payment 💳"
        message = f"""
Hey {user.first_name or 'Friend'},

We tried to renew your subscription but the card said "No". 😬
It happens! Maybe it expired or needs a quick update.

Please check it here so you don't lose access to your files: {settings.FRONTEND_HOST}/settings/billing

Thanks!
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_card_expiring_soon(user, last4):
        subject = "Your card is taking a nap soon 😴"
        message = f"""
Hey {user.first_name or 'there'},

Just a heads up—your card ending in {last4} is expiring next month.
Update it now so you don't get interrupted in the middle of something important later!

Update here: {settings.FRONTEND_HOST}/settings/billing

Cheers,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)
        
    @staticmethod
    def send_trial_ending_warning(user, hours_left=48):
        subject = f"Heads up! {hours_left} hours left on your trial ⏰"
        message = f"""
Hey {user.first_name or 'there'},

Hope you're loving the Pro life! 
Your trial ends in {hours_left} hours. 

If you want to keep the superpowers (Unlimited merges, encryption, 100GB storage), you don't need to do anything.
If you want to cancel, you can do it from your dashboard.

Hope you stay!
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    # 👥 TEAMS & ROLES
    
    @staticmethod
    def send_role_updated(user, team_name, new_role):
        subject = f"Movin' on up! You're now a {new_role} 🌟"
        message = f"""
Congrats {user.first_name or 'Friend'}!

You've been promoted to {new_role} in the team '{team_name}'.
With great power comes... well, mostly just more buttons to click. 😉

Enjoy!
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)
    
    @staticmethod
    def send_removed_from_team(user, team_name):
        subject = f"Update regarding team '{team_name}'"
        message = f"""
Hey {user.first_name or 'there'},

Just letting you know you no longer have access to the team '{team_name}'.
If you think this was a mistake, give the admin a shout!

You still have your personal workspace, of course.

Best,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    # 📊 USAGE
    
    @staticmethod
    def send_limit_reached(user, feature_name):
        subject = "Whoa! You're on fire! 🔥 (Limit Reached)"
        message = f"""
Hey {user.first_name or 'Friend'},

You're working hard! You just hit your limit for {feature_name} on the free plan.
That's awesome usage. 

If you need more (like, unlimited more), check out our Pro plan. It's cheaper than a coffee. ☕

Upgrade here: {settings.FRONTEND_HOST}/pricing

Cheers,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)
    
    @staticmethod
    def send_data_export_ready(user, download_link):
        subject = "Your data delivery is here! 📦"
        message = f"""
Hey {user.first_name or 'there'},

Your file archive is ready. Hot off the press!
Download it here: {download_link}

Link expires in 24 hours for security.

Stay safe,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_renewal_upcoming(user, plan_name, days_left=3):
        subject = f"Your {plan_name} renewal is coming up! 📅"
        message = f"""
Hey {user.first_name or 'Friend'},

Just a quick heads up that your annual subscription for {plan_name} renews in {days_left} days.
We love having you around!

If you're happy, you don't need to do a thing.
If you need to make changes, hop over to your dashboard.

Cheers,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_refund_processed(user, amount, currency):
        subject = "Refund on its way! 💸"
        message = f"""
Hey {user.first_name or 'there'},

We've processed a refund of {currency} {amount} to your original payment method.
It might take 5-10 days to show up in your bank (banks are slow, we know 🐢).

Holler if you don't see it by then!

Best,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_team_weekly_summary(user, team_name, signed_count):
        subject = f"Weekly Recap: {team_name} is crushing it! 📈"
        message = f"""
Hey {user.first_name or 'there'},

Here's what your team '{team_name}' got done this week:
- {signed_count} documents signed. ✍️

Not bad! Keep the momentum going.

High five,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_usage_alert_80(user, feature_name):
        subject = f"You're at 80% usage for {feature_name} ⚠️"
        message = f"""
Hey {user.first_name or 'Friend'},

You are using 18+ PDF like a pro! 
You've used 80% of your free limit for {feature_name}.

Just letting you know so you don't get stuck in the middle of a workflow later.
Upgrade now to remove the limit entirely!

Upgrade: {settings.FRONTEND_HOST}/pricing

Cheers,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)

    @staticmethod
    def send_premium_feature_attempt(user, feature_name):
        subject = f"That {feature_name} feature is shiny, isn't it? ✨"
        message = f"""
Hey {user.first_name or 'there'},

I saw you trying to use {feature_name}. It's a Premium feature, but I can see why you want it!
It makes life so much easier.

Here is a little secret: Use code 'FRIEND10' for 10% off your first month. 🤫
Unlock it here: {settings.FRONTEND_HOST}/pricing

Best,
The 18+ PDF Team
"""
        EmailService._send(user.email, subject, message)
