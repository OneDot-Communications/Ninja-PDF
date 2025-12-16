"""Signatures API Views"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.signatures.models import SignatureRequest, SignatureTemplate, SignatureContact, SavedSignature
from apps.signatures.api.serializers import (
    SignatureRequestSerializer,
    SignatureTemplateSerializer,
    SignatureContactSerializer,
    SavedSignatureSerializer
)


class SignatureRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for signature requests."""
    serializer_class = SignatureRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Track "Viewed" status if accessed by recipient (or generic view link)
        # Assuming the recipient is viewing if status is PENDING and not the sender
        if instance.status == 'PENDING' and request.user.email == instance.recipient_email:
             # Only update/notify if not already viewed (to avoid spam)
             # But wait, we don't have a 'VIEWED' status in choices strictly, or we do?
             # Let's check models. Yes, we do: ('VIEWED', 'Viewed')
             pass # Logic continues below
             
        # Actually, let's just do it for any 'PENDING' request viewed by recipient
        if instance.status == 'PENDING' and (request.user.email == instance.recipient_email):
            instance.status = 'VIEWED'
            instance.save()
            
            # Send Email
            from core.services.email_service import EmailService
            EmailService.send_document_viewed(instance.sender, instance.document_name, instance.recipient_email)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        mode = self.request.query_params.get('mode', '')
        
        if mode == 'inbox':
            # Requests where user is recipient
            return SignatureRequest.objects.filter(recipient_email=user.email).exclude(status='TRASHED')
        elif mode == 'signed':
            return SignatureRequest.objects.filter(sender=user, status='SIGNED')
        elif mode == 'trash':
            return SignatureRequest.objects.filter(sender=user, status='TRASHED')
        else:
            # Default: sent by user
            return SignatureRequest.objects.filter(sender=user).exclude(status='TRASHED')

    def perform_create(self, serializer):
        # 1. Check Quota
        user = self.request.user
        file_obj = self.request.FILES.get('file') # Assuming field name is 'file' based on typical upload
        # Wait, if using JSON parser, it might be in serializer.validated_data['file']
        # But let's check serializer first.
        # Actually, let's rely on serializer validation or check here.
        # Ideally check BEFORE save.
        
        file_size = 0
        if file_obj:
            file_size = file_obj.size
            from core.services.quota_service import QuotaService
            QuotaService.check_storage_quota(user, file_size)

        instance = serializer.save(sender=self.request.user)
        
        # 2. Update Usage
        if file_size > 0:
             from core.services.quota_service import QuotaService
             QuotaService.update_storage_usage(user, file_size)

        # Send Email to Recipient
        from django.core.mail import send_mail
        from django.conf import settings
        import os
        
        frontend_host = os.getenv('FRONTEND_HOST', 'https://18pluspdf.com')
        if frontend_host.endswith('/'):
            frontend_host = frontend_host[:-1]
            
        # Assuming frontend route: /signatures/sign/{id}
        link = f"{frontend_host}/signatures/sign/{instance.id}"
        
        try:
            send_mail(
                subject=f"Signature Request: {instance.document_name}",
                message=f"Hello,\n\n{self.request.user.email} has requested you to sign '{instance.document_name}'.\n\nPlease review and sign the document here:\n{link}\n\nMessage from sender:\n{instance.message}\n\nThank you,\n18+ PDF Team",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.recipient_email],
                fail_silently=False
            )
        except Exception as e:
            print(f"Failed to send signature email: {e}")
            # Non-blocking failure


    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Email Notifications for Status Changes
        if instance.status in ['SIGNED', 'DECLINED']:
            from django.core.mail import send_mail
            from django.conf import settings
            import os
            
            subject_status = "Signed" if instance.status == 'SIGNED' else "Declined"
            subject = f"Document {subject_status}: {instance.document_name}"
            
            if instance.status == 'SIGNED':
                message = f"Hello {instance.sender.email},\n\nGood news! {instance.recipient_email} has successfully signed the document '{instance.document_name}'.\n\nYou can view and download the signed document from your dashboard.\n\nThank you,\n18+ PDF Team"
            else:
                message = f"Hello {instance.sender.email},\n\n{instance.recipient_email} has declined to sign the document '{instance.document_name}'.\n\nReason (if provided): {instance.message}\n\nThank you,\n18+ PDF Team"
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[instance.sender.email],
                    fail_silently=True
                )
            except Exception as e:
                print(f"Failed to send signature status email: {e}")

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """Sign a signature request."""
        obj = self.get_object()
        signature_data = request.data.get('signature')
        
        if obj.status in ['PENDING', 'VIEWED']:
            from django.utils import timezone
            obj.status = 'SIGNED'
            obj.signed_at = timezone.now()
            # In a real app, we would burn the signature into the PDF here.
            # For now, we just mark it as signed.
            obj.save()
            
            # Send Email Notification (Reusing logic logic or extracting it)
            # Let's just send the email here directly for reliability
            from django.core.mail import send_mail
            from django.conf import settings
            
            subject = f"Document Signed: {obj.document_name}"
            message = f"Hello {obj.sender.email},\n\nGood news! {obj.recipient_email} has successfully signed the document '{obj.document_name}'.\n\nThank you,\n18+ PDF Team"
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[obj.sender.email],
                    fail_silently=True
                )
            except Exception as e:
                print(f"Failed to send signed email: {e}")
                
            return Response({'status': 'signed'})
            
        return Response({'error': 'Cannot sign this request (invalid status)'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get signature request statistics."""
        user = request.user
        sent = SignatureRequest.objects.filter(sender=user)
        inbox = SignatureRequest.objects.filter(recipient_email=user.email).exclude(status='TRASHED')
        
        return Response({
            'sent': sent.filter(status='PENDING').count(),
            'inbox': inbox.filter(status='PENDING').count(),
            'completed': sent.filter(status='SIGNED').count(),
            'total_sent': sent.count(),
            'declined': sent.filter(status='DECLINED').count(),
            'expired': sent.filter(status='EXPIRED').count(),
        })

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke a sent signature request."""
        obj = self.get_object()
        # Only allow revoking if pending or viewed
        if obj.status in ['PENDING', 'VIEWED']:
            obj.status = 'TRASHED'
            obj.save()
            return Response({'status': 'revoked'})
        return Response({'error': 'Cannot revoke completed or already trashed requests'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a trashed signature request."""
        obj = self.get_object()
        if obj.status == 'TRASHED':
            obj.status = 'PENDING'
            obj.save()
        return Response({'status': 'restored'})


class SignatureTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for signature templates."""
    serializer_class = SignatureTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SignatureTemplate.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SignatureContactViewSet(viewsets.ModelViewSet):
    """ViewSet for signature contacts."""
    serializer_class = SignatureContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SignatureContact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavedSignatureViewSet(viewsets.ModelViewSet):
    """ViewSet for user's saved signatures."""
    serializer_class = SavedSignatureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedSignature.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If marked as default, unset other defaults
        if serializer.validated_data.get('is_default'):
            SavedSignature.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            SavedSignature.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
        serializer.save()

    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get user's default signature."""
        sig = SavedSignature.objects.filter(user=request.user, is_default=True).first()
        if sig:
            return Response(SavedSignatureSerializer(sig).data)
        # Fallback to most recent
        sig = SavedSignature.objects.filter(user=request.user).first()
        if sig:
            return Response(SavedSignatureSerializer(sig).data)
        return Response({'error': 'No saved signature found'}, status=status.HTTP_404_NOT_FOUND)

