"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    Shield, 
    LogOut, 
    FileText, 
    Star 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AdminSidebar({ className }: AdminSidebarProps) {
    const pathname = usePathname();

    const sidebarItems = [
        {
            title: "Overview",
            href: "/admin/dashboard",
            icon: LayoutDashboard,
            variant: "default"
        },
        {
            title: "Users",
            href: "/admin/manage-users",
            icon: Users,
            variant: "ghost"
        },
        {
            title: "Features",
            href: "/admin/features",
            icon: Star,
            variant: "ghost"
        },
        {
            title: "Logs",
            href: "/admin/logs",
            icon: FileText,
            variant: "ghost"
        },
        {
            title: "Settings",
            href: "/admin/settings",
            icon: Settings,
            variant: "ghost"
        },
    ];

    return (
        <div className={cn("pb-12 w-64 border-r border-slate-200 min-h-screen bg-white hidden md:block", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <Link href="/admin/dashboard" className="flex items-center px-4 mb-6">
                        <span className="text-2xl font-bold font-caveat">
                            <span className="text-[#FF0000]">18+</span>
                            <span className="text-slate-800"> PDF</span>
                            <span className="text-slate-400 text-xs font-sans font-normal ml-2 uppercase border border-slate-200 rounded px-1 py-0.5">Admin</span>
                        </span>
                    </Link>
                    <div className="space-y-1">
                        {sidebarItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={pathname === item.href ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start gap-2",
                                        pathname === item.href && "bg-slate-100 text-slate-900 font-medium"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.title}
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500 uppercase">
                        System
                    </h2>
                    <div className="space-y-1">
                        <Link href="/">
                            <Button variant="ghost" className="w-full justify-start gap-2 text-slate-500 hover:text-slate-900">
                                <LogOut className="h-4 w-4" />
                                Return to Site
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
            
            <div className="absolute bottom-4 left-0 w-64 px-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <Shield className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-900">Super Admin</div>
                        <div className="text-xs text-slate-500">Secure Session</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
