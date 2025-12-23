from django.conf import settings
from datetime import timedelta
import os


def set_auth_cookies(response, access_token: str, refresh_token: str, request=None):
    # Set secure cookie for access token
    response.set_cookie(
        key='access-token',
        value=access_token,
        httponly=True,
        samesite='None',  # Ensure the cookie is sent for all cross-site requests
        secure=True,
        max_age=1 * 24 * 60 * 60  # 1 day expiration
    )
    # Set secure cookie for refresh token
    response.set_cookie(
        key='refresh-token',
        value=refresh_token,
        httponly=True,
        samesite='None',  # Ensure the cookie is sent for all cross-site requests
        secure=True,
        max_age=7 * 24 * 60 * 60  # 7 days expiration
    )


def clear_auth_cookies(response):
    # Overwrite cookies to expire them
    response.delete_cookie('access-token', path='/')
    response.delete_cookie('refresh-token', path='/')

