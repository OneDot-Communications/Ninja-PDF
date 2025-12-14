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
    verifyEmail: (key: string) => Promise<void>;
    googleLogin: (code: string) => Promise<void>;
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

    const googleLogin = async (code: string) => {
        try {
            const res = await api.googleLogin(code);
            console.debug("googleLogin: response", res);
        } catch (err) {
            console.error("googleLogin failed", err);
            throw err;
        }
        await refreshUser();
    };

    const logout = async () => {
        await api.logout();
        setUser(null);
    };

    const verifyEmail = async (key: string) => {
        await api.verifyEmail(key);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signup, login, logout, verifyEmail, googleLogin, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        if (typeof window !== 'undefined') {
            throw new Error("useAuth must be used within an AuthProvider");
        }
        return {
            user: null,
            loading: true,
            signup: async () => { },
            login: async () => { },
            logout: async () => { },
            verifyEmail: async () => { },
            googleLogin: async () => { },
            refreshUser: async () => null
        } as AuthContextProps;
    }
    return context;
};
