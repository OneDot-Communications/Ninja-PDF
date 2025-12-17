'use client';

import React from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Role } from '@/types/auth'; // Using the types we defined

interface RBACGuardProps {
    children: React.ReactNode;

    // Role based check (OR logic: user has ANY of these roles)
    requiredRoles?: string[];

    // Feature based check (Future: check exact entitlements)
    requiredFeature?: string;

    // Fallback UI to show if permission denied (default: null)
    fallback?: React.ReactNode;
}

export const RBACGuard: React.FC<RBACGuardProps> = ({
    children,
    requiredRoles,
    requiredFeature,
    fallback = null
}) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null; // Or a spinner
    }

    if (!user) {
        return <>{fallback}</>;
    }

    // 1. Check Roles
    if (requiredRoles && requiredRoles.length > 0) {
        // Super Admin has access to everything by default? 
        // If strict role check is needed, we don't bypass. 
        // But usually Super Admin contains all Admin privs.

        // Normalize user role to string
        const userRole = user.role as string;

        if (!requiredRoles.includes(userRole)) {
            // Special case: If requesting ADMIN but user is SUPER_ADMIN
            if (requiredRoles.includes('ADMIN') && userRole === 'SUPER_ADMIN') {
                // Allow
            } else {
                return <>{fallback}</>;
            }
        }
    }

    // 2. Check Subscription/Feature (Mock logic for now, using user.subscription_tier)
    if (requiredFeature) {
        // Mapping feature codes to tiers (simplified for this component)
        // Ideally this logic should come from a hook `useEntitlement(feature)`

        const isFree = user.subscription_tier === 'FREE';
        const isPremium = ['PRO', 'PREMIUM', 'ENTERPRISE'].includes(user.subscription_tier);

        if (requiredFeature === 'BATCH_PROCESSING' && !isPremium) {
            return <>{fallback}</>;
        }
        if (requiredFeature === 'OCR' && !isPremium) {
            return <>{fallback}</>;
        }
        // Add more frontend feature mappings as needed
    }

    return <>{children}</>;
};

export default RBACGuard;
