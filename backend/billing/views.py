from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Plan, Subscription, Invoice, BusinessDetails, Feature, UserFeatureOverride
from .serializers import (
    PlanSerializer, SubscriptionSerializer, InvoiceSerializer, 
    BusinessDetailsSerializer, FeatureSerializer, UserFeatureOverrideSerializer
)
from core.views import IsAdminOrSuperAdmin, IsSuperAdmin

class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    permission_classes = [IsAdminOrSuperAdmin] # Admins can read/edit? Maybe restricted to SuperAdmin for editing.
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
             return [IsSuperAdmin()]
        return [permissions.AllowAny()] # Public can view features

class UserFeatureOverrideViewSet(viewsets.ModelViewSet):
    queryset = UserFeatureOverride.objects.all()
    serializer_class = UserFeatureOverrideSerializer
    permission_classes = [IsSuperAdmin] # Only Super Admin can override features per user

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
class AdminSubscriptionView(viewsets.ViewSet):
    permission_classes = [IsAdminOrSuperAdmin] # Allows Admins to request changes

    @action(detail=False, methods=['post'])
    def assign_plan(self, request):
        user_id = request.data.get('user_id')
        plan_slug = request.data.get('plan_slug')
        
        if not user_id or not plan_slug:
            return Response({'error': 'user_id and plan_slug required'}, status=400)
        
        # Standard Admin -> Create Request
        if request.user.role == 'ADMIN':
            from core.models import AdminActionRequest
            req = AdminActionRequest.objects.create(
                requester=request.user,
                action_type='CHANGE_USER_PLAN',
                payload={'user_id': user_id, 'plan_slug': plan_slug},
                reason=f"Admin {request.user.email} requested plan change for user {user_id} to {plan_slug}"
            )
            return Response({'status': 'Queued for Approval', 'request_id': req.id}, status=202)

        # Super Admin -> Execute
        from authentication.models import User
        try:
            user = User.objects.get(id=user_id)
            plan = Plan.objects.get(slug=plan_slug)
        except (User.DoesNotExist, Plan.DoesNotExist):
            return Response({'error': 'User or Plan not found'}, status=404)
            
        sub, created = Subscription.objects.get_or_create(user=user)
        sub.plan = plan
        sub.status = 'ACTIVE' # Force active
        sub.save()
        
        return Response({'status': 'Plan assigned', 'plan': plan.name})

from .models import Referral, Payment
from .serializers_referrals import ReferralSerializer
from .serializers import PaymentSerializer # Ensure this is created
from .razorpay_utils import create_order, verify_payment_signature
from django.utils import timezone
from datetime import timedelta

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
    """
    Viewset for User Payment History & Creation
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['SUPER_ADMIN']:
             return Payment.objects.all().order_by('-created_at')
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        """
        Creates a Razorpay Order
        """
        plan_slug = request.data.get('plan_slug')
        
        try:
            plan = Plan.objects.get(slug=plan_slug)
        except Plan.DoesNotExist:
            return Response({'error': 'Invalid Plan'}, status=400)
            
        try:
            order = create_order(amount=float(plan.price), currency=plan.currency, notes={'plan_slug': plan_slug, 'user_id': request.user.id})
            
            # Save generic Payment placeholder? Or wait for success? 
            # We create a placeholder Payment to track Attempts
            Payment.objects.create(
                user=request.user,
                razorpay_order_id=order['id'],
                amount=plan.price,
                currency=plan.currency,
                status='CREATED',
                plan=plan
            )
            
            return Response(order)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def verify_payment(self, request):
        """
        Verifies signature and activates subscription.
        Includes Idempotency check to prevent double-crediting.
        """
        data = request.data
        required_fields = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
        if not all(field in data for field in required_fields):
            return Response({'error': 'Missing required fields'}, status=400)

        razorpay_order_id = data['razorpay_order_id']

        try:
            payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
        except Payment.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        # Idempotency Check: If already successful, return success without re-processing
        if payment.status == 'SUCCESS':
             return Response({'status': 'Payment already verified', 'subscription': 'ACTIVE'})

        if verify_payment_signature(data):
            try:
                payment.razorpay_payment_id = data['razorpay_payment_id']
                payment.razorpay_signature = data['razorpay_signature']
                payment.status = 'SUCCESS'
                payment.save()
                
                # Activate/Extend Subscription
                sub, _ = Subscription.objects.get_or_create(user=payment.user)
                sub.plan = payment.plan
                sub.status = 'ACTIVE'
                
                # Logic: Add 30 days or extend current?
                now = timezone.now()
                if sub.current_period_end and sub.current_period_end > now:
                     sub.current_period_end += timedelta(days=30) # Assuming monthly
                else:
                     sub.current_period_end = now + timedelta(days=30)
                
                sub.save()
                
                return Response({'status': 'Payment Verified', 'subscription_end': sub.current_period_end})
            except Exception as e:
                # Log error
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error activating subscription: {e}")
                return Response({'error': 'Payment verified but subscription activation failed'}, status=500)
        else:
            payment.status = 'FAILED'
            payment.save()
            return Response({'error': 'Invalid Signature'}, status=400)
