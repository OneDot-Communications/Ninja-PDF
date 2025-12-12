"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

export default function VerifyOtpPage() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Check Your Inbox</h1>
                <p className="text-slate-500">Enter the magic number we sent you.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="otp">Enter Magic Number</Label>
                    <input
                        id="otp"
                        type="text"
                        placeholder="1 2 3 4"
                        className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-2xl tracking-[0.5em] font-bold ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-300 placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        maxLength={6}
                    />
                </div>

                <Link href="/reset-password" className="w-full block">
                    <Button className="w-full bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold h-10 rounded-md mt-2">
                        Verify Code
                    </Button>
                </Link>

                <div className="text-center text-sm text-slate-500 mt-4">
                    Didn't get it?{" "}
                    <button className="text-[#01B0F1] hover:underline font-semibold bg-transparent border-none cursor-pointer">
                        Resend Code
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
