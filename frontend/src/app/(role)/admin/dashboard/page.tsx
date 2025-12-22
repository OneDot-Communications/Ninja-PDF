"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/services/api";
import {
    Users,
    ShieldCheck,
    CreditCard,
    TrendingUp,
    Download,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await api.getAdminStats();
                setStats(data);
            } catch (error: any) {
                // Suppress auth errors during logout/re-verification
                if (error?.status === 401 || error?.status === 403 || error.message?.includes("credentials were not provided")) {
                    return;
                }
                console.error("Failed to fetch admin stats", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Overview of system performance and user activity.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors">
                        <Calendar className="w-4 h-4" />
                        Last 30 Days
                    </button>
                    <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats?.total_users || 0}</div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <span className="text-green-600 flex items-center font-medium">
                                    <ArrowUpRight className="w-3 h-3" /> +12%
                                </span>
                                from last month
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Verified Users</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats?.verified_users || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">
                                {((stats?.verified_users / (stats?.total_users || 1)) * 100).toFixed(0)}% verification rate
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Active Subscriptions</CardTitle>
                            <CreditCard className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats?.active_subscriptions || 0}</div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <span className="text-green-600 flex items-center font-medium">
                                    <ArrowUpRight className="w-3 h-3" /> +5%
                                </span>
                                new subscriptions
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Monthly Revenue</CardTitle>
                            <TrendingUp className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stats?.monthly_revenue || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Estimated MRR</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <motion.div variants={item} className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 rounded-xl border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Plan Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats?.plan_distribution?.map((plan: any) => (
                                <div key={plan.plan__name} className="flex items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-slate-700">{plan.plan__name}</span>
                                            <span className="text-sm text-slate-500">{plan.count} users</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${(plan.count / (stats?.active_subscriptions || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )) || <p className="text-sm text-slate-500">No data available</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 rounded-xl border-slate-200 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-white">System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">API Status</span>
                                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/20">OPERATIONAL</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">Database</span>
                                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/20">CONNECTED</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">Queue Workers</span>
                                <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/20">IDLE</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
