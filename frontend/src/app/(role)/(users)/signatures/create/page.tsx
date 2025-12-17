"use client";

import { useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Loader2, Upload, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateSignatureRequestPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [message, setMessage] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !recipientEmail) {
            toast.error("Please provide a file and recipient email.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("document", file);
        formData.append("recipient_email", recipientEmail);
        formData.append("recipient_name", recipientName);
        formData.append("message", message);
        formData.append("document_name", file.name);

        try {
            await api.createSignatureRequest(formData);
            toast.success("Signature request sent!");
            router.push("/signatures/sent");
        } catch (error) {
            console.error(error);
            toast.error("Failed to send request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">New Signature Request</h1>
                <p className="text-muted-foreground mt-1">Upload a document and send it for signing.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                    <CardDescription>Enter the recipient information and upload the PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="file">Document (PDF)</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => document.getElementById('file-upload')?.click()}>
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                {file ? (
                                    <span className="text-sm font-medium">{file.name}</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Click to upload PDF</span>
                                )}
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="recipientEmail">Recipient Email</Label>
                                <Input
                                    id="recipientEmail"
                                    type="email"
                                    placeholder="signer@example.com"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                                <Input
                                    id="recipientName"
                                    placeholder="John Doe"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message (Optional)</Label>
                            <Textarea
                                id="message"
                                placeholder="Please sign this document..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                                Send Request
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
