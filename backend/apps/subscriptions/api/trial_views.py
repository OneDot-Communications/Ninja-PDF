"""Trial Period API Views"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone

from apps.subscriptions.models import Plan, Subscription
from apps.subscriptions.services.trial_service import TrialService
from core.views import IsSuperAdmin


class StartTrialView(APIView):
    """Start a free trial for the authenticated user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        plan_slug = request.data.get('plan_slug')
        
        if not plan_slug:
            return Response(
                {'error': 'plan_slug is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            plan = Plan.objects.get(slug=plan_slug, is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already has an active subscription or trial
        try:
            existing = Subscription.objects.get(user=request.user)
            if existing.status in [Subscription.Status.ACTIVE, Subscription.Status.TRIAL]:
                return Response(
                    {'error': 'You already have an active subscription or trial'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Subscription.DoesNotExist:
            pass
        
        try:
            subscription = TrialService.start_trial(request.user, plan)
            trial_info = TrialService.check_trial_status(subscription)
            
            return Response({
                'success': True,
                'message': f'Your {trial_info["days_remaining"]}-day trial has started!',
                'subscription': {
                    'plan': plan.name,
                    'status': subscription.status,
                    'trial_ends_at': subscription.trial_ends_at,
                    'days_remaining': trial_info['days_remaining'],
                }
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class TrialStatusView(APIView):
    """Check trial status for the authenticated user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            subscription = Subscription.objects.get(user=request.user)
            trial_info = TrialService.check_trial_status(subscription)
            
            return Response({
                'has_subscription': True,
                'is_trial': subscription.is_trial,
                'trial_active': trial_info['is_active'],
                'days_remaining': trial_info['days_remaining'],
                'trial_ends_at': trial_info['ends_at'],
                'is_expired': trial_info['is_expired'],
                'plan': subscription.plan.name if subscription.plan else None,
                'status': subscription.status,
            })
        except Subscription.DoesNotExist:
            return Response({
                'has_subscription': False,
                'is_trial': False,
                'trial_active': False,
                'days_remaining': 0,
                'trial_ends_at': None,
                'is_expired': False,
                'plan': None,
                'status': 'FREE',
            })


class ConvertTrialView(APIView):
    """Convert trial to paid subscription (called after successful payment)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        payment_id = request.data.get('payment_id')
        
        try:
            subscription = Subscription.objects.get(user=request.user)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not subscription.is_trial:
            return Response(
                {'error': 'Subscription is not a trial'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = TrialService.convert_trial_to_paid(subscription, payment_id)
            return Response({
                'success': True,
                'message': 'Your subscription is now active!',
                'subscription': {
                    'plan': subscription.plan.name if subscription.plan else None,
                    'status': subscription.status,
                    'current_period_end': subscription.current_period_end,
                }
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ExtendTrialView(APIView):
    """Super Admin: Extend a user's trial period"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        additional_days = request.data.get('days', 7)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            subscription = Subscription.objects.get(user=user)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'User has no subscription'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not subscription.is_trial:
            return Response(
                {'error': 'Subscription is not a trial'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = TrialService.extend_trial(subscription, additional_days)
            
            # Log the action
            from apps.accounts.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                action_type='ADMIN_ACTION',
                resource_type='Subscription',
                resource_id=str(subscription.id),
                description=f'Extended trial for {user.email} by {additional_days} days',
                ip_address=request.META.get('REMOTE_ADDR', ''),
            )
            
            return Response({
                'success': True,
                'message': f'Trial extended by {additional_days} days',
                'new_trial_ends_at': subscription.trial_ends_at,
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminTrialListView(APIView):
    """Super Admin: List all active and expiring trials"""
    permission_classes = [IsSuperAdmin]
    
    def get(self, request):
        # Get filter parameters
        status_filter = request.query_params.get('status', 'all')  # all, active, expiring, expired
        
        now = timezone.now()
        
        if status_filter == 'expiring':
            # Trials expiring in next 3 days
            trials = TrialService.get_expiring_trials(days_ahead=3)
        elif status_filter == 'expired':
            # Expired trials not yet processed
            trials = TrialService.get_expired_trials()
        elif status_filter == 'active':
            # Active trials
            trials = Subscription.objects.filter(
                is_trial=True,
                status=Subscription.Status.TRIAL,
                trial_ends_at__gte=now,
            ).select_related('user', 'plan')
        else:
            # All trials
            trials = Subscription.objects.filter(
                is_trial=True,
            ).select_related('user', 'plan').order_by('-trial_started_at')
        
        data = []
        for sub in trials:
            trial_info = TrialService.check_trial_status(sub)
            data.append({
                'id': sub.id,
                'user': {
                    'id': sub.user.id,
                    'email': sub.user.email,
                    'name': f'{sub.user.first_name} {sub.user.last_name}'.strip() or sub.user.email,
                },
                'plan': sub.plan.name if sub.plan else None,
                'status': sub.status,
                'trial_started_at': sub.trial_started_at,
                'trial_ends_at': sub.trial_ends_at,
                'days_remaining': trial_info['days_remaining'],
                'is_expired': trial_info['is_expired'],
                'trial_converted': sub.trial_converted,
            })
        
        return Response({
            'count': len(data),
            'results': data,
        })


class ForceExpireTrialView(APIView):
    """Super Admin: Force expire a user's trial"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            subscription = Subscription.objects.get(user=user)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'User has no subscription'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not subscription.is_trial:
            return Response(
                {'error': 'Subscription is not a trial'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subscription = TrialService.expire_trial(subscription)
        
        # Log the action
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='Subscription',
            resource_id=str(subscription.id),
            description=f'Force expired trial for {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'Trial expired for {user.email}',
        })
