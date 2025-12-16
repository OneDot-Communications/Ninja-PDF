"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";
import {
    User, Shield, Users, Workflow, History,
    PenTool, CreditCard,
    ChevronDown, ChevronRight,
    LayoutTemplate, Settings,
    Receipt, Trash2, Gift, Folder
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/context/AuthContext";

const SidebarItem = ({ href, icon: Icon, label, active, hasSubmenu, isOpen, onClick }: any) => {
    return (
        <div className="mb-1">
            {href ? (
                <Link
                    href={href}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                        active
                            ? "bg-primary/10 text-primary font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                >
                    {active && (
                        <motion.div
                            layoutId="active-pill"
                            className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    )}
                    <Icon className={cn("w-5 h-5", active ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                    <span className="flex-1">{label}</span>
                    {hasSubmenu && (
                        <div className="text-muted-foreground/50">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    )}
                </Link>
            ) : (
                <button
                    onClick={onClick}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-muted-foreground hover:bg-muted/50 hover:text-foreground text-left"
                    )}
                >
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="flex-1 font-medium">{label}</span>
                    <div className="text-muted-foreground/50">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                </button>
            )}
        </div>
    );
};

const SubMenuItem = ({ href, label, active }: any) => (
    <Link
        href={href}
        className={cn(
            "flex items-center gap-2 pl-12 pr-4 py-2 text-sm rounded-lg transition-colors relative",
            active
                ? "text-primary font-medium bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
    >
        {active && <div className="absolute left-9 w-1 h-1 rounded-full bg-primary" />}
        {label}
    </Link>
);

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [signaturesOpen, setSignaturesOpen] = useState(pathname?.includes("/signatures") || false);
    const [billingOpen, setBillingOpen] = useState(pathname?.includes("/profile/billing") || false);

    const isActive = (path: string) => pathname === path;

    return (
        <aside className="w-full h-full border-r bg-background/50 backdrop-blur-xl flex flex-col py-6 overflow-y-auto no-scrollbar">

            {/* Account Section */}
            <div className="px-6 mb-2 mt-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</h2>
            </div>

            <div className="flex-1 px-3 space-y-1">
                <SidebarItem
                    href="/profile"
                    icon={User}
                    label="My Account"
                    active={isActive("/profile")}
                />
                <SidebarItem
                    href="/files"
                    icon={Folder}
                    label="My Files"
                    active={isActive("/files")}
                />
                <SidebarItem
                    href="/profile/security"
                    icon={Shield}
                    label="Security"
                    active={isActive("/profile/security")}
                />
                <SidebarItem
                    href="/profile/team"
                    icon={Users}
                    label="Team"
                    active={isActive("/profile/team")}
                />
                <SidebarItem
                    href="/profile/workflows"
                    icon={Workflow}
                    label="Workflows"
                    active={isActive("/profile/workflows")}
                />
                <SidebarItem
                    href="/profile/tasks"
                    icon={History}
                    label="Last Tasks"
                    active={isActive("/profile/tasks")}
                />

                {/* Productivity Section */}
                <div className="pt-6 pb-2 px-3">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productivity</h2>
                </div>

                {/* Signatures Group */}
                <SidebarItem
                    icon={PenTool}
                    label="Signatures"
                    hasSubmenu
                    isOpen={signaturesOpen}
                    onClick={() => setSignaturesOpen(!signaturesOpen)}
                />
                <AnimatePresence>
                    {signaturesOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-0.5 mb-2"
                        >
                            <SubMenuItem href="/signatures" label="Overview" active={isActive("/signatures")} />
                            <SubMenuItem href="/signatures/inbox" label="Inbox" active={isActive("/signatures/inbox")} />
                            <SubMenuItem href="/signatures/sent" label="Sent" active={isActive("/signatures/sent")} />
                            <SubMenuItem href="/signatures/signed" label="Completed" active={isActive("/signatures/signed")} />
                            <SubMenuItem href="/signatures/templates" label="Templates" active={isActive("/signatures/templates")} />
                            <SubMenuItem href="/signatures/contacts" label="Contacts" active={isActive("/signatures/contacts")} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Billing Group */}
                <SidebarItem
                    icon={CreditCard}
                    label="Billing"
                    hasSubmenu
                    isOpen={billingOpen}
                    onClick={() => setBillingOpen(!billingOpen)}
                />
                <AnimatePresence>
                    {billingOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-0.5 mb-2"
                        >
                            <SubMenuItem href="/profile/billing" label="Plans" active={isActive("/profile/billing")} />
                            <SubMenuItem href="/profile/billing/invoices" label="Invoices" active={isActive("/profile/billing/invoices")} />
                            <SubMenuItem href="/profile/billing/business" label="Settings" active={isActive("/profile/billing/business")} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <SidebarItem
                    href="/profile/trash"
                    icon={Trash2}
                    label="Trash"
                    active={isActive("/profile/trash")}
                />
                <SidebarItem
                    href="/profile/referrals"
                    icon={Gift}
                    label="Referrals"
                    active={isActive("/profile/referrals")}
                />


                {/* SUPER ADMIN: Special Section */}
                {user?.role === 'SUPER_ADMIN' && (
                    <>
                        <div className="pt-6 pb-2 px-3">
                            <h2 className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Super Admin</h2>
                        </div>
                        <SidebarItem
                            href="/super-admin"
                            icon={LayoutTemplate}
                            label="Dashboard"
                            active={isActive("/super-admin")}
                        />
                        <SidebarItem
                            href="/super-admin/plans"
                            icon={Settings}
                            label="Plan Management"
                            active={isActive("/super-admin/plans")}
                        />
                        <SidebarItem
                            href="/super-admin/payments"
                            icon={Receipt}
                            label="Global Payments"
                            active={isActive("/super-admin/payments")}
                        />
                        <SidebarItem
                            href="/admin/users"
                            icon={Users}
                            label="User Management"
                            active={isActive("/admin/users")}
                        />
                    </>
                )}

                {/* ADMIN (Regular Admin) Section */}
                {user?.role === 'ADMIN' && (
                    <>
                        <div className="pt-6 pb-2 px-3">
                            <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Admin</h2>
                        </div>
                        <SidebarItem
                            href="/admin/users"
                            icon={Users}
                            label="User Management"
                            active={isActive("/admin/users")}
                        />
                    </>
                )}

            </div>
        </aside>
    );
}
