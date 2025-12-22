"""Subscriptions API Views"""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.subscriptions.models.subscription import Plan, Subscription, Invoice, BusinessDetails, Feature, UserFeatureOverride, Payment, Referral
from apps.subscriptions.api.serializers import (
    PlanSerializer, SubscriptionSerializer, InvoiceSerializer, 
    BusinessDetailsSerializer, FeatureSerializer, UserFeatureOverrideSerializer,
    PaymentSerializer, ReferralSerializer
)
from core.views import IsAdminOrSuperAdmin, IsSuperAdmin


from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=['get'])
    def role_permissions(self, request):
        # Return empty list or mocked permissions logic
        # For now, just return empty so the page loads
        return Response([])


class UserFeatureOverrideViewSet(viewsets.ModelViewSet):
    queryset = UserFeatureOverride.objects.all()
    serializer_class = UserFeatureOverrideSerializer
    permission_classes = [IsSuperAdmin]


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['ADMIN', 'SUPER_ADMIN']:
            return Subscription.objects.all()
        return Subscription.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        # Capture status before save
        instance = self.get_object()
        old_status = instance.status
        
        updated_instance = serializer.save()
        
        # Check for Cancellation
        if old_status != 'CANCELED' and updated_instance.status == 'CANCELED':
            from django.core.mail import send_mail
            from django.conf import settings
            
            try:
                send_mail(
                    subject='Subscription Cancelled - 18+ PDF',
                    message=f"Hello {updated_instance.user.email},\n\nYour subscription to the {updated_instance.plan.name} plan has been cancelled as requested.\n\nYou will continue to have access until the end of your billing period: {updated_instance.current_period_end}.\n\nWe are sorry to see you go!\n\n18+ PDF Team",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[updated_instance.user.email],
                    fail_silently=True
                )
            except Exception as e:
                print(f"Failed to send cancellation email: {e}")


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['ADMIN', 'SUPER_ADMIN']:
            return Invoice.objects.all()
        return Invoice.objects.filter(user=self.request.user)


