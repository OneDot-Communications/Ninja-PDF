from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from .permissions import IsAdmin
from billing.models import Subscription, Plan, Invoice, Feature
from django.db.models import Sum, Count

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
from .models import UserSession
from .serializers import UserSessionSerializer
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

        except Exception as e:
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

