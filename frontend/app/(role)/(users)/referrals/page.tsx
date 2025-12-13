"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Gift, Copy } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";

export default function ReferralsPage() {
    const referralLink = "https://ninjapdf.com/register?ref=dha46891"; // Mock link based on user email hash usually

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success("Referral link copied!");
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
            <p className="text-muted-foreground">Invite friends and earn Premium rewards.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-0 shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Gift className="w-6 h-6" />
                            Invite & Earn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium mb-4">Get 1 month of Premium for every friend who subscribes!</p>
                        <div className="flex gap-2 max-w-md">
                            <Input value={referralLink} readOnly className="bg-background" />
                            <Button onClick={copyLink}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <span>Clicks</span>
                            <span className="font-bold">0</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span>Signups</span>
                            <span className="font-bold">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Premium Earned</span>
                            <span className="font-bold text-green-600">0 Months</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
