from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.accounts.services.permissions import IsAdmin
from apps.subscriptions.models.subscription import Subscription, Plan, Invoice, Feature
from django.db import models
from django.db.models import Sum, Count
from core.views import IsSuperAdmin

User = get_user_model()

class AdminStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_users = User.objects.count()
        
        # Determine verified users
        verified_users = User.objects.filter(is_verified=True).count()
        
        # Subscriptions
        active_subs = Subscription.objects.filter(status='active').count()
        
        # Revenue (MRR) from active subscriptions
        monthly_revenue = Subscription.objects.filter(status='active').aggregate(
            total=Sum('plan__price')
        )['total'] or 0

        # Global Revenue (All time collected from Invoices)
        total_revenue = Invoice.objects.filter(status='PAID').aggregate(
            total=Sum('amount_paid')
        )['total'] or 0

        # Plan distribution
        plan_distribution = Subscription.objects.values('plan__name').annotate(
            count=Count('id')
        )

        
        # Admin Count
        admin_count = User.objects.filter(role__in=['ADMIN', 'SUPER_ADMIN']).count()

        # Signups over time (Last 7 days)
        from django.utils import timezone
        import datetime
        today = timezone.now().date()
        signups_last_7_days = []
        for i in range(6, -1, -1):
            date = today - datetime.timedelta(days=i)
            count = User.objects.filter(date_joined__date=date).count()
            signups_last_7_days.append({
                "date": date.strftime("%Y-%m-%d"),
                "count": count
            })

        # Recent Payments
        recent_payments = Invoice.objects.filter(status='PAID').select_related('user').order_by('-created_at')[:5]
        recent_payment_data = [{
            "id": inv.id,
            "user": inv.user.email,
            "amount": inv.amount_paid,
            "date": inv.created_at
        } for inv in recent_payments]

        return Response({
            "total_users": total_users,
            "verified_users": verified_users,
            "active_subscriptions": active_subs,
            "monthly_revenue": monthly_revenue,
            "total_revenue": total_revenue,
            "plan_distribution": plan_distribution,
            "admin_count": admin_count,
            "signups_trend": signups_last_7_days,
            "recent_payments": recent_payment_data
        }, status=status.HTTP_200_OK)

from django.contrib.admin.models import LogEntry
from apps.accounts.models import UserSession
from apps.accounts.api.serializers import UserSessionSerializer
from django.db import connection

class AdminActivityView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # 1. Recent logins from UserSession
        recent_sessions = UserSession.objects.select_related('user').order_by('-created_at')[:10]
        sessions_data = UserSessionSerializer(recent_sessions, many=True).data

        # 2. Admin actions from LogEntry
        recent_admin_actions = LogEntry.objects.select_related('user', 'content_type').order_by('-action_time')[:10]
        # We construct a simple ad-hoc format since we don't have a serializer for LogEntry readily available
        admin_actions_data = [{
            'id': log.id,
            'user': log.user.email,
            'action': str(log),
            'timestamp': log.action_time,
            'type': 'ADMIN_LOG'
        } for log in recent_admin_actions]
        
        return Response({
            'sessions': sessions_data,
            'admin_actions': admin_actions_data
        })

class AdminDatabaseStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # Real DB Stats using raw SQL (Postgres specific)
        try:
             with connection.cursor() as cursor:
                # DB Size
                cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()));")
                db_size = cursor.fetchone()[0]
                
                # Active Connections
                cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();")
                connections = cursor.fetchone()[0]
                
                # Cache Hit Ratio (Indicator of performance)
                cursor.execute("""
                    SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio 
                    FROM pg_statio_user_tables;
                """)
                row = cursor.fetchone()
                cache_hit = round(row[0] * 100, 2) if row and row[0] else 0

        except Exception:
            # Fallback for non-postgres or permission errors
            db_size = "Unknown"
            connections = 0
            cache_hit = 0
        
        # Table Row Counts (Approximation)
        user_count = User.objects.count()
        
        return Response({
            'size': db_size,
            'connections': connections,
            'cache_hit_ratio': cache_hit,
            'objects': {
                'users': user_count,
                'subscriptions': Subscription.objects.count(),
                'invoices': Invoice.objects.count(),
                'features': Feature.objects.count(),
            }
        })


# =============================================================================
# SUPER ADMIN USER ACTIONS (Tasks 14-19)
# =============================================================================

