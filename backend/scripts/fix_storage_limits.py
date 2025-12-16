from apps.subscriptions.models import Plan
from django.contrib.auth import get_user_model

def run():
    print("Starting Storage Limit Fix...")
    
    updates = {
        'free': 100 * 1024 * 1024,          # 100 MB
        'pro': 500 * 1024 * 1024,           # 500 MB
        'premium': 2 * 1024 * 1024 * 1024,  # 2 GB
        'enterprise': 10 * 1024 * 1024 * 1024, # 10 GB
    } # Removed Custom as it might vary, but for now let's set it to Enterprise level or leave as is. 
    # Actually, the DB inspector showed only 4 plans. 'Custom' was one of them.
    
    for slug, limit in updates.items():
        count = Plan.objects.filter(slug__iexact=slug).update(storage_limit=limit)
        print(f"Updated '{slug}' to {limit} bytes. Rows affected: {count}")
        
    print("\n--- VERIFICATION ---")
    for p in Plan.objects.all():
        print(f"Plan: {p.name} ({p.slug}) -> Limit: {p.storage_limit / (1024*1024):.2f} MB")
        
    User = get_user_model()
    # Find a PRO user to verify
    pro_user = User.objects.filter(subscription_tier='PRO').first()
    if pro_user:
        print(f"\nFound PRO User: {pro_user.email}")
        if hasattr(pro_user, 'subscription'):
             print(f"User Sub Plan: {pro_user.subscription.plan.name}")
             print(f"User Sub Limit: {pro_user.subscription.plan.storage_limit / (1024*1024):.2f} MB")
        else:
             print("User has no subscription object.")
    else:
        print("\nNo PRO user found to verify.")

run()
