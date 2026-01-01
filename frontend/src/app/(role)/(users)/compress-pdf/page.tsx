import { ToolShell } from "@/components/layout/tool-shell";
import { CompressPdfTool } from "@/components/tools/compress-pdf";

export const metadata = {
    title: "Compress PDF - 18+ PDF",
    description: "Significantly reduce PDF file sizes without compromising quality. Our advanced compression algorithms optimize images, fonts, and document structure for faster sharing and storage.",
};

export default function CompressPdfPage() {
    return (
        <ToolShell
            title="Compress PDF"
            description="Significantly reduce PDF file sizes without compromising quality. Our advanced compression algorithms optimize images, fonts, and document structure for faster sharing and storage."
            variant="editor"
        >
            <CompressPdfTool />
        </ToolShell>
    );
}
