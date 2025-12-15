'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    subscription_tier: 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
    avatar?: string;
    phone_number?: string;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const userData = await api.getUser();
            setUser(userData);

            // Allow failing silently if no sub
            try {
                const subData = await api.getSubscription();
                setSubscription(subData);
            } catch (e) {
                setSubscription(null);
            }
        } catch (error) {
            setUser(null);
            setSubscription(null);
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
