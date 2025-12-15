"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/components/ui/card";
import { CreditCard, Settings, Users, ArrowRight } from "lucide-react";

export default function SuperAdminDashboard() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Super Admin Console</h1>
                <p className="text-muted-foreground">Manage platform-wide settings and operations.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Link href="/super-admin/plans">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-violet-600" />
                                Manage Plans
                            </CardTitle>
                            <CardDescription>Update pricing, names, and features.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium flex items-center text-violet-600">
                                Edit Plans <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/super-admin/payments">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-green-600" />
                                Payment History
                            </CardTitle>
                            <CardDescription>View global transaction ledger.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium flex items-center text-green-600">
                                View Payments <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Placeholder for future functionality like User Management */}
                <Link href="/admin/users">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                User Management
                            </CardTitle>
                            <CardDescription>Manage all users and roles.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium flex items-center text-blue-600">
                                View Users <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
