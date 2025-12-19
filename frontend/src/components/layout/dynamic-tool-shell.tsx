"use client";

import { useTools } from "@/lib/hooks/useTools";
import { ToolShell } from "./tool-shell";
import { Loader2 } from "lucide-react";

interface DynamicToolShellProps {
    toolCode: string;
    children: React.ReactNode;
    defaultTitle: string;
    defaultDescription: string;
}

export function DynamicToolShell({
    toolCode,
    children,
    defaultTitle,
    defaultDescription
}: DynamicToolShellProps) {
    const { tools, loading } = useTools();

    // Try to find the tool from backend data
    // Matching by 'href' slug or 'title' might be fragile if names change. 
    // Ideally we should match by a stable code. backend Tool/Feature model has 'code' field?
    // Let's assume title match or normalized slug match for now, or just use what we have.
    // The useTools hook returns tools with 'title', 'description', 'href'.

    // Attempt to match by href slug based on toolCode (e.g. toolCode='MERGE_PDF' -> href='/merge-pdf')
    // Or just simple title match if toolCode is 'Merge PDF'

    const tool = tools.find(t =>
        t.title.toLowerCase() === defaultTitle.toLowerCase() ||
        t.href.includes(toolCode.toLowerCase().replace('_', '-'))
    );

    const title = tool?.title || defaultTitle;
    const description = tool?.description || defaultDescription;

    // We don't block render on loading, just use defaults until loaded to avoid flickering
    // Or we could show loading state if strictly required. User prefers "from db".
    // Let's use defaults as initial state (SSR friendly structure) and hydration updates it.

    return (
        <ToolShell
            title={title}
            description={description}
        >
            {children}
        </ToolShell>
    );
}
