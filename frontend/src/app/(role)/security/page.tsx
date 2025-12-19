"use client";

import { Shield, Lock, Eye, Server, FileCheck, Users, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SecurityPage() {
    const securityFeatures = [
        {
            icon: Lock,
            title: "256-bit AES Encryption",
            description: "All files are encrypted using military-grade AES-256 encryption both in transit and at rest.",
            color: "blue"
        },
        {
            icon: Shield,
            title: "GDPR Compliant",
            description: "We follow strict European data protection regulations to ensure your privacy is always protected.",
            color: "green"
        },
        {
            icon: Eye,
            title: "Zero-Knowledge Processing",
            description: "Your documents are processed in isolated environments and automatically deleted after processing.",
            color: "purple"
        },
        {
            icon: Server,
            title: "Secure Infrastructure",
            description: "Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA and automatic backups.",
            color: "orange"
        },
        {
            icon: FileCheck,
            title: "SOC 2 Type II Certified",
            description: "Our security practices are independently audited and certified to meet the highest standards.",
            color: "red"
        },
        {
            icon: Users,
            title: "Role-Based Access Control",
            description: "Fine-grained permissions ensure team members only access what they need.",
            color: "cyan"
        }
    ];

    const colorMap: Record<string, string> = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        orange: "bg-orange-100 text-orange-600",
        red: "bg-red-100 text-red-600",
        cyan: "bg-cyan-100 text-cyan-600"
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Shield className="w-4 h-4" />
                    Enterprise-Grade Security
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                    Your Documents Are Safe With Us
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12">
                    We take security seriously. Every document you upload is protected by industry-leading encryption and security practices.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    {["256-bit Encryption", "GDPR Compliant", "SOC 2 Certified", "Auto-Delete"].map((badge) => (
                        <div key={badge} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {badge}
                        </div>
                    ))}
                </div>
            </section>

            {/* Security Features Grid */}
            <section className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {securityFeatures.map((feature) => (
                        <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className={`w-12 h-12 rounded-lg ${colorMap[feature.color]} flex items-center justify-center mb-4`}>
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <CardTitle className="text-xl">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">{feature.description}</CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Data Handling Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-white">
                    <h2 className="text-3xl font-bold mb-8 text-center">How We Handle Your Data</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-blue-400">1</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">Upload</h3>
                            <p className="text-slate-400">Files are encrypted during upload using TLS 1.3</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-green-400">2</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">Process</h3>
                            <p className="text-slate-400">Documents are processed in isolated, secure containers</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-red-400">3</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">Delete</h3>
                            <p className="text-slate-400">Files are automatically purged within 24 hours</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Banner */}
            <section className="container mx-auto px-4 py-16 text-center">
                <p className="text-slate-500 mb-4">Trusted by thousands of users worldwide</p>
                <div className="flex flex-wrap justify-center gap-8 opacity-60">
                    {["Company A", "Company B", "Company C", "Company D", "Company E"].map((company) => (
                        <span key={company} className="text-xl font-bold text-slate-400">{company}</span>
                    ))}
                </div>
            </section>
        </div>
    );
}