class ForceLogoutView(APIView):
    """Task 17: Force logout from all sessions for a user"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Delete all sessions for this user
        from apps.accounts.models import UserSession
        deleted_count = UserSession.objects.filter(user=user).delete()[0]
        
        # Blacklist all refresh tokens
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass  # Token blacklist not configured
        
        # Log the action
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Force logged out user {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'sessions_terminated': deleted_count,
            'message': f'User {user.email} has been logged out from all devices'
        })


class BanUserView(APIView):
    """Tasks 14-15: Lock or permanently ban any account"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Prevent banning super admins
        if user.role == 'SUPER_ADMIN' and request.user.id != user.id:
            return Response({'error': 'Cannot ban another Super Admin'}, status=status.HTTP_403_FORBIDDEN)
        
        ban_type = request.data.get('type', 'temporary')  # 'temporary' or 'permanent'
        reason = request.data.get('reason', '')
        duration_days = request.data.get('duration_days', 7)
        
        user.is_active = False
        
        if ban_type == 'permanent':
            user.is_banned = True
            user.ban_reason = reason
        else:
            from django.utils import timezone
            import datetime
            user.banned_until = timezone.now() + datetime.timedelta(days=duration_days)
        
        user.save()
        
        # Force logout
        from apps.accounts.models import UserSession
        UserSession.objects.filter(user=user).delete()
        
        # Log the action
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'{ban_type.title()} ban applied to {user.email}: {reason}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'ban_type': ban_type,
            'message': f'User {user.email} has been {ban_type}ly banned'
        })


class UnbanUserView(APIView):
    """Reactivate a banned user"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user.is_active = True
        user.is_banned = False
        user.banned_until = None
        user.ban_reason = ''
        user.save()
        
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Unbanned user {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'User {user.email} has been unbanned and can now login'
        })


class ForcePasswordResetView(APIView):
    """Task 16: Force password reset for any account"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Generate reset token and send email
        import uuid
        from django.utils import timezone
        import datetime
        
        reset_token = str(uuid.uuid4())
        user.password_reset_token = reset_token
        user.password_reset_expires = timezone.now() + datetime.timedelta(hours=24)
        user.force_password_change = True
        user.save()
        
        # Send email notification
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
            send_mail(
                subject='Password Reset Required',
                message=f'Your password has been reset by an administrator. Please set a new password using this link: {reset_url}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
        
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Forced password reset for {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'Password reset email sent to {user.email}'
        })


class Reset2FAView(APIView):
    """Task 19: Reset MFA/2FA for any account"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Disable 2FA for the user
        user.is_2fa_enabled = False
        user.totp_secret = None
        user.save()
        
        # Delete backup codes if they exist
        try:
            from django_otp.plugins.otp_totp.models import TOTPDevice
            TOTPDevice.objects.filter(user=user).delete()
        except Exception:
            pass
        
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Reset 2FA for {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'2FA has been disabled for {user.email}. They can set it up again.'
        })


class ChangeUserRoleView(APIView):
    """Tasks 10-13: Assign/change roles, force upgrade/downgrade"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        new_role = request.data.get('role')
        if new_role not in ['USER', 'ADMIN', 'SUPER_ADMIN']:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent removing last super admin
        if user.role == 'SUPER_ADMIN' and new_role != 'SUPER_ADMIN':
            super_admin_count = User.objects.filter(role='SUPER_ADMIN').count()
            if super_admin_count <= 1:
                return Response({'error': 'Cannot remove the last Super Admin'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_role = user.role
        user.role = new_role
        user.save()
        
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Changed role from {old_role} to {new_role} for {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'old_role': old_role,
            'new_role': new_role,
            'message': f'User {user.email} role changed to {new_role}'
        })


class ImpersonateUserView(APIView):
    """Task 17: Impersonate user (Login as)"""
    permission_classes = [IsSuperAdmin]
    
    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if target_user.is_superuser or target_user.role == 'SUPER_ADMIN':
             return Response({'error': 'Cannot impersonate another Super Admin'}, status=status.HTTP_403_FORBIDDEN)
             
        # Generate tokens for the target user
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(target_user)
        
        # Log the action (CRITICAL for audit)
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='SECURITY_ACTION',
            resource_type='User',
            resource_id=str(target_user.id),
            description=f'Super Admin {request.user.email} impersonated {target_user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': target_user.id,
                'email': target_user.email,
                'role': target_user.role
            },
            'message': f'You are now logged in as {target_user.email}'
        })


# =============================================================================
# ANALYTICS DASHBOARD (Tasks 101-107)
# =============================================================================

