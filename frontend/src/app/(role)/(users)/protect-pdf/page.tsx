import { ToolShell } from "@/components/layout/tool-shell";
import { ProtectPdfTool } from "@/components/tools/protect-pdf";

export const metadata = {
    title: "Protect PDF - 18+ PDF",
    description: "Secure your PDF documents with strong password protection and encryption. Prevent unauthorized viewing, printing, or editing while maintaining full control over document access.",
};

export default function ProtectPdfPage() {
    return (
        <ToolShell
            title="Protect PDF"
            description="Secure your PDF documents with strong password protection and encryption. Prevent unauthorized viewing, printing, or editing while maintaining full control over document access."
            variant="editor"
        >
            <ProtectPdfTool />
        </ToolShell>
    );
}
