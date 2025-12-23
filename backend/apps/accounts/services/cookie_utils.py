from django.conf import settings
from datetime import timedelta


def cookie_settings():
    secure = not settings.DEBUG and getattr(settings, 'SECURE_SSL_REDIRECT', False)
    samesite = getattr(settings, 'JWT_COOKIE_SAMESITE', 'None')
    return {'secure': secure, 'samesite': samesite}


def set_auth_cookies(response, access_token: str, refresh_token: str, request=None):
    opts = cookie_settings()
    # Access token: short-lived
    response.set_cookie(
        'access-token',
        access_token,
        httponly=True,
        secure=opts['secure'],
        samesite=opts['samesite'],
        path='/'
    )
    # Refresh token: longer
    response.set_cookie(
        'refresh-token',
        refresh_token,
        httponly=True,
        secure=opts['secure'],
        samesite=opts['samesite'],
        path='/'
    )


def clear_auth_cookies(response):
    # Overwrite cookies to expire them
    response.delete_cookie('access-token', path='/')
    response.delete_cookie('refresh-token', path='/')
