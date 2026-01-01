"use client";

import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    FileText,
    Shield
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

interface AdminSidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AdminSidebar({ className }: AdminSidebarProps) {
    const pathname = usePathname();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/admin/dashboard",
            active: pathname === "/admin/dashboard",
        },
        {
            label: "Manage Users",
            icon: Users,
            href: "/admin/manage-users",
            active: pathname === "/admin/manage-users",
        },
        {
            label: "Reports",
            icon: FileText,
            href: "/admin/reports",
            active: pathname === "/admin/reports",
        },
        {
            label: "Settings",
            icon: Settings,
            href: "/admin/settings",
            active: pathname === "/admin/settings",
        },
    ];

    return (
        <div className={cn("pb-12 min-h-screen border-r border-slate-200 bg-white", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <Link href="/admin/dashboard" className="flex items-center pl-2 mb-9">
                        <Shield className="h-8 w-8 text-[#4383BF] mr-2" />
                        <h1 className="text-xl font-bold text-slate-900">
                            Admin<span className="text-[#4383BF]">Panel</span>
                        </h1>
                    </Link>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-[#4383BF] hover:bg-slate-50 rounded-lg transition",
                                    route.active ? "text-[#4383BF] bg-blue-50" : "text-slate-500"
                                )}
                            >
                                <div className="flex items-center flex-1">
                                    <route.icon className={cn("h-5 w-5 mr-3", route.active ? "text-[#4383BF]" : "text-slate-400")} />
                                    {route.label}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2 border-t border-slate-100 mt-auto">
                    <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-500 hover:bg-red-50">
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
