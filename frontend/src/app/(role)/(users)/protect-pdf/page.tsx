import { ToolShell } from "@/components/layout/tool-shell";
import { ProtectPdfTool } from "@/components/tools/protect-pdf";

export const metadata = {
    title: "Protect PDF - 18+ PDF",
    description: "Protect PDF files with a password. Encrypt PDF documents to prevent unauthorized access.",
};

export default function ProtectPdfPage() {
    return (
        <ToolShell
            title="Protect PDF"
            description="Protect PDF files with a password. Encrypt PDF documents to prevent unauthorized access."
        >
            <ProtectPdfTool />
        </ToolShell>
    );
}
