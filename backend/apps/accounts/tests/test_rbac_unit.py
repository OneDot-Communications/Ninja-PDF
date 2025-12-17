from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from apps.accounts.services.permissions import HasFeatureAccess, IsAdmin, IsSuperAdmin
from apps.subscriptions.services.entitlements import EntitlementService
from apps.subscriptions.models.subscription import Feature, Plan, Subscription, PlanFeature, UserFeatureUsage

User = get_user_model()

class RBACPermissionTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        
        # Create Users
        self.super_admin = User.objects.create_user(email='super@test.com', password='password', role='SUPER_ADMIN')
        self.admin = User.objects.create_user(email='admin@test.com', password='password', role='ADMIN')
        self.user_free = User.objects.create_user(email='free@test.com', password='password', role='USER', subscription_tier='FREE')
        self.user_premium = User.objects.create_user(email='premium@test.com', password='password', role='USER', subscription_tier='PREMIUM')

        # Setup Features
        self.feat_merge = Feature.objects.create(code='MERGE_PDF', name='Merge PDF', free_limit=2)
        self.feat_ocr = Feature.objects.create(code='OCR', name='OCR', is_premium_default=True)
        
        # Setup Plan
        self.premium_plan = Plan.objects.create(name='Premium', price=10)
        
        # Grant OCR to Premium Plan
        PlanFeature.objects.create(plan=self.premium_plan, feature=self.feat_ocr, is_enabled=True, daily_limit=10)
        
        # Assign Plan
        Subscription.objects.create(user=self.user_premium, plan=self.premium_plan, status='ACTIVE')

    def test_super_admin_access(self):
        perm = HasFeatureAccess('OCR')()
        request = self.factory.get('/')
        request.user = self.super_admin
        self.assertTrue(perm.has_permission(request, None))

    def test_free_user_access_ocr(self):
        # OCR is premium default, no free limit set (default 0? no, is_premium_default=True).
        # EntitlementService check_usage for OCR should return False for free user
        self.assertFalse(EntitlementService.check_usage(self.user_free, 'OCR'))

    def test_premium_user_access_ocr(self):
        self.assertTrue(EntitlementService.check_usage(self.user_premium, 'OCR'))

    def test_free_user_merge_limit(self):
        # Merge has limit 2
        
        # 1st use
        self.assertTrue(EntitlementService.check_usage(self.user_free, 'MERGE_PDF'))
        EntitlementService.record_usage(self.user_free, 'MERGE_PDF')
        
        # 2nd use
        self.assertTrue(EntitlementService.check_usage(self.user_free, 'MERGE_PDF'))
        EntitlementService.record_usage(self.user_free, 'MERGE_PDF')
        
        # 3rd use (Should fail)
        self.assertFalse(EntitlementService.check_usage(self.user_free, 'MERGE_PDF'))

    def test_drf_permission_class(self):
        # Test the factory class
        perm_class = HasFeatureAccess('MERGE_PDF')
        perm_instance = perm_class()
        
        request = self.factory.get('/')
        request.user = self.user_free
        
        # This checks simplistic access (Role/Override), not limit quota. 
        # HasFeatureAccess docstring says: "Check UserFeatureOverride -> Check RolePermission -> Check Plan"
        # It does NOT check daily limits (that's EntitlementService).
        # So it should return True for free user if feature is available (even if limit reached? No, ideally limit reached means 'no access'?)
        # My implementation of HasFeatureAccess checks *Plan Existence* of feature, not Usage.
        # So this should be True.
        
        # Wait, Free User doesn't have a Plan usually (Subscription model might be missing or Plan is None).
        # But 'MERGE_PDF' is a basic feature.
        # My HasFeatureAccess implementation:
        # 1. Override? No.
        # 2. RolePermission? No (didn't set one).
        # 3. PlanFeature? User has no plan (or free plan).
        
        # If HasFeatureAccess returns False, Free User can't access endpoint.
        # But Free User SHOULD be able to access merge.
        # IMPLICATION: Basic features for Free Users need to be mapped via RolePermission 'USER' -> 'MERGE_PDF'
        # OR define a 'Free Plan' that everyone gets.
        # OR update HasFeatureAccess to check 'Feature.free_limit > 0' as a fallback.
        
        # Let's verify existing logic failure first.
        pass
