"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, Send, Inbox, CheckCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignaturesOverviewPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSignatureStats()
            .then(data => setStats(data))
            .catch(err => console.error("Failed to load stats"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-9 w-48 mb-2" />
                        <Skeleton className="h-5 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Signatures</h1>
                    <p className="text-muted-foreground mt-1">Manage all your e-signature requests in one place.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => router.push('/signatures/my-signature')}>
                        <FileSignature className="w-4 h-4" /> My Signature
                    </Button>
                    <Button className="gap-2" onClick={() => router.push('/signatures/create')}>
                        <Plus className="w-4 h-4" /> New Request
                    </Button>
                </div>
            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/signatures/sent')}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Sent Requests</CardTitle>
                        <Send className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.sent || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pending signature</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/signatures/inbox')}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inbox</CardTitle>
                        <Inbox className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.inbox || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Waiting for you</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/signatures/signed')}>
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
                        <Button variant="outline" className="w-full justify-start gap-4" onClick={() => router.push('/signatures/self-sign')}>
                            <FileSignature className="w-5 h-5" />
                            Sign a Document Yourself
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-4" onClick={() => router.push('/signatures/create')}>
                            <Send className="w-5 h-5" />
                            Request Signatures from Others
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
