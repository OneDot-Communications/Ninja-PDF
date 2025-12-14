from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from .quotas import QuotaManager

def check_quota(feature_code):
    """
    Decorator for API Views to enforce User/Guest quotas.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            # Locate Request object (Support both FBV and CBV)
            request = None
            for arg in args:
                if hasattr(arg, 'user') and hasattr(arg, 'META'):
                    request = arg
                    break
            
            if not request:
                # Fallback: Check kwargs? Or assume first arg is request if FBV
                if args and not hasattr(args[0], 'user'): # Likely self
                    if len(args) > 1: request = args[1]
                elif args:
                    request = args[0]
            
            if not request:
                 # Provide a safe fallback or error?
                 # If we can't find request, we can't check quota.
                 # Let's log error and fail open (allow access) or closed.
                 # Fail closed is safer for limits.
                 # But sticking to simple detection first.
                 return Response({"error": "Internal Error: Request not found"}, status=500)

            # 1. Authenticated User Check
            if request.user.is_authenticated:
                allowed = QuotaManager.check_user_quota(request.user, feature_code)
                if not allowed:
                    return Response(
                        {"error": f"Daily limit reached for {feature_code}. Upgrade to Pro for unlimited access."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # 2. Guest Check
            else:
                allowed = QuotaManager.check_guest_quota(request)
                if not allowed:
                    return Response(
                        {"error": "Guest limit reached. Please sign up to continue."},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # 3. Proceed
            return view_func(*args, **kwargs)
        return _wrapped_view
    return decorator
