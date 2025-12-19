"""Content Management API Views - FAQs, Tutorials, Announcements, Support Tickets"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from apps.core.models.content import (
    ContentCategory, FAQArticle, Tutorial, Announcement,
    AnnouncementDismissal, SupportTicket, TicketMessage
)
from apps.core.api.content_serializers import (
    ContentCategorySerializer, FAQArticleSerializer, TutorialSerializer,
    AnnouncementSerializer, SupportTicketSerializer, SupportTicketCreateSerializer,
    TicketMessageSerializer
)
from core.views import IsAdminOrSuperAdmin


class ContentCategoryViewSet(viewsets.ModelViewSet):
    """CRUD for Content Categories"""
    queryset = ContentCategory.objects.all()
    serializer_class = ContentCategorySerializer
    permission_classes = [IsAdminOrSuperAdmin]
    
    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            # Only top-level categories by default
            qs = qs.filter(parent__isnull=True)
        return qs


class FAQArticleViewSet(viewsets.ModelViewSet):
    """
    CRUD for FAQ Articles.
    Tasks 135-137: Create/Edit/Delete FAQ articles
    """
    queryset = FAQArticle.objects.all()
    serializer_class = FAQArticleSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'helpful', 'not_helpful']:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # Public users only see published
        if not self.request.user.is_authenticated or self.request.user.role == 'USER':
            qs = qs.filter(status='PUBLISHED')
        
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(question__icontains=search) | Q(answer__icontains=search))
        
        return qs.select_related('category', 'created_by')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def helpful(self, request, pk=None):
        """Mark FAQ as helpful"""
        faq = self.get_object()
        faq.helpful_count += 1
        faq.save(update_fields=['helpful_count'])
        return Response({'helpful_count': faq.helpful_count})
    
    @action(detail=True, methods=['post'])
    def not_helpful(self, request, pk=None):
        """Mark FAQ as not helpful"""
        faq = self.get_object()
        faq.not_helpful_count += 1
        faq.save(update_fields=['not_helpful_count'])
        return Response({'not_helpful_count': faq.not_helpful_count})
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a draft FAQ"""
        faq = self.get_object()
        faq.status = FAQArticle.Status.PUBLISHED
        faq.published_at = timezone.now()
        faq.save()
        return Response({'status': 'published'})


