"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Grip, Menu, X, Check } from "lucide-react";
import { FaFilePdf, FaRobot, FaSignature, FaUserGroup, FaDesktop, FaMobile, FaGithub } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '@/lib/context/AuthContext';
import { FaUser } from 'react-icons/fa6';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
    }, [isMobileMenuOpen]);

    return (
        <header
            className="sticky top-0 z-50 w-full bg-white/60 shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)]"
            style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
            {/* Main Header Container */}
            <div className="w-full flex h-16 items-center justify-between px-6 relative max-w-[1536px] mx-auto">
                <Link href="/" className="flex items-center">
                    <img src="/pages/auth/18+logo.png" alt="18+ PDF" className="h-12 w-auto" />
                </Link>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-2">
                    {!user && (
                        <>
                            <Link href="/login">
                                <div className="rounded-lg px-4 py-2 flex items-center justify-center h-10 cursor-pointer group">
                                    <span className="text-slate-600 group-hover:text-slate-900 text-center font-medium leading-none transition-colors">
                                        Login
                                    </span>
                                </div>
                            </Link>
                            <Link href="/signup">
                                <div className="bg-[#FF5252] rounded-lg px-4 py-2 flex items-center justify-center h-10 overflow-hidden shadow-[0px_6px_20px_-8px_rgba(255,82,82,0.25)] cursor-pointer hover:bg-[#ff3b3b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF5252]/30">
                                    <span className="text-white text-center font-medium leading-none">
                                        Sign Up
                                    </span>
                                </div>
                            </Link>
                        </>
                    )}
                    {user && (
                        <div className="flex items-center gap-3 mr-2">
                            <span className="text-sm font-medium text-slate-700 hidden lg:inline-block">
                                Hello, {user.first_name || user.email?.split('@')[0] || 'User'}
                            </span>
                            <a
                                href="/profile"
                                className="cursor-pointer"
                            >
                                <Avatar className="w-9 h-9 ring-2 ring-slate-200 hover:ring-slate-300 transition-all">
                                    <AvatarImage
                                        src={user.avatar || undefined}
                                        alt={user.first_name || "User"}
                                    />
                                    <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">
                                        {user.first_name?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </a>
                        </div>
                    )}
                    <div ref={menuRef} className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <Grip className="w-6 h-6" />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 top-full mt-2 w-[800px] bg-white rounded-xl shadow-2xl border border-slate-100 p-8 grid grid-cols-3 gap-8 z-50 overflow-hidden"
                                >
                                    {/* Column 1: Other Stuff */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-slate-400 text-sm tracking-wider uppercase">Other Stuff</h3>
                                        <div className="space-y-4">
                                            <Link href="#" className="flex items-start gap-4 p-2 rounded-lg hover:bg-blue-50 transition-colors group">
                                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200">
                                                    <FaFilePdf className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-blue-600">PDF Editor</div>
                                                    <div className="text-sm text-slate-500">Edit like a pro</div>
                                                </div>
                                            </Link>
                                            <Link href="#" className="flex items-start gap-4 p-2 rounded-lg hover:bg-purple-50 transition-colors group">
                                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-200">
                                                    <FaRobot className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-purple-600">AI Chat</div>
                                                    <div className="text-sm text-slate-500">Talk to your docs</div>
                                                </div>
                                            </Link>
                                            <Link href="/features/coming-soon" className="flex items-start gap-4 p-2 rounded-lg hover:bg-green-50 transition-colors group">
                                                <div className="p-2 bg-green-100 rounded-lg text-green-600 group-hover:bg-green-200">
                                                    <FaSignature className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-green-600">Sign PDF</div>
                                                    <div className="text-sm text-slate-500">Digital signatures</div>
                                                </div>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Column 2: Business Moves */}
                                    <div className="space-y-6 border-l border-slate-100 pl-8">
                                        <h3 className="font-bold text-slate-400 text-sm tracking-wider uppercase">Business Moves</h3>
                                        <div className="bg-slate-50 rounded-xl p-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-red-100 rounded-lg text-red-600">
                                                    <FaUserGroup className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">For Teams</div>
                                                    <div className="text-sm text-slate-500">Manage your squad</div>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4">
                                                Get your whole office sorted with team features.
                                            </p>
                                            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                                                Check Plans
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-slate-900">Apps</h4>
                                            <Link href="/features/coming-soon" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 p-2 hover:bg-slate-50 rounded-lg">
                                                <FaDesktop className="w-4 h-4" />
                                                <span>Desktop App</span>
                                            </Link>
                                            <Link href="/features/coming-soon" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 p-2 hover:bg-slate-50 rounded-lg">
                                                <FaMobile className="w-4 h-4" />
                                                <span>Mobile App</span>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Column 3: Links */}
                                    <div className="space-y-6 border-l border-slate-100 pl-8">
                                        <h3 className="font-bold text-slate-400 text-sm tracking-wider uppercase">Quick Links</h3>
                                        <ul className="space-y-3">
                                            {[
                                                { label: "Pricing", href: "/pricing" },
                                                { label: "Security", href: "/security" },
                                                { label: "All Tools", href: "/features" },
                                                { label: "About Us", href: "/about" },
                                                { label: "Help Center", href: "/help" }
                                            ].map(link => (
                                                <li key={link.label}>
                                                    <Link href={link.href} className="block p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium">
                                                        {link.label}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Mobile Menu Button - Visible only on mobile */}
                <div className="md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay - Portaled to document.body */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-100 bg-white md:hidden overflow-y-auto"
                        >
                            <div className="flex flex-col min-h-screen">
                                {/* Mobile Menu Header */}
                                <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                                        <span className="text-2xl font-bold font-caveat">
                                            <span className="text-[#FF0000]">18+</span>
                                            <span className="text-slate-800"> PDF</span>
                                        </span>
                                    </Link>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Mobile Menu Content */}
                                <div className="flex-1 p-6 space-y-8">
                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {!user ? (
                                            <>
                                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button variant="outline" className="w-full justify-center h-12 text-slate-600 border-slate-200">
                                                        Login
                                                    </Button>
                                                </Link>
                                                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button className="w-full justify-center h-12 bg-[#FF5252] hover:bg-[#ff3b3b] text-white focus:outline-none focus:ring-2 focus:ring-[#FF5252]/30">
                                                        Sign Up
                                                    </Button>
                                                </Link>
                                            </>
                                        ) : (
                                            <div className="col-span-2 flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#01B0F1]/10 flex items-center justify-center text-[#01B0F1]">
                                                        <FaUser className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {user.first_name || 'User'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 truncate max-w-[120px]">
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        Profile
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Menu Sections */}
                                    <div className="space-y-8">
                                        {/* Section 1 */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Features</h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Link href="#" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700">
                                                    <FaFilePdf className="w-5 h-5" />
                                                    <span className="font-semibold">PDF Editor</span>
                                                </Link>
                                                <Link href="#" className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 text-purple-700">
                                                    <FaRobot className="w-5 h-5" />
                                                    <span className="font-semibold">AI Chat</span>
                                                </Link>
                                                <Link href="#" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 text-green-700">
                                                    <FaSignature className="w-5 h-5" />
                                                    <span className="font-semibold">Sign PDF</span>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Section 2 */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business</h3>
                                            <div className="bg-slate-50 rounded-xl p-4">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                                        <FaUserGroup className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">For Teams</div>
                                                        <div className="text-sm text-slate-500">Manage your squad</div>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 bg-white">
                                                    Check Plans
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Section 3 */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Apps</h3>
                                            <div className="flex gap-4">
                                                <Link href="/features/coming-soon" className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600">
                                                    <FaDesktop className="w-6 h-6" />
                                                    <span className="text-xs font-medium">Desktop</span>
                                                </Link>
                                                <Link href="/features/coming-soon" className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600">
                                                    <FaMobile className="w-6 h-6" />
                                                    <span className="text-xs font-medium">Mobile</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </header>
    );
}


