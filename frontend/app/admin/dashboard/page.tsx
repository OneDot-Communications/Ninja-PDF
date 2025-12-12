"use client";

import { motion } from "framer-motion";
import { Users, FileText, DollarSign, Activity, ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import Link from "next/link";

export default function AdminDashboardPage() {
    const stats = [
        {
            title: "Total Users",
            value: "12,345",
            change: "+12%",
            trend: "up",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50",
        },
        {
            title: "PDFs Processed",
            value: "84.3k",
            change: "+25%",
            trend: "up",
            icon: FileText,
            color: "text-purple-500",
            bg: "bg-purple-50",
        },
        {
            title: "Revenue",
            value: "$45,231",
            change: "+8%",
            trend: "up",
            icon: DollarSign,
            color: "text-green-500",
            bg: "bg-green-50",
        },
        {
            title: "Active Now",
            value: "542",
            change: "-3%",
            trend: "down",
            icon: Activity,
            color: "text-orange-500",
            bg: "bg-orange-50",
        },
    ];

    const recentActivity = [
        { id: 1, user: "Alice Cooper", action: "Converted PDF to Word", time: "2 min ago" },
        { id: 2, user: "Bob Smith", action: "Signed Document", time: "15 min ago" },
        { id: 3, user: "Charlie Root", action: "Created New Account", time: "1 hour ago" },
        { id: 4, user: "Diana Prince", action: "Compress PDF (Fail)", time: "2 hours ago" },
        { id: 5, user: "Evan Wright", action: "Subscribed to Premium", time: "5 hours ago" },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-slate-500">Welcome back, Admin.</p>
                    </div>
                    <Button className="bg-[#01B0F1] hover:bg-[#0091d4] text-white">
                        <ArrowUpRight className="w-4 h-4 mr-2" /> Generate Report
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <span
                                        className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${stat.trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                        {stat.change}
                                    </span>
                                </div>
                                <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
                                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2"
                    >
                        <Card className="border-slate-200 shadow-sm h-full">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
                                <Button variant="ghost" size="sm" className="text-slate-500">
                                    View All
                                </Button>
                            </div>
                            <div className="p-6 space-y-6">
                                {recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                {item.user.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{item.user}</p>
                                                <p className="text-sm text-slate-500">{item.action}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Quick Actions / System Status */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-6"
                    >
                        <Card className="border-slate-200 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <Link href="/admin/manage-users">
                                    <Button variant="outline" className="w-full justify-start border-slate-200 hover:bg-slate-50">
                                        <Users className="w-4 h-4 mr-3 text-blue-500" /> Manage Users
                                    </Button>
                                </Link>
                                <Button variant="outline" className="w-full justify-start border-slate-200 hover:bg-slate-50">
                                    <FileText className="w-4 h-4 mr-3 text-purple-500" /> Review Logs
                                </Button>
                                <Button variant="outline" className="w-full justify-start border-slate-200 hover:bg-slate-50">
                                    <DollarSign className="w-4 h-4 mr-3 text-green-500" /> Revenue Settings
                                </Button>
                            </div>
                        </Card>

                        <Card className="bg-[#01B0F1] text-white p-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold mb-2">System Healthy</h3>
                                <p className="text-blue-100 text-sm mb-4">All services are running smoothly. No issues reported in the last 24h.</p>
                                <Button variant="secondary" size="sm" className="bg-white text-[#01B0F1] hover:bg-blue-50 border-0">
                                    System Status
                                </Button>
                            </div>
                            <Activity className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-20" />
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
