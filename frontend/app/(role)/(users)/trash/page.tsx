"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { Trash2 } from "lucide-react";

export default function TrashPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
            <p className="text-muted-foreground">Items in trash will be permanently deleted after 30 days.</p>

            <Card>
                <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Trash2 className="w-12 h-12 mb-4 opacity-20" />
                    <p>Trash is empty.</p>
                </CardContent>
            </Card>
        </div>
    );
}
