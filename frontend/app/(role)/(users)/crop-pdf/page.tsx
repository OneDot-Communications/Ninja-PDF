import { ToolShell } from "@/app/components/layout/tool-shell";
import { CropPdfTool } from "@/app/components/tools/crop-pdf";

export const metadata = {
    title: "Crop PDF - 18+ PDF",
    description: "Crop margins of PDF documents or select specific areas.",
};

export default function CropPdfPage() {
    return (
        <ToolShell
            title="Crop PDF"
            description="Crop margins of PDF documents or select specific areas."
        >
            <CropPdfTool />
        </ToolShell>
    );
}
