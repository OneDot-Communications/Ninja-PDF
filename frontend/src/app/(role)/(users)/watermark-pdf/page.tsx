import { ToolShell } from "@/components/layout/tool-shell";
import { WatermarkPdfTool } from "@/components/tools/watermark-pdf";

export const metadata = {
    title: "Watermark PDF - 18+ PDF",
    description: "Add professional watermarks to protect your PDF documents. Choose from text or image watermarks with customizable opacity, position, size, and rotation for brand protection.",
};

export default function WatermarkPdfPage() {
    return (
        <ToolShell
            title="Watermark PDF"
            description="Add professional watermarks to protect your PDF documents. Choose from text or image watermarks with customizable opacity, position, size, and rotation for brand protection."
            variant="editor"
        >
            <WatermarkPdfTool />
        </ToolShell>
    );
}
