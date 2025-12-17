// frontend/app/components/ui/SessionCard.tsx

"use client";

import React, { useState } from "react";
import { api } from "@/app/lib/api";

interface Session {
    id: number;
    ip_address: string;
    user_agent: string;
    device_fingerprint: string;
    created_at: string;
    last_active: string;
}

interface SessionCardProps {
    session: Session;
    onRevoke: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onRevoke }) => {
    const [revoking, setRevoking] = useState(false);

    const handleRevoke = async () => {
        setRevoking(true);
        try {
            await api.revokeSession(String(session.id));
            onRevoke();
        } catch (e) {
            console.error("Failed to revoke session", e);
        } finally {
            setRevoking(false);
        }
    };

    // Parse user agent to show simplified device info
    const getDeviceInfo = (ua: string) => {
        if (ua.includes("Windows")) return "Windows";
        if (ua.includes("Mac")) return "Mac";
        if (ua.includes("Linux")) return "Linux";
        if (ua.includes("iPhone")) return "iPhone";
        if (ua.includes("Android")) return "Android";
        return "Unknown Device";
    };

    return (
        <div className="p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg hover:border-indigo-500/50 transition-all duration-300">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-200">
                        {getDeviceInfo(session.user_agent)}
                    </p>
                    <p className="text-xs text-gray-400">
                        <span className="font-semibold">IP:</span> {session.ip_address}
                    </p>
                    <p className="text-xs text-gray-400">
                        <span className="font-semibold">Last Active:</span>{" "}
                        {new Date(session.last_active).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                        {session.device_fingerprint.substring(0, 16)}...
                    </p>
                </div>
                <button
                    onClick={handleRevoke}
                    disabled={revoking}
                    className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/50 rounded-md hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 disabled:opacity-50"
                >
                    {revoking ? "Revoking..." : "Revoke"}
                </button>
            </div>
        </div>
    );
};

export default SessionCard;
