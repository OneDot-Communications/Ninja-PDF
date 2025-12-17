"use client";

import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
    LayoutDashboard,
    Users,
    Settings,
    ShieldAlert,
    LogOut,
    CreditCard,
    Activity,
    FileText
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/context/AuthContext";

interface AdminSidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AdminSidebar({ className }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const links = [
        { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/users", label: "User Management", icon: Users },
        { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
        { href: "/admin/activity", label: "System Activity", icon: Activity },
        { href: "/admin/content", label: "Content & CMS", icon: FileText },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-slate-900 text-slate-100", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="flex items-center gap-2 px-4 mb-6">
                        <div className="p-2 bg-red-600 rounded-lg">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">Admin Portal</h2>
                            <p className="text-xs text-slate-400">Super Admin Access</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;

                            return (
                                <Link key={link.href} href={link.href}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start gap-4 mb-1 h-11 relative overflow-hidden",
                                            isActive
                                                ? "bg-gradient-to-r from-red-600 to-red-600/80 text-white hover:from-red-500 hover:to-red-500/80 hover:bg-transparent"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {link.label}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute left-0 w-1 h-full bg-white"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        )}
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 px-4">
                <div className="p-4 rounded-xl bg-slate-800/50 mb-4 border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                            {user?.first_name?.[0] || 'A'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                            <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ').toLowerCase() || 'Admin'}</p>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-2"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4" />
                    Log out
                </Button>
            </div>
        </div>
    );
}
