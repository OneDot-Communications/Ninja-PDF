import { ToolShell } from "../components/layout/tool-shell";
import { RotatePdfTool } from "../components/tools/rotate-pdf";

export const metadata = {
    title: "Rotate PDF - 18+ PDF",
    description: "Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!",
};

export default function RotatePdfPage() {
    return (
        <ToolShell
            title="Rotate PDF"
            description="Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!"
        >
            <RotatePdfTool />
        </ToolShell>
    );
}
