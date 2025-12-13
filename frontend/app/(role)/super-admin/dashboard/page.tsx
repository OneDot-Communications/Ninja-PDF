"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import {
    Users,
    ShieldCheck,
    CreditCard,
    TrendingUp,
    Download,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Database,
    Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { motion } from "framer-motion";

export default function SuperAdminDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // Ideally create a specific super-admin stats endpoint if data differs
                const data = await api.getAdminStats();
                setStats(data);
            } catch (error) {
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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Master Overview</h1>
                    <p className="text-slate-500">Global system performance and oversight.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors">
                        <Calendar className="w-4 h-4" />
                        Today
                    </button>
                    <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all hover:scale-105 active:scale-95">
                        <Activity className="w-4 h-4" />
                        System Status
                    </button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Users (Global)</CardTitle>
                            <Users className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats?.total_users || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">Across all instances</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Admins</CardTitle>
                            <Shield className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">3</div>
                            {/* Placeholder until we have admin count API */}
                            <p className="text-xs text-slate-500 mt-1">Active Managers</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Revenue (MRR)</CardTitle>
                            <CreditCard className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">${stats?.monthly_revenue || 0}</div>
                            <p className="text-xs text-slate-500 mt-1">+8% vs last month</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Database Load</CardTitle>
                            <Database className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">12%</div>
                            <p className="text-xs text-green-500 mt-1 font-medium">Healthy</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Extended charts or tables for Super Admin can go here */}
        </motion.div>
    );
}
