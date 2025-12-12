// frontend/app/context/AuthContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/api";

interface User {
    id: number;
    email: string;
    is_verified: boolean;
    first_name?: string | null;
    last_name?: string | null;
    role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    // add any other fields you expose via the backend user serializer
}

interface AuthContextProps {
    user: User | null;
    loading: boolean;
    signup: (email: string, password: string, first_name?: string, last_name?: string) => Promise<any>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    verifyOtp: (email: string, otp: string) => Promise<void>;
    refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const refreshUser = async (): Promise<User | null> => {
        try {
            // Correct path: /api/auth/user/ as per backend authentication/urls.py
            const data = await api.getUser();
            console.debug("refreshUser: fetched user", data);
            setUser(data);
            return data;
        } catch (e) {
            console.warn("refreshUser: no user or failed fetch", e);
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const signup = async (email: string, password: string, first_name?: string, last_name?: string) => {
        // Return the API response so callers can inspect otp_sent etc.
        return await api.signup(email, password, first_name, last_name);
    };

    const login = async (email: string, password: string) => {
        try {
            const res = await api.login(email, password);
            console.debug("login: login response", res);
        } catch (err) {
            console.warn("login: login failed", err);
            throw err;
        }
        await refreshUser();
    };

    const logout = async () => {
        await api.logout();
        setUser(null);
    };

    const verifyOtp = async (email: string, otp: string) => {
        await api.verifyOtp(email, otp);
        // OTP verified - user is now marked is_verified=true in backend
        // User should now login with their credentials
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signup, login, logout, verifyOtp, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        // During server-side rendering, there may be no AuthProvider applied.
        // In that case, don't throw to allow prerendering; return a safe stub.
        if (typeof window !== 'undefined') {
            throw new Error("useAuth must be used within an AuthProvider");
        }
        return {
            user: null,
            loading: true,
            signup: async (_email?: string, _password?: string, _first_name?: string, _last_name?: string) => { },
            login: async (_email?: string, _password?: string) => { },
            logout: async () => { },
            verifyOtp: async () => { },
            refreshUser: async () => null
        } as AuthContextProps;
    }
    return context;
};
