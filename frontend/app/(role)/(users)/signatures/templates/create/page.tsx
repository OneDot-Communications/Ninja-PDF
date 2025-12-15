"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Loader2, Upload, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CreateTemplatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !file) {
            toast.error("Please provide a name and upload a file.");
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append("name", name);
            formData.append("document", file);
            // Fields can be added later by editor, or passed as empty JSON
            formData.append("fields", JSON.stringify([]));

            await api.createSignatureTemplate(formData);
            toast.success("Template created successfully!");
            router.push("/signatures/templates");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create template.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create Template</h1>
                    <p className="text-muted-foreground">Upload a document to use as a reusable template.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Template Details</CardTitle>
                    <CardDescription>Provide a name and upload your PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Template Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. NDA Template"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="file">Document (PDF)</Label>
                            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                <Input
                                    id="file"
                                    type="file"
                                    accept="application/pdf"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    required
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2 text-blue-600">
                                        <FileText className="w-10 h-10" />
                                        <span className="font-medium">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Upload className="w-10 h-10" />
                                        <span className="font-medium">Click to upload PDF</span>
                                        <span className="text-xs">PDF files only, up to 10MB</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || !file || !name}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Template
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
