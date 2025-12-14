from rest_framework import serializers
from .models import SystemSetting, PlatformBranding, AdminActionRequest, ContentVersion

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'

class PlatformBrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformBranding
        fields = '__all__'

class AdminActionRequestSerializer(serializers.ModelSerializer):
    requester_email = serializers.ReadOnlyField(source='requester.email')
    reviewer_email = serializers.ReadOnlyField(source='reviewer.email')
    
    rich_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminActionRequest
        fields = '__all__'

    def get_rich_preview(self, obj):
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            payload = obj.payload
            
            if obj.action_type == 'CHANGE_USER_PLAN':
                from billing.models import Plan
                user_id = payload.get('user_id')
                plan_slug = payload.get('plan_slug')
                
                user = User.objects.filter(id=user_id).first()
                plan = Plan.objects.filter(slug=plan_slug).first()
                
                return {
                    'target_user': f"{user.first_name} {user.last_name} ({user.email})" if user else f"User ID: {user_id}",
                    'target_user_email': user.email if user else None,
                    'action_detail': f"Change plan to {plan.name if plan else plan_slug.upper()}",
                    'plan_slug': plan_slug,
                }
            
            elif obj.action_type == 'CHANGE_ROLE':
                user_id = payload.get('user_id')
                new_role = payload.get('new_role')
                user = User.objects.filter(id=user_id).first()
                
                return {
                    'target_user': f"{user.first_name} {user.last_name} ({user.email})" if user else f"User ID: {user_id}",
                     'target_user_email': user.email if user else None,
                    'action_detail': f"Change role to {new_role}",
                }
                
        except Exception as e:
            return {'error': str(e)}
        return {}

class ContentVersionSerializer(serializers.ModelSerializer):
    created_by_email = serializers.ReadOnlyField(source='created_by.email')
    class Meta:
        model = ContentVersion
        fields = '__all__'
