import { ToolShell } from "@/components/layout/tool-shell";
import { CropPdfTool } from "@/components/tools/crop-pdf";

export const metadata = {
    title: "Crop PDF - 18+ PDF",
    description: "Trim unwanted margins and borders from PDF pages. Select custom crop areas, remove white space, and focus on the content that matters most in your documents.",
};

export default function CropPdfPage() {
    return (
        <ToolShell
            title="Crop PDF"
            description="Trim unwanted margins and borders from PDF pages. Select custom crop areas, remove white space, and focus on the content that matters most in your documents."
            variant="editor"
        >
            <CropPdfTool />
        </ToolShell>
    );
}
