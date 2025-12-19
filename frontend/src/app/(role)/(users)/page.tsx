"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { ProfileCard } from "@/components/dashboard/profile/ProfileCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Ensure you have Badge or remove
import { Loader2, Mail, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function UserProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const userData = await api.getUser();
            setUser(userData);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
                    <p className="text-muted-foreground mt-1">Manage your personal information, privacy, and security.</p>
                </div>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 border-0">
                    Upgrade to Premium
                </Button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Main Info) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Profile Card */}
                    <ProfileCard user={user} onUpdate={fetchUser} />

                    {/* 2. Email Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email Address
                            </CardTitle>
                            <Link href="/profile/security" className="text-sm font-medium text-primary hover:underline">
                                Change
                            </Link>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-medium">{user?.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {user?.is_verified ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                Unverified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column (Socials & Status) */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">Subscription</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg bg-muted/50 p-4 border border-dashed">
                                <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold text-xs mb-1">Current Plan</p>
                                <p className="text-2xl font-bold text-foreground">Free Tier</p>
                                <p className="text-xs text-muted-foreground mt-2">Unlimited PDF merges (up to 5 files)</p>
                            </div>
                            <Button variant="outline" className="w-full mt-4" asChild>
                                <Link href="/profile/billing">Manage Subscription</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">Social Links</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">G</div>
                                    <div>
                                        <p className="text-sm font-medium">Google</p>
                                        <p className="text-xs text-muted-foreground">Not connected</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Connect</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