class PlatformAnalyticsView(APIView):
    """Tasks 101-107: DAU/MAU, conversion, churn, tool usage, performance"""
    permission_classes = [IsSuperAdmin]
    
    def get(self, request):
        from django.utils import timezone
        from django.db.models import Count
        from django.db.models.functions import TruncDate
        import datetime
        
        now = timezone.now()
        today = now.date()
        
        # Task 101: DAU/MAU
        dau = UserSession.objects.filter(
            created_at__date=today
        ).values('user').distinct().count()
        
        thirty_days_ago = now - datetime.timedelta(days=30)
        mau = UserSession.objects.filter(
            created_at__gte=thirty_days_ago
        ).values('user').distinct().count()
        
        # Task 102: Conversion rates (Free → Premium)
        total_users = User.objects.filter(role='USER').count()
        premium_users = Subscription.objects.filter(
            status__in=['ACTIVE', 'active'],
            plan__price__gt=0
        ).count()
        conversion_rate = (premium_users / total_users * 100) if total_users > 0 else 0
        
        # Task 103: Churn rate (last 30 days)
        canceled_last_30 = Subscription.objects.filter(
            status='CANCELED',
            current_period_end__gte=thirty_days_ago
        ).count()
        active_start = Subscription.objects.filter(
            current_period_start__lte=thirty_days_ago,
            status__in=['ACTIVE', 'active']
        ).count()
        churn_rate = (canceled_last_30 / active_start * 100) if active_start > 0 else 0
        
        # Task 104: Tool usage analytics
        from apps.jobs.models import Job
        tool_usage = Job.objects.values('operation').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Task 105: System performance metrics
        avg_processing_time = Job.objects.filter(
            status='COMPLETED'
        ).aggregate(
            avg_time=models.Avg(models.F('completed_at') - models.F('created_at'))
        )
        
        # Task 106: Job queue health
        pending_jobs = Job.objects.filter(status='PENDING').count()
        processing_jobs = Job.objects.filter(status='PROCESSING').count()
        
        # Task 107: Failure rates
        total_jobs = Job.objects.count()
        failed_jobs = Job.objects.filter(status='FAILED').count()
        failure_rate = (failed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        
        # 7-day trends
        user_trend = []
        revenue_trend = []
        for i in range(6, -1, -1):
            date = today - datetime.timedelta(days=i)
            user_trend.append({
                'date': date.isoformat(),
                'count': User.objects.filter(date_joined__date=date).count()
            })
            revenue_trend.append({
                'date': date.isoformat(),
                'amount': float(Invoice.objects.filter(
                    created_at__date=date, status='PAID'
                ).aggregate(total=Sum('amount_paid'))['total'] or 0)
            })
        
        return Response({
            'dau': dau,
            'mau': mau,
            'conversion_rate': round(conversion_rate, 2),
            'churn_rate': round(churn_rate, 2),
            'tool_usage': list(tool_usage),
            'pending_jobs': pending_jobs,
            'processing_jobs': processing_jobs,
            'failure_rate': round(failure_rate, 2),
            'user_trend': user_trend,
            'revenue_trend': revenue_trend,
            'total_users': User.objects.count(),
            'total_revenue': float(Invoice.objects.filter(status='PAID').aggregate(
                total=Sum('amount_paid'))['total'] or 0),
        })


class ToolUsageAnalyticsView(APIView):
    """Task 104: Detailed tool usage analytics"""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        from apps.jobs.models import Job
        from django.db.models import Count, Avg
        from django.db.models.functions import TruncDate
        from django.utils import timezone
        import datetime
        
        # Last 30 days
        thirty_days_ago = timezone.now() - datetime.timedelta(days=30)
        
        # Tool popularity
        by_tool = Job.objects.filter(
            created_at__gte=thirty_days_ago
        ).values('operation').annotate(
            count=Count('id'),
            success_count=Count('id', filter=models.Q(status='COMPLETED')),
            fail_count=Count('id', filter=models.Q(status='FAILED'))
        ).order_by('-count')
        
        # Daily trend
        daily_usage = Job.objects.filter(
            created_at__gte=thirty_days_ago
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Average processing time by tool
        processing_times = Job.objects.filter(
            status='COMPLETED',
            completed_at__isnull=False
        ).values('operation').annotate(
            avg_seconds=Avg(models.F('completed_at') - models.F('created_at'))
        )
        
        return Response({
            'by_tool': list(by_tool),
            'daily_trend': list(daily_usage),
            'processing_times': list(processing_times)
        })


class JobQueueHealthView(APIView):
    """Task 106: Monitor job queue health"""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        from apps.jobs.models import Job
        from django.utils import timezone
        import datetime
        
        now = timezone.now()
        one_hour_ago = now - datetime.timedelta(hours=1)
        
        return Response({
            'pending': Job.objects.filter(status='PENDING').count(),
            'processing': Job.objects.filter(status='PROCESSING').count(),
            'completed_last_hour': Job.objects.filter(
                status='COMPLETED', completed_at__gte=one_hour_ago
            ).count(),
            'failed_last_hour': Job.objects.filter(
                status='FAILED', completed_at__gte=one_hour_ago
            ).count(),
            'oldest_pending': Job.objects.filter(
                status='PENDING'
            ).order_by('created_at').values('id', 'created_at', 'operation').first(),
            'queue_healthy': Job.objects.filter(
                status='PENDING', 
                created_at__lt=one_hour_ago
            ).count() < 10  # Alert if more than 10 jobs stuck for over an hour
        })



class ApiUsageAnalyticsView(APIView):
    """Task 88: Monitor API usage per user/token"""
    permission_classes = [IsSuperAdmin]
    
    def get(self, request):
        from apps.jobs.models import Job
        from django.db.models import Count
        from django.utils import timezone
        import datetime
        
        # Top API Users (by job submission)
        top_users = Job.objects.values('user__email').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Recent API Errors
        recent_errors = Job.objects.filter(
            status='FAILED'
        ).values('error_message', 'operation', 'user__email', 'created_at').order_by('-created_at')[:20]
        
        return Response({
            'top_users': list(top_users),
            'recent_errors': list(recent_errors),
            'total_requests_24h': Job.objects.filter(
                created_at__gte=timezone.now() - datetime.timedelta(hours=24)
            ).count()
        })


class DDoSToggleView(APIView):
    """Task 95: Global DDoS protection toggle"""
    permission_classes = [IsSuperAdmin]
    
    def get(self, request):
        from django.core.cache import cache
        is_enabled = cache.get('ddos_protection_enabled', False)
        return Response({'enabled': is_enabled})
        
    def post(self, request):
        from django.core.cache import cache
        enabled = request.data.get('enabled', True)
        # Set with native boolean, no expiry (indefinite)
        cache.set('ddos_protection_enabled', enabled, timeout=None)
        
        # Log action
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='SECURITY_ACTION',
            resource_type='System',
            resource_id='DDoS',
            description=f'DDoS protection {"enabled" if enabled else "disabled"}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True, 
            'message': f'DDoS protection is now {"ENABLED" if enabled else "DISABLED"}',
            'enabled': enabled
        })


