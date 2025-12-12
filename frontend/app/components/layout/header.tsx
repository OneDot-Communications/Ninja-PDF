"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Grip, Menu, X, Check } from "lucide-react";
import { FaFilePdf, FaRobot, FaSignature, FaUserGroup, FaDesktop, FaMobile, FaGithub } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 relative">
                <Link href="/" className="flex items-center">
                    <span className="text-3xl font-bold font-caveat">
                        <span className="text-[#FF0000]">18+</span>
                        <span className="text-slate-800"> PDF</span>
                    </span>
                </Link>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login">
                        <Button variant="ghost" className="text-slate-600 hover:text-[#01B0F1] hover:bg-blue-50">
                            Login
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button className="bg-[#01B0F1] hover:bg-[#0091d4] text-white shadow-md hover:shadow-lg transition-all">
                            Sign Up
                        </Button>
                    </Link>
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
                                            <Link href="#" className="flex items-start gap-4 p-2 rounded-lg hover:bg-green-50 transition-colors group">
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
                                            <Link href="#" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 p-2 hover:bg-slate-50 rounded-lg">
                                                <FaDesktop className="w-4 h-4" />
                                                <span>Desktop App</span>
                                            </Link>
                                            <Link href="#" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 p-2 hover:bg-slate-50 rounded-lg">
                                                <FaMobile className="w-4 h-4" />
                                                <span>Mobile App</span>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Column 3: Links */}
                                    <div className="space-y-6 border-l border-slate-100 pl-8">
                                        <h3 className="font-bold text-slate-400 text-sm tracking-wider uppercase">Quick Links</h3>
                                        <ul className="space-y-3">
                                            {["Pricing", "Security", "Key Features", "About Us", "Help Center", "Language"].map(link => (
                                                <li key={link}>
                                                    <Link href="#" className="block p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg font-medium">
                                                        {link}
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
                            className="fixed inset-0 z-[100] bg-white md:hidden overflow-y-auto"
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
                                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button variant="outline" className="w-full justify-center h-12 text-slate-600 border-slate-200">
                                                Login
                                            </Button>
                                        </Link>
                                        <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                            <Button className="w-full justify-center h-12 bg-[#01B0F1] hover:bg-[#0091d4] text-white">
                                                Sign Up
                                            </Button>
                                        </Link>
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
                                                <Link href="#" className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600">
                                                    <FaDesktop className="w-6 h-6" />
                                                    <span className="text-xs font-medium">Desktop</span>
                                                </Link>
                                                <Link href="#" className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600">
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


