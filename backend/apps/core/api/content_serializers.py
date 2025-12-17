"""Content Management API - FAQs, Tutorials, Announcements, Support Tickets"""
from rest_framework import serializers
from apps.core.models.content import (
    ContentCategory, FAQArticle, Tutorial, Announcement,
    AnnouncementDismissal, SupportTicket, TicketMessage
)


class ContentCategorySerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'order', 'is_active', 'parent', 'children_count']
        read_only_fields = ['id', 'slug']
    
    def get_children_count(self, obj):
        return obj.children.count()


class FAQArticleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    helpfulness_score = serializers.SerializerMethodField()
    
    class Meta:
        model = FAQArticle
        fields = [
            'id', 'title', 'slug', 'question', 'answer',
            'category', 'category_name', 'tags',
            'meta_title', 'meta_description',
            'status', 'order', 'is_featured',
            'view_count', 'helpful_count', 'not_helpful_count', 'helpfulness_score',
            'created_by', 'created_by_email', 'updated_by',
            'created_at', 'updated_at', 'published_at'
        ]
        read_only_fields = ['id', 'slug', 'view_count', 'helpful_count', 'not_helpful_count', 'created_at', 'updated_at', 'published_at']
    
    def get_helpfulness_score(self, obj):
        total = obj.helpful_count + obj.not_helpful_count
        if total == 0:
            return None
        return round((obj.helpful_count / total) * 100, 1)


class TutorialSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = Tutorial
        fields = [
            'id', 'title', 'slug', 'summary', 'content',
            'category', 'category_name', 'tags',
            'featured_image', 'video_url',
            'difficulty', 'estimated_time_minutes', 'related_tools',
            'meta_title', 'meta_description',
            'status', 'order', 'is_featured',
            'view_count', 'completion_count',
            'created_by', 'created_by_email', 'updated_by',
            'created_at', 'updated_at', 'published_at'
        ]
        read_only_fields = ['id', 'slug', 'view_count', 'completion_count', 'created_at', 'updated_at', 'published_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    is_currently_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content',
            'announcement_type', 'display_location',
            'target_roles', 'target_plans', 'target_countries',
            'link_text', 'link_url',
            'start_date', 'end_date',
            'is_dismissible', 'show_once_per_session', 'priority',
            'is_active', 'is_currently_active',
            'view_count', 'dismiss_count', 'click_count',
            'created_by', 'created_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'view_count', 'dismiss_count', 'click_count', 'created_at', 'updated_at']


class SupportTicketSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    messages_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'subject', 'description',
            'user', 'user_email',
            'status', 'priority', 'category',
            'assigned_to', 'assigned_to_email',
            'is_priority',
            'first_response_at', 'resolved_at',
            'related_job', 'related_invoice',
            'attachments', 'messages_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'ticket_number', 'user', 'first_response_at', 'resolved_at', 'created_at', 'updated_at']
    
    def get_messages_count(self, obj):
        return obj.messages.count()


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['subject', 'description', 'category', 'attachments']


class TicketMessageSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketMessage
        fields = [
            'id', 'ticket', 'user', 'user_email', 'user_name', 'is_staff',
            'message', 'is_internal', 'attachments', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_is_staff(self, obj):
        return obj.user.role in ['ADMIN', 'SUPER_ADMIN']
