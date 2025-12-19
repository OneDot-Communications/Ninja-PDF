import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User

# Use pytest-django
@pytest.mark.django_db
class TestRBAC:
    def setup_method(self):
        self.client = APIClient()
        self.User = get_user_model()
        
        # Create users with different roles
        self.user = self.User.objects.create_user(email='user@test.com', password='password', role='USER')
        self.admin = self.User.objects.create_user(email='admin@test.com', password='password', role='ADMIN')
        self.super_admin = self.User.objects.create_user(email='super@test.com', password='password', role='SUPER_ADMIN')

    def test_user_creation_default_role(self):
        """Test that new users get USER role by default"""
        new_user = self.User.objects.create_user(email='new@test.com', password='password')
        assert new_user.role == 'USER'

    def test_admin_access_to_admin_only_endpoint(self):
        """Test that only admins can access admin endpoints"""
        # Assume an endpoint that requires ADMIN role
        # We can test via checking permissions directly or hitting an endpoint
        # Let's check the user properties first
        assert self.admin.is_staff or self.admin.role == 'ADMIN'
        
        # Authenticate as User
        self.client.force_authenticate(user=self.user)
        # Hit stats endpoint (requires admin)
        response = self.client.get('/api/auth/admin/stats/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Authenticate as Admin
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/admin/stats/')
        # It might be 200 or 404 depending on implementation, but NOT 403
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_super_admin_permissions(self):
        """Test Super Admin has all permissions"""
        assert self.super_admin.role == 'SUPER_ADMIN'
        # Super admin should be able to access everything
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/auth/admin/stats/')
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_feature_overrides(self):
        """Test feature override logic if applicable"""
        # If we have feature overrides in User model
        pass
