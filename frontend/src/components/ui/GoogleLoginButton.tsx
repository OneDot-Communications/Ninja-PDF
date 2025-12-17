// frontend/app/components/GoogleLoginButton.tsx

"use client";

import React from "react";
import { api } from "@/lib/services/api";
import { useRouter } from "next/navigation";

const GoogleLoginButton = () => {
    const router = useRouter();

    const handleGoogleLogin = () => {
        try {
            // Navigate the top-level browser window to the backend OAuth start URL.
            // This allows the browser to follow the 302/redirect to Google's OAuth page
            // and avoids CORS/fetch limitations that can block the flow when using fetch.
            const url = api.startGoogleLogin();
            // Use location.assign to preserve history and allow user to go back.
            window.location.assign(url);
        } catch (e) {
            console.error("Google login failed:", e);
        }
    };

    return (
        <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 h-10"
        >
            <svg
                className="h-4 w-4"
                viewBox="0 0 533.5 544.3"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M533.5 278.4c0-17.9-1.6-35.2-4.6-52.1H272v98.6h146.9c-6.4 34.5-25.6 63.7-54.5 83.2v68h88.1c51.5-47.5 81.1-117.5 81.1-197.7z"
                    fill="#4285F4"
                />
                <path
                    d="M272 544.3c73.5 0 135.2-24.4 180.3-66.3l-88.1-68c-24.5 16.5-55.9 26.1-92.2 26.1-70.9 0-131-47.9-152.5-112.2h-90.5v70.5c45.2 89.5 138.5 149.9 242.9 149.9z"
                    fill="#34A853"
                />
                <path
                    d="M119.5 324.9c-10.4-30.9-10.4-64.4 0-95.3v-70.5h-90.5c-37.5 73.5-37.5 159.3 0 232.8l90.5-67z"
                    fill="#FBBC05"
                />
                <path
                    d="M272 107.7c39.9-.6 78.3 14.7 107.2 42.5l80.2-80.2C408.5 22.4 341.9-1.2 272 0 167.6 0 74.3 60.4 29.1 149.9l90.5 67c21.5-64.3 81.6-112.2 152.4-112.2z"
                    fill="#EA4335"
                />
            </svg>
            Sign in with Google
        </button>
    );
};

export default GoogleLoginButton;
