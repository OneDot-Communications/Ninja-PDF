import { ToolShell } from "@/components/layout/tool-shell";
import { SplitPdfTool } from "@/components/tools/split-pdf";

export const metadata = {
    title: "Split PDF - 18+ PDF",
    description: "Extract specific pages or divide large PDF documents into smaller, more manageable files. Choose exact page ranges, split by individual pages, or create custom sections with precision.",
};

export default function SplitPdfPage() {
    return (
        <ToolShell
            title="Split PDF"
            description="Extract specific pages or divide large PDF documents into smaller, more manageable files. Choose exact page ranges, split by individual pages, or create custom sections with precision."
            variant="editor"
        >
            <SplitPdfTool />
        </ToolShell>
    );
}
