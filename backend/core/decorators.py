"""
View Decorators
Quota enforcement, authentication, and permission decorators for API views.
"""
from django.http import JsonResponse
from functools import wraps
import logging

logger = logging.getLogger(__name__)


def get_request_from_args(args):
    """Extract request object from view args."""
    if args and hasattr(args[0], 'request'):
        return args[0].request
    elif args and hasattr(args[0], 'method'):
        return args[0]
    return None


def check_quota(feature: str = 'job'):
    """
    Decorator to enforce quota before executing view.
    
    Usage:
        @check_quota('job')
        def my_view(request): ...
        
        class MyView(APIView):
            @check_quota('ai')
            def post(self, request): ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            request = get_request_from_args(args)
            
            if not request:
                return view_func(*args, **kwargs)
            
            user = getattr(request, 'user', None)
            
            if not user or not user.is_authenticated:
                session_id = request.session.session_key or 'anon'
                from core.quotas import QuotaManager
                allowed, current, limit = QuotaManager.check_guest_quota(session_id, feature)
                
                if not allowed:
                    logger.warning(f"Quota:GUEST:EXCEEDED session={session_id} feature={feature}")
                    return JsonResponse({
                        'error': 'quota_exceeded',
                        'message': f'Guest limit reached for {feature}. Please sign up for more.',
                        'current': current,
                        'limit': limit,
                    }, status=429)
            else:
                from core.quotas import QuotaManager
                allowed, current, limit = QuotaManager.check_user_quota(user, feature)
                
                if not allowed:
                    logger.warning(f"Quota:USER:EXCEEDED user={user.id} feature={feature}")
                    return JsonResponse({
                        'error': 'quota_exceeded',
                        'message': f'Daily limit reached for {feature}. Please upgrade for more.',
                        'current': current,
                        'limit': limit,
                    }, status=429)
            
            return view_func(*args, **kwargs)
        
        return wrapper
    return decorator


def check_rate_limit(action: str = 'request'):
    """
    Decorator to enforce rate limiting.
    
    Usage:
        @check_rate_limit('api')
        def my_view(request): ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            request = get_request_from_args(args)
            
            if not request:
                return view_func(*args, **kwargs)
            
            user = getattr(request, 'user', None)
            
            from core.quotas import RateLimiter
            allowed, retry_after = RateLimiter.check_request_rate(user, action)
            
            if not allowed:
                logger.warning(f"RateLimit:EXCEEDED user={getattr(user, 'id', 'anon')} action={action}")
                response = JsonResponse({
                    'error': 'rate_limit_exceeded',
                    'message': 'Too many requests. Please try again later.',
                    'retry_after': retry_after,
                }, status=429)
                response['Retry-After'] = str(retry_after)
                return response
            
            return view_func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_premium(view_func):
    """
    Decorator to require premium subscription.
    
    Usage:
        @require_premium
        def my_view(request): ...
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        request = get_request_from_args(args)
        
        if not request:
            return view_func(*args, **kwargs)
        
        user = getattr(request, 'user', None)
        
        if not user or not user.is_authenticated:
            return JsonResponse({
                'error': 'authentication_required',
                'message': 'Please sign in to access this feature.',
            }, status=401)
        
        from core.user_context import UserContextResolver
        context = UserContextResolver.resolve(user)
        
        if not context['can_use_premium']:
            return JsonResponse({
                'error': 'premium_required',
                'message': 'This feature requires a premium subscription.',
                'upgrade_url': '/pricing',
            }, status=403)
        
        return view_func(*args, **kwargs)
    
    return wrapper


def require_ai_access(view_func):
    """
    Decorator to require AI feature access with quota check.
    
    Usage:
        @require_ai_access
        def my_ai_view(request): ...
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        request = get_request_from_args(args)
        
        if not request:
            return view_func(*args, **kwargs)
        
        user = getattr(request, 'user', None)
        
        if not user or not user.is_authenticated:
            return JsonResponse({
                'error': 'authentication_required',
                'message': 'Please sign in to access AI features.',
            }, status=401)
        
        from core.user_context import UserContextResolver
        context = UserContextResolver.resolve(user)
        
        if not context['can_use_ai']:
            return JsonResponse({
                'error': 'ai_not_available',
                'message': 'AI features require a premium subscription.',
            }, status=403)
        
        from core.scale_control import ScaleController
        allowed, remaining = ScaleController.check_ai_quota(user)
        
        if not allowed:
            return JsonResponse({
                'error': 'ai_quota_exceeded',
                'message': 'Monthly AI quota exhausted. Resets on the 1st.',
                'remaining': remaining,
            }, status=429)
        
        return view_func(*args, **kwargs)
    
    return wrapper


def require_file_access(view_func):
    """
    Decorator to check file access permission.
    Expects file_id in kwargs.
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        request = get_request_from_args(args)
        
        if not request:
            return view_func(*args, **kwargs)
        
        user = getattr(request, 'user', None)
        file_id = kwargs.get('file_id') or kwargs.get('pk')
        
        if not file_id:
            return view_func(*args, **kwargs)
        
        from apps.files.models.user_file import UserFile
        
        try:
            file_asset = UserFile.objects.get(id=file_id)
        except UserFile.DoesNotExist:
            return JsonResponse({
                'error': 'not_found',
                'message': 'File not found.',
            }, status=404)
        
        from core.security import AccessControl
        
        if not AccessControl.can_access_file(user, file_asset):
            return JsonResponse({
                'error': 'access_denied',
                'message': 'You do not have access to this file.',
            }, status=403)
        
        kwargs['file_asset'] = file_asset
        
        return view_func(*args, **kwargs)
    
    return wrapper


def track_feature_usage(feature: str):
    """
    Decorator to track feature usage for analytics.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            result = view_func(*args, **kwargs)
            
            try:
                request = get_request_from_args(args)
                if request:
                    user = getattr(request, 'user', None)
                    if user and user.is_authenticated:
                        from core.quotas import QuotaManager
                        QuotaManager.track_feature_usage(user, feature)
            except Exception as e:
                logger.error(f"Usage tracking failed: {e}")
            
            return result
        
        return wrapper
    return decorator
