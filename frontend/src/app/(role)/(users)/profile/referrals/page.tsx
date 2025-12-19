"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Copy, Loader2, Users, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";

export default function ReferralsPage() {
    const { user } = useAuth();
    // Generate a unique-ish referral code from user ID or name
    const referralCode = user ? `REF-${user.id}-${(user.first_name || 'user').toUpperCase().substring(0, 3)}` : "LOADING...";
    const referralLink = typeof window !== 'undefined' ? `${window.location.host}/register?ref=${referralCode}` : `https://ninjapdf.com/register?ref=${referralCode}`;

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await api.getReferralStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load referral stats");
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success("Referral link copied!");
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
            <p className="text-muted-foreground">Invite friends and earn Premium rewards. Help us grow!</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-violet-700">
                            <Gift className="w-6 h-6" />
                            Invite & Earn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium mb-4 text-violet-900">Get 1 month of Premium for every friend who subscribes!</p>
                        <div className="flex gap-2 max-w-md">
                            <Input value={referralLink} readOnly className="bg-white/50 backdrop-blur" />
                            <Button onClick={copyLink} className="bg-violet-600 hover:bg-violet-700">
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                        </div>
                        <p className="text-xs text-violet-600/80 mt-2">
                            Share this link on social media or email.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loading ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div>
                                    <Skeleton className="h-6 w-8" />
                                </div>
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div>
                                    <Skeleton className="h-6 w-8" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div>
                                    <Skeleton className="h-6 w-16" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Users className="w-4 h-4" /></div>
                                        <span>Total Invites Sent</span>
                                    </div>
                                    <span className="font-bold text-lg">{stats?.total_invites || 0}</span>
                                </div>
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 rounded-full text-green-600"><CheckCircle className="w-4 h-4" /></div>
                                        <span>Successful Signups</span>
                                    </div>
                                    <span className="font-bold text-lg">{stats?.successful_signups || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-50 rounded-full text-amber-600"><Star className="w-4 h-4" /></div>
                                        <span>Premium Earned</span>
                                    </div>
                                    <span className="font-bold text-amber-600 text-lg">{stats?.rewards_earned || 0} Months</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* How it works */}
                <Card>
                    <CardHeader>
                        <CardTitle>How it works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-600">
                        <div className="flex gap-3">
                            <div className="font-bold text-slate-300">1</div>
                            <p>Send your unique link to a friend or colleague.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="font-bold text-slate-300">2</div>
                            <p>They sign up for an 18+ PDF account.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="font-bold text-slate-300">3</div>
                            <p>Once they verify their email, you get points towards Premium!</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Icon helper
import { CheckCircle } from "lucide-react";
