from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from .permissions import IsAdmin
from billing.models import Subscription, Plan
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
        
        # Revenue (Simple approximation based on active subs * plan price)
        # In a real app, you'd query a Transaction/Invoice model
        # For now, we sum the price of plans associated with active subscriptions
        monthly_revenue = Subscription.objects.filter(status='active').aggregate(
            total=Sum('plan__price')
        )['total'] or 0

        # Plan distribution
        plan_distribution = Subscription.objects.values('plan__name').annotate(
            count=Count('id')
        )

        return Response({
            "total_users": total_users,
            "verified_users": verified_users,
            "active_subscriptions": active_subs,
            "monthly_revenue": monthly_revenue,
            "plan_distribution": plan_distribution
        }, status=status.HTTP_200_OK)
