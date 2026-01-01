import { ToolShell } from "@/components/layout/tool-shell";
import { RotatePdfTool } from "@/components/tools/rotate-pdf";

export const metadata = {
    title: "Rotate PDF - 18+ PDF",
    description: "Correct PDF page orientation with precision. Rotate individual pages or entire documents by 90°, 180°, or 270° to fix scanning errors and improve readability.",
};

export default function RotatePdfPage() {
    return (
        <ToolShell
            title="Rotate PDF"
            description="Correct PDF page orientation with precision. Rotate individual pages or entire documents by 90°, 180°, or 270° to fix scanning errors and improve readability."
            variant="editor"
        >
            <RotatePdfTool />
        </ToolShell>
    );
}
