"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import { ComparePdfTool } from "@/components/tools/compare-pdf";

export function ComparePdfClient() {
    // Use editor variant always - ComparePdfTool handles its own title/header for initial state
    return (
        <ToolShell
            title="Compare PDF"
            description="Show a side-by-side document comparison and easily spot changes between different file versions."
            variant="editor"
        >
            <ComparePdfTool />
        </ToolShell>
    );
}