class BusinessDetailsViewSet(viewsets.ModelViewSet):
    queryset = BusinessDetails.objects.all()
    serializer_class = BusinessDetailsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusinessDetails.objects.filter(user=self.request.user)

    @action(detail=False, methods=['put'], url_path='')
    def update_singleton(self, request):
        """Handle PUT on base URL to update user's business details (Singleton pattern)"""
        obj, created = BusinessDetails.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ReferralViewSet(viewsets.ModelViewSet):
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Referral.objects.filter(referrer=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            'total_invites': qs.count(),
            'successful_signups': qs.filter(status='COMPLETED').count(),
            'rewards_earned': qs.filter(reward_granted=True).count()
        })


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['SUPER_ADMIN', 'ADMIN']:
            return Payment.objects.all().order_by('-created_at')
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        from apps.subscriptions.services import razorpay_utils, stripe_utils
        
        plan_slug = request.data.get('plan_slug')
        provider = request.data.get('provider', 'razorpay')
        
        try:
            plan = Plan.objects.get(slug=plan_slug)
        except Plan.DoesNotExist:
            return Response({'error': 'Plan not found'}, status=404)

        if provider == 'stripe':
            # Create Stripe Checkout Session
            if not plan.stripe_price_id:
                return Response({'error': 'Plan invalid for Stripe'}, status=400)
                
            session = stripe_utils.create_checkout_session(request.user, plan.stripe_price_id)
            
            # Create generic payment record (using razorpay_order_id as generic ID)
            Payment.objects.create(
                user=request.user,
                plan=plan,
                razorpay_order_id=session.id, # Storing Session ID as Order ID
                amount=plan.price,
                currency=plan.currency,
                status='CREATED'
                # razorpay_payment_id and signature left blank
            )
            
            return Response({'provider': 'stripe', 'sessionId': session.id, 'url': session.url})
            
        else:
            # Default to Razorpay
            order = razorpay_utils.create_order(float(plan.price), plan.currency)
            
            # Create generic payment record
            Payment.objects.create(
                user=request.user,
                plan=plan,
                razorpay_order_id=order['id'],
                amount=plan.price,
                currency=plan.currency,
                status='CREATED'
            )
            
            return Response(order)

    @action(detail=False, methods=['post'])
    def verify_payment(self, request):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Verify Payment Request: {request.data}")
        
        from apps.subscriptions.services import razorpay_utils
        
        # Razorpay Verification
        if 'razorpay_payment_id' in request.data:
            payment_id = request.data.get('razorpay_payment_id')
            order_id = request.data.get('razorpay_order_id')
            signature = request.data.get('razorpay_signature')
            
            logger.info(f"Verifying Razorpay Order: {order_id}")
            
            params_dict = {
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            }
            
            if razorpay_utils.verify_payment_signature(params_dict):
                try:
                    payment = Payment.objects.get(razorpay_order_id=order_id)
                    logger.info(f"Payment Record Found: {payment}")
                    
                    payment.status = 'SUCCESS'
                    payment.razorpay_payment_id = payment_id
                    payment.razorpay_signature = signature
                    payment.save()
                    payment.save()
                    
                    # Activate Subscription
                    # Fix: Provide default for current_period_end to avoid IntegrityError on create
                    from django.utils import timezone
                    from datetime import timedelta
                    
                    sub, created = Subscription.objects.get_or_create(
                        user=request.user,
                        defaults={
                            'current_period_end': timezone.now() + timedelta(days=30),
                            'plan': payment.plan,
                            'status': 'ACTIVE',
                            'stripe_subscription_id': f"rzp_{payment_id}"
                        }
                    )
                    
                    if not created:
                        # If already exists, update it
                        sub.plan = payment.plan
                        sub.status = 'ACTIVE'
                        sub.stripe_subscription_id = f"rzp_{payment_id}" 
                        sub.current_period_end = timezone.now() + timedelta(days=30)
                        sub.save()
                    
                    # Sync User Subscription Tier
                    # Map plan slug to Tier enum (simple uppercase match for now)
                    plan_slug = payment.plan.slug.upper()
                    if plan_slug in ['PRO', 'ENTERPRISE', 'PREMIUM']:
                         request.user.subscription_tier = plan_slug
                         request.user.save()
                    
                    logger.info(f"Subscription Updated for user {request.user.email}")
                    
                    # Transaction Email Receipt
                    try:
                        from django.core.mail import send_mail
                        from django.conf import settings
                        
                        subject = f"Payment Receipt - {payment.plan.name}"
                        message = f"Hello {request.user.email},\n\nWe have received your payment of {payment.currency} {payment.amount} for {payment.plan.name}.\n\nOrder ID: {payment.razorpay_order_id}\nTransaction ID: {payment.razorpay_payment_id}\n\nThank you for subscribing to 18+ PDF!\n\nYou can download your invoice from your dashboard."
                        
                        send_mail(
                            subject=subject,
                            message=message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[request.user.email],
                            fail_silently=True
                        )
                    except Exception as e:
                        logger.error(f"Failed to send receipt email: {e}")

                    return Response({'status': 'success'})
                except Payment.DoesNotExist:
                     logger.error(f"Payment record not found for order {order_id}")
                     return Response({'error': 'Order not found'}, status=404)
                return Response({'error': 'Invalid Signature'}, status=400)
                
            else:
                # Capture Failure Case (Signature valid but Failed status, or just general invalid)
                # Actually verify_payment_signature returns False if fails.
                
                # To capture explicit "Failed" payment we need webhook or response from FE saying it failed?
                # Usually FE redirects to failure.
                # But if we rely on backend verification failure, we can alert user.
                logger.error("Signature Verification Failed or Payment Failed")
                
                # Try to find user from request
                if request.user.is_authenticated:
                    from core.services.email_service import EmailService
                    EmailService.send_payment_failed(request.user)
                
                return Response({'error': 'Invalid Signature'}, status=400)
                
        # Stripe Verification (Manual or Webhook fallback)
        elif 'session_id' in request.data:
            import stripe
            session_id = request.data.get('session_id')
            logger.info(f"Verifying Stripe Session: {session_id}")
            
            try:
                # Retrive Session from Stripe
                session = stripe.checkout.Session.retrieve(session_id)
                if session.payment_status == 'paid':
                    # Find or Create Payment Record
                    try:
                        payment = Payment.objects.get(razorpay_order_id=session_id)
                    except Payment.DoesNotExist:
                        logger.error(f"Payment record not found for session {session_id}")
                        return Response({'error': 'Payment record not found'}, status=404)
                    
                    payment.status = 'SUCCESS'
                    payment.razorpay_payment_id = session.payment_intent # Store Intent ID
                    payment.save()
                    payment.save()
                    
                    # Activate Subscription
                    from django.utils import timezone
                    from datetime import timedelta
                    
                    sub, created = Subscription.objects.get_or_create(
                        user=request.user,
                        defaults={
                            'current_period_end': timezone.now() + timedelta(days=30),
                            'plan': payment.plan,
                            'status': 'ACTIVE',
                            'stripe_subscription_id': session.subscription
                        }
                    )
                    
                    if not created:
                        sub.plan = payment.plan
                        sub.status = 'ACTIVE'
                        sub.stripe_subscription_id = session.subscription
                        sub.current_period_end = timezone.now() + timedelta(days=30)
                        sub.save()
                    
                    # Sync User Subscription Tier
                    plan_slug = payment.plan.slug.upper()
                    if plan_slug in ['PRO', 'ENTERPRISE', 'PREMIUM']:
                         request.user.subscription_tier = plan_slug
                         request.user.save()
                    
                    logger.info(f"Stripe Subscription Updated for user {request.user.email}")
                    return Response({'status': 'success'})
                else:
                     logger.error(f"Stripe Session not paid: {session.payment_status}")
                     return Response({'error': 'Payment not paid'}, status=400)
            except Exception as e:
                logger.error(f"Stripe Verification Error: {str(e)}")
                return Response({'error': str(e)}, status=400)
            

        return Response({'error': 'Invalid data'}, status=400)

    # ─────────────────────────────────────────────────────────────────────────
    # TASK 53: Retry Failed Payments
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def retry(self, request, pk=None):
        """Retry a failed payment by creating a new order."""
        try:
            payment = self.get_object()
        except Exception:
            return Response({'error': 'Payment not found'}, status=404)
        
        if payment.status != 'FAILED':
            return Response({'error': 'Can only retry failed payments'}, status=400)
        
        # Create a new order for the same plan
        try:
            import razorpay
            from django.conf import settings
            
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order = client.order.create({
                'amount': int(payment.amount * 100),
                'currency': payment.currency,
                'notes': {'retry_of': str(payment.id)}
            })
            
            # Create new payment record
            new_payment = Payment.objects.create(
                user=payment.user,
                plan=payment.plan,
                amount=payment.amount,
                currency=payment.currency,
                status='PENDING',
                razorpay_order_id=order['id']
            )
            
            return Response({
                'status': 'retry_initiated',
                'new_payment_id': new_payment.id,
                'razorpay_order_id': order['id'],
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    # ─────────────────────────────────────────────────────────────────────────
    # TASKS 54-55: Issue Refunds (Partial & Full)
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def refund(self, request, pk=None):
        """Issue a full or partial refund for a payment."""
        try:
            payment = self.get_object()
        except Exception:
            return Response({'error': 'Payment not found'}, status=404)
        
        if payment.status != 'SUCCESS':
            return Response({'error': 'Can only refund successful payments'}, status=400)
        
        refund_amount = request.data.get('amount')
        is_full_refund = refund_amount is None or float(refund_amount) >= float(payment.amount)
        
        try:
            import razorpay
            from django.conf import settings
            
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            refund_data = {'payment_id': payment.razorpay_payment_id}
            if not is_full_refund:
                refund_data['amount'] = int(float(refund_amount) * 100)
            
            refund = client.payment.refund(payment.razorpay_payment_id, refund_data)
            
            # Update payment status
            payment.status = 'REFUNDED'
            payment.save()
            
            # If full refund, cancel subscription
            if is_full_refund:
                Subscription.objects.filter(user=payment.user, status='ACTIVE').update(status='CANCELED')
            
            # Send notification email
            from django.core.mail import send_mail
            send_mail(
                subject='Refund Processed - 18+ PDF',
                message=f"Hello,\n\nYour refund of {payment.currency} {refund_amount or payment.amount} has been processed.\n\nRefund ID: {refund.get('id')}\n\nThank you,\n18+ PDF Team",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[payment.user.email],
                fail_silently=True
            )
            
            return Response({
                'status': 'refunded',
                'refund_id': refund.get('id'),
                'amount': refund_amount or str(payment.amount),
                'is_full_refund': is_full_refund,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Generate and download PDF receipt"""
        try:
            payment = self.get_object()
        except Exception:
            return Response({'error': 'Payment not found'}, status=404)

        if payment.status != 'SUCCESS':
            return Response({'error': 'Receipt available only for successful payments'}, status=400)

        # Generate PDF
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from io import BytesIO
        from django.http import FileResponse

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Header
        p.setFont("Helvetica-Bold", 24)
        p.drawString(50, height - 50, "18+ PDF")
        
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 70, "Payment Receipt")
        
        p.line(50, height - 80, width - 50, height - 80)

        # Details
        y = height - 120
        p.drawString(50, y, f"Date: {payment.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        y -= 20
        p.drawString(50, y, f"Order ID: {payment.razorpay_order_id}")
        y -= 20
        p.drawString(50, y, f"Transaction ID: {payment.razorpay_payment_id or 'N/A'}")
        y -= 20
        p.drawString(50, y, f"Customer: {payment.user.email}")
        
        y -= 40
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "Items")
        y -= 20
        p.setFont("Helvetica", 12)
        p.drawString(50, y, f"Plan: {payment.plan.name if payment.plan else 'Subscription'}")
        p.drawRightString(width - 50, y, f"{payment.currency} {payment.amount}")
        
        p.line(50, y - 10, width - 50, y - 10)
        y -= 30
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Total Paid")
        p.drawRightString(width - 50, y, f"{payment.currency} {payment.amount}")

        # Footer
        p.setFont("Helvetica", 10)
        p.drawString(50, 50, "Thank you for creating with 18+ PDF!")
        p.drawString(50, 35, "18pluspdf.com")

        p.showPage()
        p.save()

        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"receipt_{payment.razorpay_order_id}.pdf")
