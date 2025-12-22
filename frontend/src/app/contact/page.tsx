"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success("Message sent successfully! We'll get back to you soon.");
        setLoading(false);
        (e.target as HTMLFormElement).reset();
    };

    return (
        <div className="container mx-auto py-16 px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 max-w-5xl mx-auto">
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-4">Get in Touch</h1>
                        <p className="text-muted-foreground">
                            Have questions about our PDF tools? Need support with your subscription?
                            Fill out the form and our team will help you out.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <MapPin className="w-6 h-6 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Visit Us</h3>
                                <p className="text-sm text-muted-foreground">
                                    chn technologies<br />
                                    123 Tech Park<br />
                                    Coimbatore, TN, India - 641001
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Mail className="w-6 h-6 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Email Us</h3>
                                <p className="text-sm text-muted-foreground">support@18pluspdf.com</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Phone className="w-6 h-6 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Call Us</h3>
                                <p className="text-sm text-muted-foreground">+91 123 456 7890</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Send a Message</CardTitle>
                        <CardDescription>
                            We usually respond within 24 hours.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" required placeholder="Your name" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" required placeholder="you@example.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" required placeholder="How can we help?" className="min-h-[120px]" />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Sending..." : "Send Message"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
