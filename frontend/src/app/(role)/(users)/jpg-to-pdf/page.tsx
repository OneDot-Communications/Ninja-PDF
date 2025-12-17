import { ToolShell } from "@/app/components/layout/tool-shell";
import { JpgToPdfTool } from "@/app/components/tools/jpg-to-pdf";

export const metadata = {
    title: "JPG to PDF - 18+ PDF",
    description: "Convert JPG images to PDF in seconds. Easily adjust orientation and margins.",
};

export default function JpgToPdfPage() {
    return (
        <ToolShell
            title="JPG to PDF"
            description="Convert JPG images to PDF in seconds. Easily adjust orientation and margins."
        >
            <JpgToPdfTool />
        </ToolShell>
    );
}
