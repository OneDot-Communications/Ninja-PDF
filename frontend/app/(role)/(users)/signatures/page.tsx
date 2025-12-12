"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { FileSignature, Send, Inbox, CheckCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignaturesOverviewPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSignatureStats()
            .then(data => setStats(data))
            .catch(err => console.error("Failed to load stats"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Signatures</h1>
                    <p className="text-muted-foreground mt-1">Manage all your e-signature requests in one place.</p>
                </div>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> New Request
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/profile/signatures/sent'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Sent Requests</CardTitle>
                        <Send className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.sent || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pending signature</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/profile/signatures/inbox'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inbox</CardTitle>
                        <Inbox className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.inbox || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Waiting for you</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/profile/signatures/signed'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.completed || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Fully signed docs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity or Quick Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full justify-start gap-4">
                            <FileSignature className="w-5 h-5" />
                            Sign a Document Yourself
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-4">
                            <Send className="w-5 h-5" />
                            Request Signatures from Others
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
