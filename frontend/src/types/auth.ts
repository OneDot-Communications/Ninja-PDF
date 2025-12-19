export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER'
}

export enum SubscriptionTier {
    FREE = 'FREE',
    PRO = 'PRO',
    PREMIUM = 'PREMIUM',
    ENTERPRISE = 'ENTERPRISE'
}

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: Role;
    subscription_tier: SubscriptionTier;
    avatar?: string;
    is_verified: boolean;
    phone_number?: string;
    country?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}
