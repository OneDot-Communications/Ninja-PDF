from apps.subscriptions.models.subscription import Plan, Feature

def create_initial_plans():
    # 1. Free Plan
    free, _ = Plan.objects.get_or_create(
        slug='free',
        defaults={
            'name': 'Free',
            'price': 0.00,
            'currency': 'USD',
            'interval': 'MONTHLY',
            'features': {
                'MERGE_PDF': True,
                'SPLIT_PDF': True,
                'COMPRESS_PDF': True,
                'CONVERT_PDF': True,
                'OCR': False,
                'ESIGN': False,
                'BATCH_PROCESSING': False
            },
            'is_active': True
        }
    )
    print(f"Plan Created/Verified: {free.name}")

    # 2. Pro Plan
    pro, _ = Plan.objects.get_or_create(
        slug='pro',
        defaults={
            'name': 'Pro',
            'price': 9.99,
            'currency': 'USD',
            'interval': 'MONTHLY',
            'stripe_price_id': 'price_pro_monthly_placeholder',
            'features': {
                'MERGE_PDF': True,
                'SPLIT_PDF': True,
                'COMPRESS_PDF': True,
                'CONVERT_PDF': True,
                'OCR': True,
                'ESIGN': True,
                'BATCH_PROCESSING': True,
                'PRIORITY_SUPPORT': False
            },
            'is_active': True
        }
    )
    print(f"Plan Created/Verified: {pro.name}")

    # 3. Enterprise Plan
    enterprise, _ = Plan.objects.get_or_create(
        slug='enterprise',
        defaults={
            'name': 'Enterprise',
            'price': 49.99,
            'currency': 'USD',
            'interval': 'YEARLY', 
            'stripe_price_id': 'price_enterprise_yearly_placeholder',
            'features': {
                'MERGE_PDF': True,
                'SPLIT_PDF': True,
                'COMPRESS_PDF': True,
                'CONVERT_PDF': True,
                'OCR': True,
                'ESIGN': True,
                'BATCH_PROCESSING': True,
                'PRIORITY_SUPPORT': True,
                'DEDICATED_ACCOUNT_MANAGER': True
            },
            'is_active': True
        }
    )
    print(f"Plan Created/Verified: {enterprise.name}")

    # 4. Custom / Contact Us Plan
    custom, _ = Plan.objects.get_or_create(
        slug='custom',
        defaults={
            'name': 'Custom',
            'price': 0.00, # Contact for pricing
            'currency': 'USD',
            'interval': 'YEARLY',
            'features': {
                'ALL_FEATURES': True,
                'DEDICATED_INFRASTRUCTURE': True,
                'SLA': True,
                'CUSTOM_INTEGRATIONS': True
            },
            'is_active': True
        }
    )
    print(f"Plan Created/Verified: {custom.name}")

if __name__ == '__main__':
    create_initial_plans()
