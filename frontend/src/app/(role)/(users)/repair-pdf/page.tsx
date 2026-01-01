import { ToolShell } from "@/components/layout/tool-shell";
import { RepairPdfTool } from "@/components/tools/repair-pdf";

export const metadata = {
    title: "Repair PDF - 18+ PDF",
    description: "Fix corrupted or damaged PDF files automatically. Recover text, images, and formatting from broken documents with our advanced PDF repair technology.",
};

export default function RepairPdfPage() {
    return (
        <ToolShell
            title="Repair PDF"
            description="Fix corrupted or damaged PDF files automatically. Recover text, images, and formatting from broken documents with our advanced PDF repair technology."
            variant="editor"
        >
            <RepairPdfTool />
        </ToolShell>
    );
}
