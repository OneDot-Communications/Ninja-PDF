import { ToolShell } from "@/app/components/layout/tool-shell";
import { ComparePdfTool } from "@/app/components/tools/compare-pdf";

export const metadata = {
    title: "Compare PDF - 18+ PDF",
    description: "Show a side-by-side document comparison and easily spot changes between different file versions.",
};

export default function ComparePdfPage() {
    return (
        <ToolShell
            title="Compare PDF"
            description="Show a side-by-side document comparison and easily spot changes between different file versions."
        >
            <ComparePdfTool />
        </ToolShell>
    );
}
