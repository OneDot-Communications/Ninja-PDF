'use client';

import React from 'react';
import { HistoryTable } from './history-table';
import { FeatureGuard } from '@/app/components/auth/FeatureGuard';
import { useAuth } from '@/app/context/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="container mx-auto py-10 px-4">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-2">
                    Welcome back, {user?.first_name || 'Guest'}.
                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {user?.subscription_tier || 'FREE'} Plan
                    </span>
                </p>
            </header>

            <div className="grid gap-8 md:grid-cols-1">
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Conversions</h2>
                    </div>
                    <HistoryTable />
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Premium Tools</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Demo of Feature Guard */}
                        <FeatureGuard requiredTier="PRO" fallback={
                            <div className="p-6 border rounded-xl bg-gray-50 text-gray-400">
                                Unlock <span className="font-bold">Team Folders</span> by upgrading to Pro.
                            </div>
                        }>
                            <div className="p-6 border rounded-xl bg-white shadow-sm">
                                <h3 className="font-bold text-gray-900">Team Folders</h3>
                                <p className="text-sm text-gray-500">Access shared workspace files.</p>
                            </div>
                        </FeatureGuard>
                    </div>
                </section>
            </div>
        </div>
    );
}
