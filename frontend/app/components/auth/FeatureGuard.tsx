'use client';

import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle } from 'lucide-react';

interface FeatureGuardProps {
    featureId?: string; // e.g. 'MERGE_PDF'
    premiumOnly?: boolean;
    requiredTier?: string; // e.g. 'PRO', 'PREMIUM', 'ENTERPRISE'
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function FeatureGuard({ featureId, premiumOnly, requiredTier, children, fallback }: FeatureGuardProps) {
    const { user, subscription, loading } = useAuth();
    const router = useRouter();

    if (loading) return <div className="animate-pulse h-10 w-full bg-secondary/20 rounded" />;

    // Strict OS State Check
    if (subscription) {
        if (subscription.status === 'SUSPENDED') {
            return (
                <div className="p-4 border border-destructive bg-destructive/10 rounded-lg text-center space-y-2">
                    <Lock className="w-8 h-8 mx-auto text-destructive" />
                    <h3 className="font-semibold text-destructive">Account Suspended</h3>
                    <p className="text-sm">Your subscription has been suspended due to payment failure.</p>
                    <Button variant="destructive" onClick={() => router.push('/pricing')}>Update Payment</Button>
                </div>
            );
        }
    }

    const isPremium = subscription?.status === 'ACTIVE' || user?.role === 'SUPER_ADMIN';

    // Grace Period Warning
    const isGracePeriod = subscription?.status === 'GRACE_PERIOD';

    if (premiumOnly && !isPremium && !isGracePeriod) {
        // If Grace Period, we allow access but show warning (handled below or via banner)
        // If not premium and not grace period -> Block
        if (fallback) return <>{fallback}</>;

        return (
            <div className="p-6 border border-primary/20 bg-primary/5 rounded-xl text-center space-y-4">
                <Lock className="w-10 h-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Premium Feature</h3>
                <p className="text-muted-foreground">Upgrade to 18+ PDF Premium to unlock this tool.</p>
                <Button onClick={() => router.push('/pricing')} className="w-full max-w-xs">
                    Upgrade Now
                </Button>
            </div>
        );
    }

    return <>{children}</>;
};
