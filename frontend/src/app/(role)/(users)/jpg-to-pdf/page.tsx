import { ToolShell } from "@/components/layout/tool-shell";
import { JpgToPdfTool } from "@/components/tools/jpg-to-pdf";

export const metadata = {
    title: "JPG to PDF - 18+ PDF",
    description: "Convert JPG images to PDF in seconds. Easily adjust orientation and margins.",
};

export default function JpgToPdfPage() {
    return (
        <ToolShell
            title="JPG to PDF"
            description="Convert JPG images to PDF in seconds. Easily adjust orientation and margins."
            variant="editor"
        >
            <JpgToPdfTool />
        </ToolShell>
    );
}
