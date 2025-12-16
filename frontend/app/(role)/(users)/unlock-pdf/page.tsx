import { ToolShell } from "@/app/components/layout/tool-shell";
import { UnlockPdfTool } from "@/app/components/tools/unlock-pdf";

export const metadata = {
    title: "Unlock PDF - 18+ PDF",
    description: "Remove PDF password security, giving you the freedom to use your PDFs as you want.",
};

export default function UnlockPdfPage() {
    return (
        <ToolShell
            title="Unlock PDF"
            description="Remove PDF password security, giving you the freedom to use your PDFs as you want."
        >
            <UnlockPdfTool />
        </ToolShell>
    );
}
