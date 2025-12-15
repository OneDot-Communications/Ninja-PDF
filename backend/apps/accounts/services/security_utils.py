import hashlib

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def get_device_fingerprint(request):
    """
    Generates a secure hash of the IP and User-Agent.
    In a real 'Google-Level' app, you'd add more signals (Screen Res, Timezone, etc. sent from frontend).
    """
    ip = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # We salt it to be safe
    raw_string = f"{ip}|{user_agent}|ninja-salt-v1"
    return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
