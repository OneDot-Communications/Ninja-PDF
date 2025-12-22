import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Globe } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="container mx-auto py-16 px-4 md:px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">About 18+ PDF</h1>
                    <p className="text-xl text-muted-foreground">
                        We are dedicated to making PDF tools accessible, secure, and easy to use for everyone.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="text-center">
                            <Shield className="w-12 h-12 mx-auto text-primary mb-2" />
                            <CardTitle>Secure</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-sm text-muted-foreground">
                            Your files are processed securely with enterprise-grade encryption and automatically deleted.
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="text-center">
                            <Users className="w-12 h-12 mx-auto text-primary mb-2" />
                            <CardTitle>User Focused</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-sm text-muted-foreground">
                            Built with simplicity in mind, our tools are designed to streamline your document workflows.
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="text-center">
                            <Globe className="w-12 h-12 mx-auto text-primary mb-2" />
                            <CardTitle>Global</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-sm text-muted-foreground">
                            Serving users worldwide with multi-language support and fast global content delivery.
                        </CardContent>
                    </Card>
                </div>

                <div className="prose dark:prose-invert mx-auto">
                    <h2>Our Mission</h2>
                    <p>
                        At 18+ PDF, our mission is to simplify document management. Whether you're a student, professional, or
                        business owner, we provide the tools you need to handle PDFs efficiently. From compression to conversion,
                        merging to signing, we've got you covered.
                    </p>
                    <p>
                        We believe in privacy and security first. That's why we don't store your files longer than necessary
                        and ensure all data transfers are encrypted.
                    </p>
                </div>
            </div>
        </div>
    );
}
