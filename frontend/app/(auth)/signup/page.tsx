"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { FaFacebook, FaGoogle } from "react-icons/fa6";

export default function SignupPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
                <p className="text-slate-500">Join the squad today.</p>
            </div>

            {/* Social Login Buttons */}
            <div className="flex gap-4 mb-6">
                <Button variant="outline" className="w-full flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 h-10">
                    <FaFacebook className="text-[#1877F2]" /> Facebook
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 h-10">
                    <FaGoogle className="text-[#DB4437]" /> Google
                </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400">Or register with email</span>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <input
                        id="name"
                        type="text"
                        placeholder="Your Name"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <input
                        id="email"
                        type="email"
                        placeholder="boss@example.com"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md mt-2">
                    Start the Magic
                </Button>

                <div className="text-center text-sm text-slate-600 mt-4">
                    Already a boss?{" "}
                    <Link href="/login" className="text-red-500 hover:underline font-semibold">
                        Login here
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
