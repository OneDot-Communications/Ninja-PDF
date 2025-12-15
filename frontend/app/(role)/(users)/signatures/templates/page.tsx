"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Card, CardContent } from "@/app/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function SignatureTemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSignatureTemplates()
            .then(data => setTemplates(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> New Template
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map((t) => (
                    <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
                            <h3 className="font-semibold text-lg">{t.name}</h3>
                            <p className="text-sm text-muted-foreground mt-2">Created {new Date(t.created_at).toLocaleDateString()}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {templates.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                    <p className="text-muted-foreground">You don't have any templates yet.</p>
                    <Button variant="link" className="mt-2 text-primary">Create your first template</Button>
                </div>
            )}
        </div>
    );
}
