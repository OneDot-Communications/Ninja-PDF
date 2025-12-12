"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

export default function ResetPasswordPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">New Password</h1>
                <p className="text-slate-500">Create a new secret code.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <Link href="/login" className="w-full block">
                    <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md mt-2">
                        Set & Login
                    </Button>
                </Link>
            </div>
        </motion.div>
    );
}
