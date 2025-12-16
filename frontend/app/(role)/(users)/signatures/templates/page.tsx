"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";
import { Card, CardContent } from "@/app/components/ui/card";
import { Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function SignatureTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSignatureTemplates()
            .then(data => setTemplates(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                <Button className="gap-2" onClick={() => router.push('/signatures/templates/create')}>
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
                    <Button variant="link" className="mt-2 text-primary" onClick={() => router.push('/signatures/templates/create')}>
                        Create your first template
                    </Button>
                </div>
            )}
        </div>
    );
}