# Phase 2: Account Flagging for Admin Review
class FlagUserView(APIView):
    """Flag a user account for review"""
    permission_classes = [IsAdmin]
    
    def post(self, request, user_id):
        reason = request.data.get('reason', '')
        
        if not reason:
            return Response(
                {'error': 'Reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Can't flag super admins
        if user.is_super_admin and not request.user.is_super_admin:
            return Response(
                {'error': 'Cannot flag a Super Admin'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from django.utils import timezone
        user.is_flagged = True
        user.flagged_reason = reason
        user.flagged_by = request.user
        user.flagged_at = timezone.now()
        user.save(update_fields=['is_flagged', 'flagged_reason', 'flagged_by', 'flagged_at'])
        
        # Log action
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Flagged user {user.email}: {reason}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'User {user.email} has been flagged for review'
        })


class UnflagUserView(APIView):
    """Remove flag from a user account"""
    permission_classes = [IsAdmin]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not user.is_flagged:
            return Response(
                {'error': 'User is not flagged'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_flagged = False
        user.flagged_reason = ''
        user.flagged_by = None
        user.flagged_at = None
        user.save(update_fields=['is_flagged', 'flagged_reason', 'flagged_by', 'flagged_at'])
        
        # Log action
        from apps.accounts.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='ADMIN_ACTION',
            resource_type='User',
            resource_id=str(user.id),
            description=f'Removed flag from user {user.email}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        
        return Response({
            'success': True,
            'message': f'Flag removed from user {user.email}'
        })


class FlaggedUsersListView(APIView):
    """List all flagged users for admin review"""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        flagged_users = User.objects.filter(is_flagged=True).select_related('flagged_by').order_by('-flagged_at')
        
        data = []
        for user in flagged_users:
            data.append({
                'id': user.id,
                'email': user.email,
                'name': f'{user.first_name} {user.last_name}'.strip() or user.email,
                'role': user.role,
                'is_flagged': user.is_flagged,
                'flagged_reason': user.flagged_reason,
                'flagged_by': user.flagged_by.email if user.flagged_by else None,
                'flagged_at': user.flagged_at,
                'is_banned': user.is_banned,
                'subscription_tier': user.subscription_tier,
            })
        
        return Response({
            'count': len(data),
            'results': data,
        })

