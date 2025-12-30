'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/services/api';

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    subscription_tier: 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
    avatar?: string;
    phone_number?: string;
    country?: string;
    is_verified: boolean;
    date_joined: string;
    storage_used?: number;
    storage_limit?: number;
}

export interface Subscription {
    status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'PENDING_PAYMENT' | 'GRACE_PERIOD' | 'SUSPENDED' | 'FREE';
    plan?: { name: string; slug: string; };
    current_period_end: string;
}

interface AuthContextType {
    user: User | null;
    subscription: Subscription | null;
    isLoading: boolean;
    loading: boolean; // Alias for compatibility
    // Returns `{ requires_2fa: true }` if backend requires OTP; otherwise resolves when logged in
    login: (email: string, password: string, otp_token?: string) => Promise<any>;
    signup: (email: string, password: string, confirmPassword?: string, first_name?: string, last_name?: string, referral_code?: string) => Promise<void>;
    googleLogin: (code: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage keys for instant render
const USER_CACHE_KEY = 'ninja_pdf_user';
const SUB_CACHE_KEY = 'ninja_pdf_subscription';

// Helper to safely access localStorage (SSR-safe)
function getFromCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

function setCache(key: string, value: any) {
    if (typeof window === 'undefined') return;
    try {
        if (value) {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.removeItem(key);
        }
    } catch { /* ignore */ }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Initialize from cache for instant render - shows user immediately
    const [user, setUser] = useState<User | null>(() => getFromCache<User>(USER_CACHE_KEY));
    const [subscription, setSubscription] = useState<Subscription | null>(() => getFromCache<Subscription>(SUB_CACHE_KEY));
    const [isLoading, setIsLoading] = useState(!getFromCache<User>(USER_CACHE_KEY)); // Only loading if no cache

    const refreshUser = async () => {
        try {
            // Parallelize user and subscription fetch for faster load
            const [userResult, subResult] = await Promise.allSettled([
                api.getUser(),
                api.getSubscription()
            ]);

            if (userResult.status === 'fulfilled') {
                setUser(userResult.value);
                setCache(USER_CACHE_KEY, userResult.value);
            } else {
                setUser(null);
                setCache(USER_CACHE_KEY, null);
                throw userResult.reason;
            }

            // Allow subscription to fail silently
            if (subResult.status === 'fulfilled') {
                setSubscription(subResult.value);
                setCache(SUB_CACHE_KEY, subResult.value);
            } else {
                setSubscription(null);
                setCache(SUB_CACHE_KEY, null);
            }
        } catch (error) {
            setUser(null);
            setSubscription(null);
            setCache(USER_CACHE_KEY, null);
            setCache(SUB_CACHE_KEY, null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = async (email: string, password: string, otp_token?: string) => {
        setIsLoading(true);
        try {
            const res = await api.login(email, password, otp_token);
            // If backend indicates 2FA is required, propagate that to the caller
            if (res && (res as any).requires_2fa) {
                setIsLoading(false);
                return { requires_2fa: true };
            }

            await refreshUser();
        } catch (e) {
            setIsLoading(false);
            throw e;
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await api.logout();
            setUser(null);
            setSubscription(null);
            setCache(USER_CACHE_KEY, null);
            setCache(SUB_CACHE_KEY, null);
        } finally {
            setIsLoading(false);
        }
    };

    const googleLogin = async (code: string) => {
        setIsLoading(true);
        try {
            // Exchange code with backend
            await api.googleLogin(code);
            await refreshUser();
        } catch (e) {
            setIsLoading(false);
            throw e;
        }
    };

    const signup = async (email: string, password: string, confirmPassword?: string, first_name?: string, last_name?: string, referral_code?: string) => {
        setIsLoading(true);
        try {
            await api.signup(email, password, confirmPassword, first_name, last_name, referral_code);
            // Don't auto-login if email verification is required
            // For now assume verification required
        } catch (e) {
            setIsLoading(false);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            subscription,
            isLoading,
            loading: isLoading, // Alias
            login,
            signup,
            googleLogin,
            logout,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
