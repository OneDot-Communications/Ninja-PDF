import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access-token');
    const path = request.nextUrl.pathname;

    // 1. Protected Admin Routes
    if (path.startsWith('/admin') || path.startsWith('/super-admin')) {
        if (!token) {
            const url = new URL('/auth/login', request.url);
            url.searchParams.set('redirect', path);
            return NextResponse.redirect(url);
        }
        // Note: Strict Role checks (e.g. is this user actually an admin?) 
        // without JWT verification library (jose) in Edge Runtime is limited.
        // We rely on the client-side AdminGuard or API to reject 403 request 
        // if the token is valid but role is insufficient.
    }

    // 2. Dashboard Protection
    if (path.startsWith('/dashboard')) {
        if (!token) {
            const url = new URL('/auth/login', request.url);
            url.searchParams.set('redirect', path);
            return NextResponse.redirect(url);
        }
    }

    // 3. Auth Routes (Redirect to dashboard if already logged in)
    if (path.startsWith('/auth/login') || path.startsWith('/auth/signup')) {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/super-admin/:path*',
        '/dashboard/:path*',
        '/auth/:path*',
    ],
};
