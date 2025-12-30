import { ToolShell } from "@/components/layout/tool-shell";
import { CropPdfTool } from "@/components/tools/crop-pdf";

export const metadata = {
    title: "Crop PDF - 18+ PDF",
    description: "Crop margins of PDF documents or select specific areas.",
};

export default function CropPdfPage() {
    return (
        <ToolShell
            title="Crop PDF"
            description="Crop margins of PDF documents or select specific areas."
            variant="editor"
        >
            <CropPdfTool />
        </ToolShell>
    );
}
