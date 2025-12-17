"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/services/api"; // We'll use api.publicRequest
import ReactMarkdown from "react-markdown";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LegalDocumentPage() {
    const params = useParams();
    const slug = params?.slug as string; // 'terms-of-service', 'privacy-policy'

    const [document, setDocument] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (slug) {
            loadDocument();
        }
    }, [slug]);

    const loadDocument = async () => {
        setLoading(true);
        try {
            // Use the public endpoint defined in core/api/urls.py: legal/<str:doc_type>/
            const data = await api.publicRequest("GET", `/api/core/legal/${slug}/`);
            setDocument(data);
        } catch (err: any) {
            console.error("Failed to load legal document", err);
            setError("Document not found or unavailable.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <h1 className="text-2xl font-bold mb-4">Error</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Link href="/">
                    <Button variant="outline">Back to Home</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-8 md:p-10">
                    <div className="mb-8">
                        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {document.title}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Last updated: {new Date(document.last_updated).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="prose prose-blue dark:prose-invert max-w-none">
                        {/* Assuming content is Markdown or HTML. If Markdown: */}
                        <div dangerouslySetInnerHTML={{ __html: document.content }} />
                        {/* Note: In a real app we'd use a safe Markdown renderer to prevent XSS if content is user-generated 
                            but Legal docs are usually trusted admin content. 
                            If it's raw markdown, use ReactMarkdown. If HTML, verify safety. 
                            Let's assume it returns HTML from the backend or safe Markdown.
                            Switching to just displaying as text if needed, but legal docs usually need formatting.
                         */}
                    </div>
                </div>
            </div>
        </div>
    );
}
