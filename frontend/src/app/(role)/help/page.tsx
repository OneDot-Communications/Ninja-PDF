"use client";

import { useState } from "react";
import { Search, Book, MessageCircle, FileQuestion, ChevronDown, ChevronRight, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function HelpCenterPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const categories = [
        {
            icon: Book,
            title: "Getting Started",
            description: "Learn the basics of using 18+ PDF",
            articles: ["How to create an account", "Uploading your first PDF", "Understanding the dashboard"]
        },
        {
            icon: FileQuestion,
            title: "PDF Tools",
            description: "Guides for all our PDF tools",
            articles: ["Merging multiple PDFs", "Splitting documents", "Compressing files", "Converting formats"]
        },
        {
            icon: MessageCircle,
            title: "Account & Billing",
            description: "Manage your subscription and payments",
            articles: ["Upgrade your plan", "Cancel subscription", "Download invoices", "Update payment method"]
        }
    ];

    const faqs = [
        {
            question: "How do I merge multiple PDF files?",
            answer: "To merge PDFs, go to the Merge PDF tool on the homepage. Upload multiple PDF files by dragging them into the upload area or clicking to browse. Arrange them in your desired order, then click 'Merge PDFs'. Your combined file will be ready to download in seconds."
        },
        {
            question: "Is my data secure?",
            answer: "Absolutely. We use 256-bit AES encryption for all files, both in transit and at rest. Files are automatically deleted from our servers within 24 hours. We are GDPR compliant and never access, read, or share your documents."
        },
        {
            question: "What file size limits apply?",
            answer: "Free users can upload files up to 10MB. Pro users enjoy 100MB file limits, and Enterprise users have unlimited file sizes. For very large files, we recommend our desktop app for the best experience."
        },
        {
            question: "Can I use 18+ PDF on mobile?",
            answer: "Yes! Our website is fully responsive and works great on mobile browsers. We're also developing native iOS and Android apps for an even better mobile experience."
        },
        {
            question: "How do I cancel my subscription?",
            answer: "Go to Profile → Billing → Manage Subscription. Click 'Cancel Subscription' and follow the prompts. You'll retain access until the end of your current billing period. No questions asked, no hidden fees."
        },
        {
            question: "Do you offer refunds?",
            answer: "Yes, we offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team within 7 days of your purchase for a full refund."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                    How Can We Help?
                </h1>
                <p className="text-xl text-slate-600 max-w-xl mx-auto mb-8">
                    Find answers to common questions or get in touch with our support team.
                </p>
                <div className="max-w-xl mx-auto relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search for help articles..."
                        className="pl-12 h-14 text-lg border-slate-200 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </section>

            {/* Categories */}
            <section className="container mx-auto px-4 py-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Browse by Category</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {categories.map((category) => (
                        <Card key={category.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardHeader>
                                <div className="w-12 h-12 bg-[#4383BF]/10 text-[#4383BF] rounded-xl flex items-center justify-center mb-4">
                                    <category.icon className="w-6 h-6" />
                                </div>
                                <CardTitle>{category.title}</CardTitle>
                                <p className="text-slate-500 text-sm">{category.description}</p>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {category.articles.map((article) => (
                                        <li key={article}>
                                            <Link href="#" className="text-sm text-slate-600 hover:text-[#4383BF] flex items-center gap-2">
                                                <ChevronRight className="w-4 h-4" />
                                                {article}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* FAQ Section */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                        >
                            <button
                                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                            >
                                <span className="font-medium text-slate-900">{faq.question}</span>
                                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedFaq === index && (
                                <div className="px-5 pb-5 text-slate-600">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-center text-white">
                    <Mail className="w-12 h-12 text-[#4383BF] mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
                    <p className="text-slate-300 max-w-lg mx-auto mb-8">
                        Our support team is here to help. Reach out and we'll get back to you within 24 hours.
                    </p>
                    <div className="flex justify-center gap-4">
                        <a href="mailto:support@ninjapdf.com">
                            <Button size="lg" className="bg-[#4383BF] hover:bg-[#3470A0] gap-2">
                                <Mail className="w-4 h-4" />
                                Email Support
                            </Button>
                        </a>
                        <Link href="/contact">
                            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Contact Form
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
