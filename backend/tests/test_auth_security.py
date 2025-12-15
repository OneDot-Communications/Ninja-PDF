from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.accounts.models.audit import AuthAuditLog
from django.core.cache import cache

User = get_user_model()


class AuthSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='test@example.com', password='testpass')

    def test_successful_login_sets_cookies_and_audit(self):
        url = reverse('login')
        resp = self.client.post(url, {'email': 'test@example.com', 'password': 'testpass'})
        self.assertEqual(resp.status_code, 200)
        # cookies should be present
        self.assertIn('access-token', resp.cookies)
        self.assertIn('refresh-token', resp.cookies)
        # audit log
        self.assertTrue(AuthAuditLog.objects.filter(user=self.user, event_type='successful_login').exists())

    def test_logout_clears_cookies_and_logs(self):
        # login first
        url = reverse('login')
        resp = self.client.post(url, {'email': 'test@example.com', 'password': 'testpass'})
        self.assertEqual(resp.status_code, 200)
        # call logout
        url_logout = reverse('logout')
        resp2 = self.client.post(url_logout)
        self.assertEqual(resp2.status_code, 200)
        # cookies should be removed (deleted)
        self.assertNotIn('access-token', resp2.cookies)
        # audit log
        self.assertTrue(AuthAuditLog.objects.filter(user=self.user, event_type='logout').exists())

    def test_failed_login_increments_counter_and_locks(self):
        url = reverse('login')
        for i in range(10):
            resp = self.client.post(url, {'email': 'test@example.com', 'password': 'wrong'})
            self.assertNotEqual(resp.status_code, 200)
        # now account should be locked
        resp = self.client.post(url, {'email': 'test@example.com', 'password': 'testpass'})
        self.assertEqual(resp.status_code, 423)
        self.assertTrue('account_locked' in resp.json().get('error', {}).get('code', ''))

    def test_disable_2fa_logs_event(self):
        # create a confirmed TOTP device for user
        from django_otp.plugins.otp_totp.models import TOTPDevice
        device = TOTPDevice.objects.create(user=self.user, confirmed=True)
        # login via API to obtain cookies
        login_url = reverse('login')
        resp_login = self.client.post(login_url, {'email': 'test@example.com', 'password': 'testpass'})
        self.assertEqual(resp_login.status_code, 200)
        url = reverse('2fa-disable')
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(AuthAuditLog.objects.filter(user=self.user, event_type='disable_2fa').exists())
