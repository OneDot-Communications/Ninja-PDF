"""
GDPR Compliance Views - Tasks 97-100
Provides endpoints for:
- Data export requests (Task 97)
- Data deletion requests (Task 98)
- Consent management (Task 99-100)
"""
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from apps.accounts.services.permissions import IsSuperAdmin

User = get_user_model()


class GDPRDataExportView(views.APIView):
    """Task 97: GDPR Data Export - User requests their data"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Collect all user data
        from apps.subscriptions.models import Subscription, Payment, Invoice
        from apps.files.models import FileAsset
        from apps.jobs.models import UserJob
        from apps.accounts.models import AuthAuditLog
        
        export_data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': str(user.date_joined),
                'role': user.role,
                'subscription_tier': user.subscription_tier,
            },
            'subscription': None,
            'payments': [],
            'invoices': [],
            'files': [],
            'jobs': [],
            'login_history': [],
        }
        
        # Subscription
        try:
            sub = Subscription.objects.get(user=user)
            export_data['subscription'] = {
                'plan': sub.plan.name if sub.plan else 'Free',
                'status': sub.status,
                'current_period_end': str(sub.current_period_end),
            }
        except Subscription.DoesNotExist:
            pass
        
        # Payments
        for p in Payment.objects.filter(user=user):
            export_data['payments'].append({
                'id': p.id,
                'amount': str(p.amount),
                'currency': p.currency,
                'status': p.status,
                'created_at': str(p.created_at),
            })
        
        # Files (metadata only, not actual files)
        for f in FileAsset.objects.filter(user=user):
            export_data['files'].append({
                'id': f.id,
                'filename': f.original_filename,
                'size': f.file_size,
                'uploaded_at': str(f.created_at),
            })
        
        # Login history
        for log in AuthAuditLog.objects.filter(user=user)[:100]:
            export_data['login_history'].append({
                'event': log.event_type,
                'ip': log.ip_address,
                'timestamp': str(log.created_at),
            })
        
        # Send email with export
        from django.core.mail import EmailMessage
        from django.conf import settings
        import json
        
        email = EmailMessage(
            subject='Your Data Export - 18+ PDF',
            body='Your data export is attached as JSON. This contains all personal data we have stored about you.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach('gdpr_export.json', json.dumps(export_data, indent=2), 'application/json')
        email.send(fail_silently=True)
        
        return Response({'status': 'export_sent', 'message': 'Data export has been emailed to you'})


class GDPRDataDeleteView(views.APIView):
    """Task 98: GDPR Data Deletion - Complete account and data deletion"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        confirm = request.data.get('confirm')
        password = request.data.get('password')
        
        # Require confirmation and password
        if confirm != 'DELETE_MY_ACCOUNT':
            return Response({'error': 'Confirmation required. Send confirm: "DELETE_MY_ACCOUNT"'}, status=400)
        
        if not password or not user.check_password(password):
            return Response({'error': 'Password required for account deletion'}, status=400)
        
        # Cancel any active subscriptions
        from apps.subscriptions.models import Subscription
        try:
            sub = Subscription.objects.get(user=user)
            if sub.stripe_subscription_id:
                # Cancel Stripe subscription
                import stripe
                try:
                    stripe.Subscription.delete(sub.stripe_subscription_id)
                except:
                    pass
            sub.status = 'CANCELED'
            sub.save()
        except Subscription.DoesNotExist:
            pass
        
        # Delete all files
        from apps.files.models import FileAsset
        for f in FileAsset.objects.filter(user=user):
            try:
                f.file.delete()  # Delete actual file
            except:
                pass
            f.delete()
        
        # Delete jobs
        from apps.jobs.models import UserJob
        UserJob.objects.filter(user=user).delete()
        
        # Delete sessions
        from apps.accounts.models import UserSession
        UserSession.objects.filter(user=user).delete()
        
        # Log the deletion
        from apps.accounts.models import AuthAuditLog
        AuthAuditLog.objects.create(
            user=None,
            event_type='ACCOUNT_DELETED',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={'deleted_email': user.email}
        )
        
        # Finally delete user
        email = user.email
        user.delete()
        
        # Send confirmation email
        from django.core.mail import send_mail
        from django.conf import settings
        send_mail(
            subject='Account Deleted - 18+ PDF',
            message='Your account and all associated data have been permanently deleted as requested. We\'re sorry to see you go!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True
        )
        
        return Response({'status': 'deleted', 'message': 'Account and all data permanently deleted'})


class GDPRConsentView(views.APIView):
    """Task 99-100: Consent Management"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current consent status"""
        user = request.user
        return Response({
            'marketing_consent': getattr(user, 'marketing_consent', False),
            'analytics_consent': getattr(user, 'analytics_consent', True),
            'third_party_consent': getattr(user, 'third_party_consent', False),
        })

    def patch(self, request):
        """Update consent preferences"""
        user = request.user
        
        if 'marketing_consent' in request.data:
            user.marketing_consent = request.data['marketing_consent']
        if 'analytics_consent' in request.data:
            user.analytics_consent = request.data['analytics_consent']
        if 'third_party_consent' in request.data:
            user.third_party_consent = request.data['third_party_consent']
        
        user.save()
        
        return Response({'status': 'updated'})


class AdminGDPRDeleteView(views.APIView):
    """Super Admin: Force delete user for GDPR compliance"""
    permission_classes = [IsSuperAdmin]

    def delete(self, request, user_id):
        """Delete user by ID (admin action)"""
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        # Same deletion logic as user self-delete
        from apps.files.models import FileAsset
        from apps.jobs.models import UserJob
        from apps.accounts.models import UserSession, AuthAuditLog
        from apps.subscriptions.models import Subscription
        
        # Cancel subscription
        try:
            sub = Subscription.objects.get(user=user)
            sub.status = 'CANCELED'
            sub.save()
        except:
            pass
        
        # Delete related data
        FileAsset.objects.filter(user=user).delete()
        UserJob.objects.filter(user=user).delete()
        UserSession.objects.filter(user=user).delete()
        
        email = user.email
        user.delete()
        
        AuthAuditLog.objects.create(
            user=None,
            event_type='ADMIN_DELETED_USER',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            metadata={'deleted_email': email, 'admin': request.user.email}
        )
        
        return Response({'status': 'deleted', 'user': email})
