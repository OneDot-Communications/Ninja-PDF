"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Header } from "../../components/layout/header";
import { Label } from "../../components/ui/label";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-white">
            <Header />
            <main className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[calc(100vh-80px)]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card className="w-full max-w-xl bg-white shadow-xl border-slate-100 p-8">
                        <CardHeader className="space-y-6 text-center pb-8">
                            <CardTitle className="text-4xl font-bold font-caveat text-slate-900">
                                Forgot Secret Code?
                            </CardTitle>
                            <CardDescription className="text-xl">
                                Chill boss, happens to the best of us. We'll fix it.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-3">
                                <Label htmlFor="email" className="text-base">Your Email ID</Label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="boss@example.com"
                                    className="flex h-12 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01B0F1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-6 pt-4">
                            <Link href="/verify-otp" className="w-full">
                                <Button className="w-full bg-[#01B0F1] hover:bg-[#0091d4] text-white text-xl h-14 rounded-lg">
                                    Send Magic Number
                                </Button>
                            </Link>
                            <div className="text-center text-base text-slate-500">
                                Remembered it?{" "}
                                <Link href="/login" className="text-[#01B0F1] hover:underline font-semibold">
                                    Back to base
                                </Link>
                            </div>
                        </CardFooter>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}
