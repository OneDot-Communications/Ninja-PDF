import { ToolShell } from "@/app/components/layout/tool-shell";
import { RedactPdfTool } from "@/app/components/tools/redact-pdf";

export const metadata = {
    title: "Redact PDF - 18+ PDF",
    description: "Redact text and graphics to permanently remove sensitive information from a PDF.",
};

export default function RedactPdfPage() {
    return (
        <ToolShell
            title="Redact PDF"
            description="Redact text and graphics to permanently remove sensitive information from a PDF."
        >
            <RedactPdfTool />
        </ToolShell>
    );
}