class TutorialViewSet(viewsets.ModelViewSet):
    """
    CRUD for Tutorials.
    Tasks 138-139: Create/Update tutorials
    """
    queryset = Tutorial.objects.all()
    serializer_class = TutorialSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'complete']:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        if not self.request.user.is_authenticated or self.request.user.role == 'USER':
            qs = qs.filter(status='PUBLISHED')
        
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty.upper())
        
        tool = self.request.query_params.get('tool')
        if tool:
            qs = qs.filter(related_tools__contains=tool)
        
        return qs.select_related('category', 'created_by')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark tutorial as completed by user"""
        tutorial = self.get_object()
        tutorial.completion_count += 1
        tutorial.save(update_fields=['completion_count'])
        return Response({'completion_count': tutorial.completion_count})


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    CRUD for Announcements.
    Tasks 140-141: Publish/Schedule announcements
    """
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    
    def get_permissions(self):
        if self.action in ['active', 'dismiss', 'click']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrSuperAdmin()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active announcements for current user"""
        user = request.user
        now = timezone.now()
        
        announcements = Announcement.objects.filter(
            is_active=True,
            start_date__lte=now
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        )
        
        # Filter by role
        if user.role:
            announcements = announcements.filter(
                Q(target_roles=[]) | Q(target_roles__contains=user.role)
            )
        
        # Filter by plan
        if hasattr(user, 'subscription') and user.subscription.plan:
            plan_slug = user.subscription.plan.slug
            announcements = announcements.filter(
                Q(target_plans=[]) | Q(target_plans__contains=plan_slug)
            )
        
        # Exclude dismissed
        dismissed_ids = AnnouncementDismissal.objects.filter(
            user=user
        ).values_list('announcement_id', flat=True)
        announcements = announcements.exclude(id__in=dismissed_ids)
        
        serializer = self.get_serializer(announcements, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Dismiss an announcement"""
        announcement = self.get_object()
        
        if announcement.is_dismissible:
            AnnouncementDismissal.objects.get_or_create(
                user=request.user, announcement=announcement
            )
            announcement.dismiss_count += 1
            announcement.save(update_fields=['dismiss_count'])
            return Response({'status': 'dismissed'})
        return Response({'error': 'Cannot dismiss this announcement'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def click(self, request, pk=None):
        """Track announcement link click"""
        announcement = self.get_object()
        announcement.click_count += 1
        announcement.view_count += 1
        announcement.save(update_fields=['click_count', 'view_count'])
        return Response({'status': 'tracked'})


class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    Support Ticket System.
    Tasks 128-134: Customer support
    Tasks 194-196: Priority support for premium
    """
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'ADMIN']:
            qs = SupportTicket.objects.all()
            # Filter by status
            ticket_status = self.request.query_params.get('status')
            if ticket_status:
                qs = qs.filter(status=ticket_status.upper())
            # Filter by priority
            priority = self.request.query_params.get('priority')
            if priority:
                qs = qs.filter(priority=priority.upper())
            # Filter by assigned
            assigned = self.request.query_params.get('assigned')
            if assigned == 'me':
                qs = qs.filter(assigned_to=user)
            elif assigned == 'unassigned':
                qs = qs.filter(assigned_to__isnull=True)
            return qs.select_related('user', 'assigned_to')
        return SupportTicket.objects.filter(user=user).select_related('assigned_to')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SupportTicketCreateSerializer
        return SupportTicketSerializer
    
    def perform_create(self, serializer):
        user = self.request.user
        # Set priority based on subscription
        is_priority = user.is_premium if hasattr(user, 'is_premium') else False
        priority = 'HIGH' if is_priority else 'MEDIUM'
        serializer.save(user=user, is_priority=is_priority, priority=priority)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign ticket to an admin"""
        ticket = self.get_object()
        admin_id = request.data.get('admin_id')
        if admin_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                admin = User.objects.get(id=admin_id, role__in=['ADMIN', 'SUPER_ADMIN'])
                ticket.assigned_to = admin
                ticket.save()
                return Response({'status': 'assigned'})
            except User.DoesNotExist:
                return Response({'error': 'Admin not found'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': 'admin_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a ticket"""
        ticket = self.get_object()
        ticket.status = SupportTicket.Status.CLOSED
        ticket.resolved_at = timezone.now()
        ticket.save()
        return Response({'status': 'closed'})
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reopen a closed ticket"""
        ticket = self.get_object()
        ticket.status = SupportTicket.Status.OPEN
        ticket.resolved_at = None
        ticket.save()
        return Response({'status': 'reopened'})
    
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Get or add messages to a ticket"""
        ticket = self.get_object()
        
        if request.method == 'GET':
            # Filter internal notes for non-staff
            messages = ticket.messages.all()
            if request.user.role == 'USER':
                messages = messages.filter(is_internal=False)
            serializer = TicketMessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            message_text = request.data.get('message')
            is_internal = request.data.get('is_internal', False)
            attachments = request.data.get('attachments', [])
            
            if not message_text:
                return Response({'error': 'Message required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Only staff can add internal notes
            if is_internal and request.user.role == 'USER':
                is_internal = False
            
            message = TicketMessage.objects.create(
                ticket=ticket,
                user=request.user,
                message=message_text,
                is_internal=is_internal,
                attachments=attachments
            )
            
            # Update ticket status
            if request.user.role in ['ADMIN', 'SUPER_ADMIN']:
                ticket.status = SupportTicket.Status.WAITING_CUSTOMER
                if not ticket.first_response_at:
                    ticket.first_response_at = timezone.now()
            else:
                if ticket.status == SupportTicket.Status.WAITING_CUSTOMER:
                    ticket.status = SupportTicket.Status.IN_PROGRESS
            ticket.save()
            
            return Response(TicketMessageSerializer(message).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get support ticket statistics"""
        from django.db.models import Count, Avg
        from django.db.models.functions import TruncDate
        
        qs = self.get_queryset()
        
        by_status = qs.values('status').annotate(count=Count('id'))
        by_priority = qs.values('priority').annotate(count=Count('id'))
        by_category = qs.values('category').annotate(count=Count('id'))
        
        # Open tickets
        open_count = qs.filter(status__in=['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER']).count()
        
        return Response({
            'by_status': list(by_status),
            'by_priority': list(by_priority),
            'by_category': list(by_category),
            'open_count': open_count,
            'total': qs.count()
        })
