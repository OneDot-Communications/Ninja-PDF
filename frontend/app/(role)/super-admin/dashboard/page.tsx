"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import {
    Users,
    ShieldCheck,
    CreditCard,
    TrendingUp,
    Activity,
    Database,
    Shield,
    Server,
    Clock,
    CheckCircle2,
    XCircle,
    Smartphone,
    Globe,
    Zap,
    DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SuperAdminDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [activity, setActivity] = useState<any>(null);
    const [dbStats, setDbStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAllData() {
            try {
                const [statsData, activityData, dbData] = await Promise.all([
                    api.getAdminStats(),
                    api.getAdminActivity(),
                    api.getAdminDatabase()
                ]);
                setStats(statsData);
                setActivity(activityData);
                setDbStats(dbData);
            } catch (error) {
                console.error("Dashboard load failed", error);
                toast.error("Failed to load dashboard metrics");
            } finally {
                setLoading(false);
            }
        }
        loadAllData();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    if (loading) return <DashboardSkeleton />;

    const maxSignups = Math.max(...(stats?.signups_trend?.map((d: any) => d.count) || [1]));

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-10"
        >
            {/* HER0 SECTION */}
            <div className="flex flax-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Mission Control
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-slate-500">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            System Operational
                        </span>
                        <span className="text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Card className="px-4 py-2 flex items-center gap-3 bg-slate-900 text-white border-0 shadow-lg shadow-slate-900/20">
                        <Database className="w-5 h-5 text-blue-400" />
                        <div>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">DB Load</p>
                            <p className="text-lg font-bold leading-none">{dbStats?.connections || 2} <span className="text-xs font-normal text-slate-500">conns</span></p>
                        </div>
                    </Card>
                    <Card className="px-4 py-2 flex items-center gap-3 bg-white border-slate-200">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <div>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Cache Hit</p>
                            <p className="text-lg font-bold leading-none text-slate-900">{dbStats?.cache_hit_ratio || 99}%</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Total Revenue"
                    value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.total_revenue || 0)}
                    subtext="Lifetime Volume"
                    icon={DollarSign}
                    trend="+12% vs last mo"
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                />
                <KpiCard
                    title="Active Users"
                    value={stats?.total_users || 0}
                    subtext={`${stats?.verified_users} verified accounts`}
                    icon={Users}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <KpiCard
                    title="Subscriptions"
                    value={stats?.active_subscriptions || 0}
                    subtext={`MRR: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats?.monthly_revenue || 0)}`}
                    icon={CreditCard}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
                <KpiCard
                    title="Security Events"
                    value={activity?.sessions?.length || 0} // Placeholder for real security events
                    subtext="Active sessions monitored"
                    icon={ShieldCheck}
                    color="text-indigo-600"
                    bgColor="bg-indigo-50"
                />
            </div>

            {/* ANALYTICS ROW */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* SIGNUP TREND - CUSTOM VIZ */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-slate-400" />
                            User Growth
                        </CardTitle>
                        <CardDescription>New signups over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-end justify-between gap-2 pt-4">
                            {stats?.signups_trend?.map((day: any, i: number) => {
                                const height = maxSignups > 0 ? (day.count / maxSignups) * 100 : 0;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="relative w-full bg-slate-100 rounded-t-md overflow-hidden h-full flex items-end">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${height}%` }}
                                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                                className="w-full bg-slate-900 opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* PLAN DISTRIBUTION */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Plan Distribution</CardTitle>
                        <CardDescription>Current user tier split</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats?.plan_distribution?.map((plan: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${plan.plan__name === 'Pro' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                    <span className="text-sm font-medium text-slate-700">{plan.plan__name || 'Free'}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{plan.count}</span>
                            </div>
                        ))}
                        {(!stats?.plan_distribution || stats?.plan_distribution.length === 0) && (
                            <div className="text-center py-8 text-slate-400 text-sm">No plan data available</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* LIVE FEED ROW */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* RECENT ACTIVITY */}
                <Card className="border-slate-200 shadow-sm h-[400px] flex flex-col">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                Live System Activity
                            </CardTitle>
                            <Badge variant="outline" className="text-xs font-normal">Real-time</Badge>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-0">
                            {activity?.admin_actions?.map((log: any, i: number) => (
                                <div key={i} className="flex items-start gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-900">{log.user}</p>
                                        <p className="text-xs text-slate-500 line-clamp-2">{log.action}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!activity?.admin_actions || activity?.admin_actions.length === 0) && (
                                <div className="p-8 text-center text-slate-500 text-sm">No recent admin activity</div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* ACTIVE SESSIONS / SECURITY */}
                <Card className="border-slate-200 shadow-sm h-[400px] flex flex-col">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-500" />
                                Active Sessions
                            </CardTitle>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{activity?.sessions?.length || 0} Online</Badge>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-0">
                            {activity?.sessions?.map((session: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <DesktopMobileIcon userAgent={session.user_agent} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{session.user?.email || 'Unknown User'}</p>
                                            <p className="text-xs text-slate-500">{session.ip_address}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="text-[10px] font-mono text-slate-400">
                                            {new Date(session.last_active).toLocaleTimeString()}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* RECENT PAYMENTS */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats?.recent_payments?.map((payment: any) => (
                            <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{payment.user}</p>
                                        <p className="text-xs text-slate-500">{new Date(payment.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-slate-900">
                                    +{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </motion.div>
    );
}

function KpiCard({ title, value, subtext, icon: Icon, color, bgColor, trend }: any) {
    return (
        <motion.div variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                    <Icon className="w-24 h-24 -mr-4 -mt-4 transform rotate-12" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-slate-900">{value}</div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                        {subtext}
                        {trend && <span className="text-emerald-600 font-medium">{trend}</span>}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    )
}

function DesktopMobileIcon({ userAgent }: { userAgent?: string }) {
    if (userAgent && userAgent.toLowerCase().includes('mobile')) {
        return <Smartphone className="w-8 h-8 p-1.5 bg-slate-100 rounded text-slate-500" />;
    }
    return <Globe className="w-8 h-8 p-1.5 bg-slate-100 rounded text-slate-500" />;
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 w-32" />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-64 col-span-2 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        </div>
    );
}
