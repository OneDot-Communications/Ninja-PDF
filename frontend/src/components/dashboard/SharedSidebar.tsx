"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Users,
    Settings,
    ShieldAlert,
    LogOut,
    CreditCard,
    Activity,
    FileText,
    Database,
    Lock,
    ShieldCheck,
    AlertCircle,
    Layers,
    Ticket,
    Receipt,
    MessageSquare,
    Cpu,
    BarChart3,
    Shield,
    Banknote,
    AlertTriangle,
    Key,
    ScrollText
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";

interface SharedSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    type: 'ADMIN' | 'SUPER_ADMIN';
}

export function SharedSidebar({ className, type }: SharedSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const adminLinks = [
        { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
        { href: "/admin/plans", label: "Plans", icon: Layers },
        { href: "/admin/support", label: "Support Tickets", icon: MessageSquare },
        { href: "/admin/content", label: "Content / CMS", icon: FileText },
        { href: "/admin/jobs", label: "Job Queue", icon: Cpu },
        { href: "/admin/activity", label: "System Activity", icon: Activity },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    const superAdminLinks = [
        { href: "/super-admin/dashboard", label: "Master Overview", icon: LayoutDashboard },
        { href: "/super-admin/requests", label: "Approvals", icon: AlertCircle },
        { href: "/super-admin/admins", label: "Admins", icon: ShieldAlert },
        { href: "/super-admin/users", label: "All Users", icon: Users },
        { href: "/super-admin/features", label: "PDF Tools", icon: ShieldCheck },

        { href: "/super-admin/subscriptions", label: "Global Revenue", icon: CreditCard },
        { href: "/super-admin/payments", label: "Payments", icon: Banknote },
        { href: "/super-admin/sla", label: "SLA Monitoring", icon: Activity },
        { href: "/super-admin/security", label: "Security", icon: Shield },
        { href: "/super-admin/abuse", label: "Abuse Alerts", icon: AlertTriangle },
        { href: "/super-admin/storage", label: "Storage Config", icon: Database },
        { href: "/super-admin/sso", label: "SSO / SAML", icon: Key },
        { href: "/super-admin/audit", label: "Audit Logs", icon: ScrollText },
        { href: "/super-admin/content", label: "CMS / Content", icon: FileText },
        { href: "/super-admin/settings", label: "System Settings", icon: Settings },
    ];

    const links = type === 'SUPER_ADMIN' ? superAdminLinks : adminLinks;
    const basePath = type === 'SUPER_ADMIN' ? '/super-admin' : '/admin';

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-white text-slate-900 shadow-sm", className)}>
            <div className="space-y-4 py-4">
                <div className="px-4 py-2">
                    <div className="flex items-center gap-3 px-2 mb-8">
                        <div className={cn(
                            "p-2.5 rounded-xl border shadow-sm",
                            type === 'SUPER_ADMIN' ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-blue-600"
                        )}>
                            {type === 'SUPER_ADMIN' ? <Lock className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans">
                                {type === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin Portal'}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {type === 'SUPER_ADMIN' ? 'System Owner' : 'Manager Access'}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            // Exact match or sub-path match
                            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

                            return (
                                <Link key={link.href} href={link.href}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-3 mb-1 font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? "text-slate-900" : "text-slate-400")} />
                                        {link.label}
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 px-6">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 mb-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-xs shadow-sm">
                        {user?.first_name?.[0] || 'A'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-semibold truncate text-slate-900">{user?.email}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 h-9 text-sm font-medium"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4" />
                    Log out
                </Button>
            </div>
        </div>
    );
}
