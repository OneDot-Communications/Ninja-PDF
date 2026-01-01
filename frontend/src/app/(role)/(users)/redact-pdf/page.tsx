import { ToolShell } from "@/components/layout/tool-shell";
import { RedactPdfTool } from "@/components/tools/redact-pdf";

export const metadata = {
    title: "Redact PDF - 18+ PDF",
    description: "Permanently remove sensitive information from PDF documents. Redact text, images, and graphics with black bars or custom patterns to protect confidential data.",
};

export default function RedactPdfPage() {
    return (
        <ToolShell
            title="Redact PDF"
            description="Permanently remove sensitive information from PDF documents. Redact text, images, and graphics with black bars or custom patterns to protect confidential data."
            variant="editor"
        >
            <RedactPdfTool />
        </ToolShell>
    );
}
