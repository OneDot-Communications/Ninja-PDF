import { ToolShell } from "@/components/layout/tool-shell";
import { RedactPdfTool } from "@/components/tools/redact-pdf";

export const metadata = {
    title: "Redact PDF - 18+ PDF",
    description: "Redact text and graphics to permanently remove sensitive information from a PDF.",
};

export default function RedactPdfPage() {
    // Use editor variant for full-width layout when file is loaded
    // The component handles its own title/header for the initial file upload state
    return (
        <ToolShell
            title="Redact PDF"
            description="Redact text and graphics to permanently remove sensitive information from a PDF."
            variant="editor"
        >
            <RedactPdfTool />
        </ToolShell>
    );
}
