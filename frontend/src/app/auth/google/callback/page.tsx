// frontend/app/auth/google/callback/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/services/api';
import { useAuth } from '@/lib/context/AuthContext';

import { Suspense } from "react";

const GoogleCallbackContent = () => {
    const router = useRouter();

    const searchParams = useSearchParams();
    const { refreshUser, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [needName, setNeedName] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        const doExchange = async () => {
            try {
                const params = new URLSearchParams(searchParams?.toString() || '');
                const code = params.get('code');
                if (code) {
                    // Exchange the provider code for a backend session/JWT via token endpoint
                    await api.request('POST', '/api/auth/google/token/', { code });
                }
                // Refresh user and redirect to dashboard
                await refreshUser();
                router.replace('/dashboard');
            } catch (e) {
                console.error('Google callback exchange failed', e);
                router.replace('/login');
            } finally {
                setLoading(false);
            }
        };
        doExchange();
    }, [searchParams, refreshUser, router]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Processing Google login...</div>;
    }

    if (needName) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-full max-w-md p-6 bg-white rounded shadow">
                    <h2 className="text-xl font-semibold mb-4">Complete your profile</h2>
                    {formError && <div className="mb-2 text-red-600">{formError}</div>}
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setFormError(null);
                        setSubmitting(true);
                        try {
                            await api.updateCurrentUser({ first_name: firstName, last_name: lastName });
                            await refreshUser();
                            router.replace('/dashboard');
                        } catch (err: any) {
                            setFormError(err.message || 'Failed to update profile');
                        } finally {
                            setSubmitting(false);
                        }
                    }}>
                        <div className="space-y-2 mb-3">
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded border p-2" />
                        </div>
                        <div className="space-y-2 mb-4">
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded border p-2" />
                        </div>
                        <div className="flex justify-end">
                            <button disabled={submitting} type="submit" className="bg-[#E53935] hover:bg-[#D32F2F] text-white px-4 py-2 rounded">
                                {submitting ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return <div className="flex items-center justify-center min-h-screen">Processing Google login...</div>;
};

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <GoogleCallbackContent />
        </Suspense>
    );
}

