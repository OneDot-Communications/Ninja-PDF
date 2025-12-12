from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from unittest.mock import patch

User = get_user_model()


class UserProfileTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(email='test1@example.com', password='password123')
		self.client = APIClient()

	def test_user_details_include_and_update_name(self):
		# Force authenticate as the created user
		self.client.force_authenticate(user=self.user)

		url = reverse('user_details')
		resp = self.client.get(url)
		self.assertEqual(resp.status_code, 200)
		# Initially first_name should be empty or not set
		self.assertIn('first_name', resp.data)
		self.assertIn('last_name', resp.data)

		# Update the name
		data = {'first_name': 'Alice', 'last_name': 'Wonderland'}
		resp2 = self.client.patch(url, data, format='json')
		self.assertEqual(resp2.status_code, 200)
		self.user.refresh_from_db()
		self.assertEqual(self.user.first_name, 'Alice')
		self.assertEqual(self.user.last_name, 'Wonderland')


class SignupTests(APITestCase):
	def test_signup_with_name_saves_first_and_last_name(self):
		url = reverse('signup')
		payload = {
			'email': 'bob@example.com',
			'password': 'password123',
			'first_name': 'Bob',
			'last_name': 'Builder'
		}
		resp = self.client.post(url, payload, format='json')
		self.assertEqual(resp.status_code, 201)
		# User created in DB
		user = User.objects.get(email='bob@example.com')
		self.assertEqual(user.first_name, 'Bob')
		self.assertEqual(user.last_name, 'Builder')

	def test_signup_handles_smtp_failure_and_returns_flag(self):
		url = reverse('signup')
		payload = {
			'email': 'no-send@example.com',
			'password': 'password123',
			'first_name': 'No',
			'last_name': 'Send'
		}
		# Patch the email service to simulate failure
		with patch('emails.services.send_otp_email', return_value=False) as mocked_send:
			resp = self.client.post(url, payload, format='json')
			self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
			self.assertIn('otp_sent', resp.data)
			self.assertFalse(resp.data['otp_sent'])
