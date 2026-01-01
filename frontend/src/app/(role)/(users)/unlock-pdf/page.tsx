import { ToolShell } from "@/components/layout/tool-shell";
import { UnlockPdfTool } from "@/components/tools/unlock-pdf";

export const metadata = {
    title: "Unlock PDF - 18+ PDF",
    description: "Remove password protection from PDF documents instantly. Regain full access to view, print, and edit previously locked PDF files while respecting document ownership rights.",
};

export default function UnlockPdfPage() {
    return (
        <ToolShell
            title="Unlock PDF"
            description="Remove password protection from PDF documents instantly. Regain full access to view, print, and edit previously locked PDF files while respecting document ownership rights."
            variant="editor"
        >
            <UnlockPdfTool />
        </ToolShell>
    );
}
