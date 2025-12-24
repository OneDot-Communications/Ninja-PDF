"use client";

import { useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { ComparePdfTool } from "@/components/tools/compare-pdf";

export function ComparePdfClient() {
    const [mode, setMode] = useState<'default' | 'editor'>('default');

    return (
        <ToolShell
            title="Compare PDF"
            description="Show a side-by-side document comparison and easily spot changes between different file versions."
            variant={mode}
        >
            <ComparePdfTool onModeChange={setMode} />
        </ToolShell>
    );
}
