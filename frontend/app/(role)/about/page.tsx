"use client";

import { Target, Heart, Users, Zap, Globe, Award } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
    const values = [
        {
            icon: Heart,
            title: "User-First",
            description: "Every feature we build starts with understanding what our users truly need."
        },
        {
            icon: Zap,
            title: "Simplicity",
            description: "Complex technology should feel effortless. We make powerful tools accessible to everyone."
        },
        {
            icon: Target,
            title: "Privacy",
            description: "Your documents are yours. We never read, sell, or share your data."
        },
        {
            icon: Globe,
            title: "Accessibility",
            description: "PDF tools should be available to everyone, regardless of budget or technical skill."
        }
    ];

    const team = [
        { name: "Alex Chen", role: "Founder & CEO", image: null },
        { name: "Sarah Johnson", role: "Head of Engineering", image: null },
        { name: "Michael Park", role: "Lead Designer", image: null },
        { name: "Emily Davis", role: "Customer Success", image: null }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                    Making PDF Management <span className="text-[#01B0F1]">Simple</span> for Everyone
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
                    We believe everyone deserves access to powerful document tools without complexity or high costs.
                </p>
            </section>

            {/* Story Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Story</h2>
                        <div className="space-y-4 text-slate-600">
                            <p>
                                18+ PDF was born from frustration. We were tired of complicated, expensive PDF tools that made simple tasks feel impossible.
                            </p>
                            <p>
                                In 2024, we set out to build something different—a PDF platform that's powerful enough for professionals yet simple enough for anyone to use.
                            </p>
                            <p>
                                Today, we help thousands of users around the world manage their documents effortlessly, from students to Fortune 500 companies.
                            </p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#01B0F1]/10 to-violet-500/10 rounded-2xl p-8 text-center">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-4xl font-bold text-[#01B0F1] mb-2">2024</div>
                                <div className="text-sm text-slate-500">Founded</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-4xl font-bold text-[#01B0F1] mb-2">50K+</div>
                                <div className="text-sm text-slate-500">Users</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-4xl font-bold text-[#01B0F1] mb-2">1M+</div>
                                <div className="text-sm text-slate-500">Files Processed</div>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="text-4xl font-bold text-[#01B0F1] mb-2">25+</div>
                                <div className="text-sm text-slate-500">PDF Tools</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Our Values</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {values.map((value) => (
                        <Card key={value.title} className="text-center hover:shadow-lg transition-shadow">
                            <CardContent className="pt-8 pb-6">
                                <div className="w-14 h-14 bg-[#01B0F1]/10 text-[#01B0F1] rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <value.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{value.title}</h3>
                                <p className="text-slate-600 text-sm">{value.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Team Section */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Meet the Team</h2>
                <p className="text-slate-600 text-center mb-12 max-w-lg mx-auto">
                    A small but passionate team dedicated to making document management better for everyone.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                    {team.map((member) => (
                        <div key={member.name} className="text-center">
                            <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Users className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-900">{member.name}</h3>
                            <p className="text-sm text-slate-500">{member.role}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-center text-white">
                    <Award className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
                    <p className="text-slate-300 max-w-lg mx-auto mb-8">
                        Help us build the future of document management. We're always looking for talented people to join our team.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link href="/contact">
                            <Button size="lg" className="bg-[#01B0F1] hover:bg-[#0091d4]">
                                Contact Us
                            </Button>
                        </Link>
                        <Link href="/pricing">
                            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                                View Pricing
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
